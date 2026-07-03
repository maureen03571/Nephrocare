const express = require('express');
const cors = require('cors');
const { v4: uuidv4 } = require('uuid');
require('dotenv').config();
const { GoogleGenAI } = require('@google/genai');
const { loadDataStore, saveDataStore } = require('./lib/dataStore');
const {
  validateAuthRegister,
  validateSymptomPayload,
  validateMedicationPayload,
  validateWeightPayload
} = require('./lib/validators');

const app = express();
app.use(cors());
app.use(express.json());

// ─── Async dataStore cache ────────────────────────────────────────────────────
// On Vercel each serverless invocation may be a cold start, so we keep a
// module-level cache that is populated on first request and reused within the
// same invocation. The cache is invalidated (nulled) after every save so the
// next read always reflects what's in Firestore.

let _cache = null;

const getDataStore = async () => {
  if (!_cache) {
    _cache = await loadDataStore();
  }
  return _cache;
};

const saveData = async (data) => {
  await saveDataStore(data);
  _cache = data; // keep cache in sync
};

// ─── Pure helper functions (synchronous, operate on a passed-in store) ────────

const toNumber = (value) => {
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
};

const getLatestWeightDelta = (weights = []) => {
  const sorted = [...weights].sort((a, b) => new Date(b.date) - new Date(a.date));
  if (sorted.length < 2) return null;
  const current = toNumber(sorted[0]?.value);
  const previous = toNumber(sorted[1]?.value);
  if (current === null || previous === null) return null;
  return Number((current - previous).toFixed(1));
};

const calculateHealthScore = ({ symptoms, meds, weights }) => {
  const highSeverityCount = symptoms.filter(s => s.severity === 'High').length;
  const hasDailyMeds = meds.length > 0;
  const hasRecentWeight = weights.length > 0;

  let score = 55;
  if (hasDailyMeds) score += 20;
  if (hasRecentWeight) score += 15;
  score -= Math.min(25, highSeverityCount * 8);

  return Math.max(0, Math.min(100, score));
};

const getTodayKey = () => new Date().toISOString().slice(0, 10);

const getPatientDashboard = (ds, patientId) => {
  const profile    = ds.profiles[patientId]    || {};
  const onboarding = ds.onboarding[patientId]  || null;
  const symptoms   = ds.symptoms[patientId]    || [];
  const meds       = ds.medications[patientId] || [];
  const weights    = ds.weights[patientId]     || [];
  const alerts     = ds.alerts[patientId]      || [];
  const fluidLogs  = ds.fluidIntake[patientId] || [];

  const healthScore  = calculateHealthScore({ symptoms, meds, weights });
  const weightDelta  = getLatestWeightDelta(weights);
  const activeAlerts = alerts.filter(a => a.status !== 'resolved').slice(-5).reverse();
  const streakDays   = (ds.streaks[patientId] && ds.streaks[patientId].medicationDays) || 0;
  const todayKey     = getTodayKey();
  const todayFluidMl = fluidLogs
    .filter(f => String(f.date || '').slice(0, 10) === todayKey)
    .reduce((sum, f) => sum + (Number(f.amountMl) || 0), 0);

  ds.healthScores[patientId] = {
    value: healthScore,
    generatedAt: new Date().toISOString()
  };

  return {
    profile,
    onboarding,
    healthScore: ds.healthScores[patientId],
    streaks: { medicationDays: streakDays },
    quickStats: {
      weightDelta,
      symptomsLogged:      symptoms.length,
      medicationsTracked:  meds.length,
      fluidTodayMl:        todayFluidMl
    },
    alerts: activeAlerts
  };
};

const appendAlert = (ds, { patientId, type, severity, message, metadata = {} }) => {
  if (!ds.alerts[patientId]) ds.alerts[patientId] = [];
  ds.alerts[patientId].push({
    id:        uuidv4(),
    type,
    severity,
    message,
    metadata,
    status:    'active',
    createdAt: new Date().toISOString()
  });
};

const isSameUtcDay = (a, b) => {
  const da = new Date(a);
  const db = new Date(b);
  return da.getUTCFullYear() === db.getUTCFullYear() &&
    da.getUTCMonth()  === db.getUTCMonth()  &&
    da.getUTCDate()   === db.getUTCDate();
};

const updateMedicationStreak = (ds, patientId, loggedAt) => {
  if (!ds.streaks[patientId]) {
    ds.streaks[patientId] = { medicationDays: 0, lastMedicationLogDate: null };
  }

  const streak = ds.streaks[patientId];
  if (!streak.lastMedicationLogDate) {
    streak.medicationDays = 1;
    streak.lastMedicationLogDate = loggedAt;
    return;
  }

  if (isSameUtcDay(streak.lastMedicationLogDate, loggedAt)) return;

  const previousDate = new Date(streak.lastMedicationLogDate);
  const currentDate  = new Date(loggedAt);
  const diffDays     = Math.floor((
    Date.UTC(currentDate.getUTCFullYear(), currentDate.getUTCMonth(), currentDate.getUTCDate()) -
    Date.UTC(previousDate.getUTCFullYear(), previousDate.getUTCMonth(), previousDate.getUTCDate())
  ) / 86400000);

  streak.medicationDays = diffDays === 1 ? streak.medicationDays + 1 : 1;
  streak.lastMedicationLogDate = loggedAt;
};

const priorityActionCatalog = {
  hydration:  { title: 'Drink Water (1L target)',   metricLabel: 'Hydration target'     },
  medication: { title: 'Lisinopril 10mg',           metricLabel: 'Medication taken'     },
  weight:     { title: 'Log morning weight',         metricLabel: 'Weight logged'        },
  dialysis:   { title: 'Dialysis session prep',      metricLabel: 'Dialysis prep started' }
};

const getDailyActionBucket = (ds, patientId, dayKey = getTodayKey()) => {
  if (!ds.dailyActions[patientId]) ds.dailyActions[patientId] = {};
  if (!ds.dailyActions[patientId][dayKey]) {
    ds.dailyActions[patientId][dayKey] = {
      completed:  {},
      history:    [],
      updatedAt:  new Date().toISOString()
    };
  }
  return ds.dailyActions[patientId][dayKey];
};

// ─── Routes ───────────────────────────────────────────────────────────────────

// Users
app.get('/api/users/doctors', async (req, res) => {
  try {
    const ds = await getDataStore();
    const doctors = ds.users.filter(u => u.role === 'doctor');
    res.json({ success: true, doctors: doctors.map(d => ({ id: d.id, name: d.name, email: d.email })) });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
});

app.get('/api/users/patients', async (req, res) => {
  try {
    const ds = await getDataStore();
    const patients = ds.users.filter(u => u.role === 'patient').map(p => ({
      id:         p.id,
      name:       p.name,
      email:      p.email,
      profile:    ds.profiles[p.id]    || {},
      meds:       ds.medications[p.id] || [],
      symptoms:   ds.symptoms[p.id]    || [],
      onboarding: ds.onboarding[p.id]  || {},
      dashboard:  getPatientDashboard(ds, p.id)
    }));
    res.json({ success: true, patients });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
});

app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const ds   = await getDataStore();
    const user = ds.users.find(u => u.email === email && u.password === password);
    if (user) {
      res.json({ success: true, user: { id: user.id, email: user.email, role: user.role, name: user.name } });
    } else {
      res.status(401).json({ success: false, message: 'Invalid credentials' });
    }
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
});

app.post('/api/auth/register', async (req, res) => {
  try {
    const { email, password, name, role } = req.body;
    const validationError = validateAuthRegister({ email, password, name, role });
    if (validationError) return res.status(400).json({ success: false, message: validationError });

    const ds = await getDataStore();
    if (ds.users.find(u => u.email === email)) {
      return res.status(400).json({ success: false, message: 'Email already exists' });
    }
    const newUser = { id: uuidv4(), email, password, name, role };
    ds.users.push(newUser);
    await saveData(ds);
    res.json({ success: true, user: { id: newUser.id, email: newUser.email, role: newUser.role, name: newUser.name } });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
});

app.post('/api/auth/verify', async (req, res) => {
  try {
    const { userId, password } = req.body;
    if (!userId || !password) {
      return res.status(400).json({ success: false, message: 'userId and password are required' });
    }
    const ds   = await getDataStore();
    const user = ds.users.find(u => u.id === userId && u.password === password);
    if (user) {
      res.json({ success: true, message: 'Password verified' });
    } else {
      res.status(401).json({ success: false, message: 'Incorrect password' });
    }
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
});

// Google Sign-In sync — registers or updates a Google user in Firestore
app.post('/api/auth/google-sync', async (req, res) => {
  try {
    const { uid, email, name, role } = req.body;
    if (!uid || !email) {
      return res.status(400).json({ success: false, message: 'uid and email are required' });
    }

    const ds = await getDataStore();
    let user = ds.users.find(u => u.googleUid === uid || u.email === email);
    if (!user) {
      user = {
        id:        uid,
        googleUid: uid,
        email,
        name:      name || email.split('@')[0],
        role:      role || 'patient',
        isGoogle:  true
      };
      ds.users.push(user);
      await saveData(ds);
    } else if (!user.googleUid) {
      // Link existing email account to Google
      user.googleUid = uid;
      user.isGoogle  = true;
      if (name && !user.name) user.name = name;
      await saveData(ds);
    }
    res.json({ success: true, user: { id: user.id, email: user.email, role: user.role, name: user.name } });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
});

// Caregiver-Patient Linking
app.get('/api/patient/:id/link-code', async (req, res) => {
  try {
    const ds   = await getDataStore();
    const user = ds.users.find(u => u.id === req.params.id);
    if (!user || user.role !== 'patient') {
      return res.status(404).json({ success: false, message: 'Patient not found' });
    }
    if (!user.linkCode) {
      user.linkCode = Math.random().toString(36).substring(2, 8).toUpperCase();
      await saveData(ds);
    }
    res.json({ success: true, linkCode: user.linkCode });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
});

app.post('/api/caregiver/link-patient', async (req, res) => {
  try {
    const { caregiverId, linkCode } = req.body;
    const ds        = await getDataStore();
    const caregiver = ds.users.find(u => u.id === caregiverId && u.role === 'caregiver');
    if (!caregiver) return res.status(404).json({ success: false, message: 'Caregiver not found' });

    const patient = ds.users.find(u => u.role === 'patient' && u.linkCode === linkCode);
    if (!patient)  return res.status(404).json({ success: false, message: 'Invalid link code' });

    caregiver.patientId = patient.id;
    await saveData(ds);
    res.json({ success: true, patientName: patient.name });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
});

app.get('/api/caregiver/:id/patient', async (req, res) => {
  try {
    const ds        = await getDataStore();
    const caregiver = ds.users.find(u => u.id === req.params.id);
    if (!caregiver || !caregiver.patientId) {
      return res.status(404).json({ success: false, message: 'No patient linked' });
    }
    const patient   = ds.users.find(u => u.id === caregiver.patientId);
    const dashboard = getPatientDashboard(ds, patient.id);
    res.json({ success: true, patient: { id: patient.id, name: patient.name, email: patient.email, ...dashboard } });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
});

app.get('/api/patient/:id/onboarding', async (req, res) => {
  try {
    const ds = await getDataStore();
    res.json({ success: true, onboarding: ds.onboarding[req.params.id] || null });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
});

app.put('/api/patient/:id/onboarding', async (req, res) => {
  try {
    const { ckdStage, baselineLabs, medicationList, quiz } = req.body || {};
    if (!ckdStage) {
      return res.status(400).json({ success: false, message: 'ckdStage is required' });
    }
    const ds = await getDataStore();
    ds.onboarding[req.params.id] = {
      ckdStage,
      baselineLabs:   baselineLabs || {},
      medicationList: Array.isArray(medicationList) ? medicationList : [],
      quiz:           quiz || {},
      updatedAt:      new Date().toISOString()
    };
    await saveData(ds);
    res.json({ success: true, onboarding: ds.onboarding[req.params.id] });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
});

app.get('/api/patient/:id/dashboard', async (req, res) => {
  try {
    const ds        = await getDataStore();
    const dashboard = getPatientDashboard(ds, req.params.id);
    await saveData(ds); // persist updated healthScores
    res.json({ success: true, dashboard });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
});

app.get('/api/patient/:id/daily-actions', async (req, res) => {
  try {
    const ds     = await getDataStore();
    const dayKey = req.query.date || getTodayKey();
    const bucket = getDailyActionBucket(ds, req.params.id, dayKey);
    const totalActions    = Object.keys(priorityActionCatalog).length;
    const completedCount  = Object.values(bucket.completed).filter(Boolean).length;
    const progressPercent = Math.round((completedCount / totalActions) * 100);
    res.json({
      success: true,
      date:    dayKey,
      progress: { completedCount, totalActions, progressPercent },
      completed: bucket.completed,
      history:   [...bucket.history].reverse()
    });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
});

app.post('/api/patient/:id/daily-actions/complete', async (req, res) => {
  try {
    const actionType  = String(req.body?.actionType || '').trim();
    const dayKey      = req.body?.date || getTodayKey();
    const catalogItem = priorityActionCatalog[actionType];

    if (!catalogItem) {
      return res.status(400).json({ success: false, message: 'Invalid actionType' });
    }

    const ds     = await getDataStore();
    const bucket = getDailyActionBucket(ds, req.params.id, dayKey);

    if (!bucket.completed[actionType]) {
      bucket.history.push({
        id:          uuidv4(),
        actionType,
        title:       catalogItem.title,
        metricLabel: catalogItem.metricLabel,
        completedAt: new Date().toISOString()
      });
    }
    bucket.completed[actionType] = true;
    bucket.updatedAt = new Date().toISOString();
    await saveData(ds);

    const totalActions    = Object.keys(priorityActionCatalog).length;
    const completedCount  = Object.values(bucket.completed).filter(Boolean).length;
    const progressPercent = Math.round((completedCount / totalActions) * 100);
    res.json({
      success: true,
      date:    dayKey,
      progress: { completedCount, totalActions, progressPercent },
      completed: bucket.completed,
      history:   [...bucket.history].reverse()
    });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
});

app.get('/api/patient/:id/alerts', async (req, res) => {
  try {
    const ds = await getDataStore();
    res.json({ success: true, alerts: (ds.alerts[req.params.id] || []).slice().reverse() });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
});

app.put('/api/patient/:id/alerts/:alertId/resolve', async (req, res) => {
  try {
    const { id, alertId } = req.params;
    const ds     = await getDataStore();
    const alerts = ds.alerts[id] || [];
    const alert  = alerts.find(a => a.id === alertId);
    if (!alert) return res.status(404).json({ success: false, message: 'Alert not found' });

    alert.status     = 'resolved';
    alert.resolvedAt = new Date().toISOString();
    await saveData(ds);
    res.json({ success: true, alert });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
});

// Profile endpoints
app.get('/api/patient/:id/profile', async (req, res) => {
  try {
    const ds = await getDataStore();
    res.json({ success: true, profile: ds.profiles[req.params.id] || null });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
});

app.put('/api/patient/:id/profile', async (req, res) => {
  try {
    if (!req.body || typeof req.body !== 'object') {
      return res.status(400).json({ success: false, message: 'Profile payload is required' });
    }
    const ds = await getDataStore();
    ds.profiles[req.params.id] = { ...ds.profiles[req.params.id], ...req.body };
    await saveData(ds);
    res.json({ success: true, profile: ds.profiles[req.params.id] });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
});

// Symptoms endpoints
app.get('/api/patient/:id/symptoms', async (req, res) => {
  try {
    const ds = await getDataStore();
    res.json({ success: true, symptoms: ds.symptoms[req.params.id] || [] });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
});

app.post('/api/patient/:id/symptoms', async (req, res) => {
  try {
    const validationError = validateSymptomPayload(req.body || {});
    if (validationError) return res.status(400).json({ success: false, message: validationError });

    const ds = await getDataStore();
    if (!ds.symptoms[req.params.id]) ds.symptoms[req.params.id] = [];
    const newSymptom = { id: uuidv4(), ...req.body, date: new Date().toISOString() };
    ds.symptoms[req.params.id].push(newSymptom);

    if (newSymptom.severity === 'High') {
      appendAlert(ds, {
        patientId: req.params.id,
        type:      'symptom',
        severity:  'high',
        message:   `High-severity symptom logged: ${newSymptom.type || 'Unknown symptom'}`,
        metadata:  { symptomId: newSymptom.id }
      });
    }

    const recentSwellingCount = (ds.symptoms[req.params.id] || []).filter(s => {
      if (!s.type || !String(s.type).toLowerCase().includes('swelling')) return false;
      const symptomDate  = new Date(s.date);
      const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000);
      return symptomDate >= threeDaysAgo;
    }).length;

    if (recentSwellingCount >= 3) {
      appendAlert(ds, {
        patientId: req.params.id,
        type:      'pattern',
        severity:  'medium',
        message:   'Swelling has been reported 3+ times this week. Follow up with your doctor.',
        metadata:  { trigger: 'swelling_pattern' }
      });
    }

    await saveData(ds);
    res.json({ success: true, symptom: newSymptom });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
});

// Medications
app.get('/api/patient/:id/medications', async (req, res) => {
  try {
    const ds = await getDataStore();
    res.json({ success: true, medications: ds.medications[req.params.id] || [] });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
});

app.post('/api/patient/:id/medications', async (req, res) => {
  try {
    const validationError = validateMedicationPayload(req.body || {});
    if (validationError) return res.status(400).json({ success: false, message: validationError });

    const ds = await getDataStore();
    if (!ds.medications[req.params.id]) ds.medications[req.params.id] = [];
    const newMed = { id: uuidv4(), ...req.body, date: new Date().toISOString() };
    ds.medications[req.params.id].push(newMed);
    updateMedicationStreak(ds, req.params.id, newMed.date);

    const sideEffect = String(req.body?.sideEffect || '').toLowerCase();
    if (sideEffect && ['swelling', 'rash', 'dizziness', 'nausea'].includes(sideEffect)) {
      appendAlert(ds, {
        patientId: req.params.id,
        type:      'medication-side-effect',
        severity:  sideEffect === 'swelling' || sideEffect === 'rash' ? 'high' : 'medium',
        message:   `Potential medication side effect reported: ${req.body.sideEffect}`,
        metadata:  { medicationId: newMed.id, sideEffect: req.body.sideEffect }
      });
    }

    await saveData(ds);
    res.json({ success: true, medication: newMed });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
});

// Weight
app.get('/api/patient/:id/weight', async (req, res) => {
  try {
    const ds = await getDataStore();
    res.json({ success: true, weights: ds.weights[req.params.id] || [] });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
});

app.post('/api/patient/:id/weight', async (req, res) => {
  try {
    const validationError = validateWeightPayload(req.body || {});
    if (validationError) return res.status(400).json({ success: false, message: validationError });

    const ds = await getDataStore();
    if (!ds.weights[req.params.id]) ds.weights[req.params.id] = [];
    const newWeight = { id: uuidv4(), ...req.body, date: new Date().toISOString() };
    ds.weights[req.params.id].push(newWeight);
    await saveData(ds);
    res.json({ success: true, weight: newWeight });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
});

app.get('/api/patient/:id/blood-pressure', async (req, res) => {
  try {
    const ds = await getDataStore();
    res.json({ success: true, bloodPressures: ds.bloodPressures[req.params.id] || [] });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
});

app.post('/api/patient/:id/blood-pressure', async (req, res) => {
  try {
    const systolic  = Number(req.body?.systolic);
    const diastolic = Number(req.body?.diastolic);
    if (!Number.isFinite(systolic) || !Number.isFinite(diastolic)) {
      return res.status(400).json({ success: false, message: 'systolic and diastolic are required numbers' });
    }
    const ds = await getDataStore();
    if (!ds.bloodPressures[req.params.id]) ds.bloodPressures[req.params.id] = [];
    const bp = { id: uuidv4(), systolic, diastolic, pulse: Number(req.body?.pulse) || null, date: new Date().toISOString() };
    ds.bloodPressures[req.params.id].push(bp);
    await saveData(ds);
    res.json({ success: true, bloodPressure: bp });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
});

app.get('/api/patient/:id/fluid-intake', async (req, res) => {
  try {
    const ds = await getDataStore();
    res.json({ success: true, fluidLogs: ds.fluidIntake[req.params.id] || [] });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
});

app.post('/api/patient/:id/fluid-intake', async (req, res) => {
  try {
    const amountMl = Number(req.body?.amountMl);
    if (!Number.isFinite(amountMl) || amountMl <= 0) {
      return res.status(400).json({ success: false, message: 'amountMl must be a positive number' });
    }
    const ds = await getDataStore();
    if (!ds.fluidIntake[req.params.id]) ds.fluidIntake[req.params.id] = [];
    const fluid = { id: uuidv4(), amountMl, source: req.body?.source || 'manual', date: new Date().toISOString() };
    ds.fluidIntake[req.params.id].push(fluid);
    await saveData(ds);
    res.json({ success: true, fluid });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
});

app.get('/api/patient/:id/labs', async (req, res) => {
  try {
    const ds   = await getDataStore();
    const labs = ds.labResults[req.params.id] || [];
    res.json({ success: true, labs: [...labs].sort((a, b) => new Date(b.date) - new Date(a.date)) });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
});

app.post('/api/patient/:id/labs', async (req, res) => {
  try {
    const gfr        = Number(req.body?.gfr);
    const creatinine = Number(req.body?.creatinine);
    const potassium  = Number(req.body?.potassium);
    const phosphorus = Number(req.body?.phosphorus);
    const reportName = String(req.body?.reportName || '').trim() || null;

    if (![gfr, creatinine].every(Number.isFinite)) {
      return res.status(400).json({ success: false, message: 'gfr and creatinine are required numbers' });
    }
    const ds = await getDataStore();
    if (!ds.labResults[req.params.id]) ds.labResults[req.params.id] = [];
    const lab = {
      id:         uuidv4(),
      gfr,
      creatinine,
      potassium:  Number.isFinite(potassium)  ? potassium  : null,
      phosphorus: Number.isFinite(phosphorus) ? phosphorus : null,
      reportName,
      date:       new Date().toISOString()
    };
    ds.labResults[req.params.id].push(lab);
    await saveData(ds);
    res.json({ success: true, lab });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
});

// Appointments
app.get('/api/patient/:id/appointments', async (req, res) => {
  try {
    const ds = await getDataStore();
    res.json({ success: true, appointments: ds.appointments[req.params.id] || [] });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
});

app.post('/api/patient/:id/appointments', async (req, res) => {
  try {
    const { title, date, doctorName, notes } = req.body || {};
    if (!title || !date) {
      return res.status(400).json({ success: false, message: 'title and date are required' });
    }
    const ds = await getDataStore();
    if (!ds.appointments[req.params.id]) ds.appointments[req.params.id] = [];
    const appt = { id: uuidv4(), title, date, doctorName: doctorName || '', notes: notes || '', createdAt: new Date().toISOString() };
    ds.appointments[req.params.id].push(appt);
    await saveData(ds);
    res.json({ success: true, appointment: appt });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
});

// Doctor Notes
app.get('/api/patient/:id/notes', async (req, res) => {
  try {
    const ds = await getDataStore();
    res.json({ success: true, notes: ds.doctorNotes[req.params.id] || [] });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
});

app.post('/api/patient/:id/notes', async (req, res) => {
  try {
    const { doctorId, doctorName, content } = req.body || {};
    if (!content || !String(content).trim()) {
      return res.status(400).json({ success: false, message: 'content is required' });
    }
    const ds = await getDataStore();
    if (!ds.doctorNotes[req.params.id]) ds.doctorNotes[req.params.id] = [];
    const note = {
      id:         uuidv4(),
      doctorId:   doctorId   || '',
      doctorName: doctorName || 'Doctor',
      content:    String(content).trim(),
      createdAt:  new Date().toISOString()
    };
    ds.doctorNotes[req.params.id].push(note);
    await saveData(ds);
    res.json({ success: true, note });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
});

// Community / Socials
app.get('/api/community/messages', async (req, res) => {
  try {
    const ds = await getDataStore();
    if (!Array.isArray(ds.communityMessages) || ds.communityMessages.length === 0) {
      ds.communityMessages = [
        { id: uuidv4(), senderName: 'RenAmi Guide', senderId: 'system', topic: 'Tips for staying hydrated',       content: 'What helps you stay within your daily fluid target without feeling too thirsty?', type: 'thread', timestamp: new Date().toISOString() },
        { id: uuidv4(), senderName: 'RenAmi Guide', senderId: 'system', topic: 'Best low-potassium snacks',       content: 'Share your favorite low-potassium snack ideas that are easy to prepare.',          type: 'thread', timestamp: new Date().toISOString() },
        { id: uuidv4(), senderName: 'RenAmi Guide', senderId: 'system', topic: 'How do you remember medications?', content: 'What reminder routine works best for your medication schedule?',                   type: 'thread', timestamp: new Date().toISOString() }
      ];
      await saveData(ds);
    }
    res.json({ success: true, messages: ds.communityMessages });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
});

app.post('/api/community/messages', async (req, res) => {
  try {
    if (!req.body || !String(req.body.content || '').trim()) {
      return res.status(400).json({ success: false, message: 'Message content is required' });
    }
    const ds = await getDataStore();
    if (!Array.isArray(ds.communityMessages)) ds.communityMessages = [];
    const newMessage = { id: uuidv4(), ...req.body, timestamp: new Date().toISOString() };
    ds.communityMessages.push(newMessage);
    await saveData(ds);
    res.json({ success: true, message: newMessage });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
});

app.get('/api/community/daily-prompt', (req, res) => {
  const prompts = [
    "Question of the day: What's your biggest CKD challenge this week?",
    'What one habit helped your kidneys most this week?',
    'What food swap has worked best for you recently?',
    'How do you keep your medication routine consistent on busy days?'
  ];
  const dayOfYear = Math.floor((Date.now() - new Date(new Date().getFullYear(), 0, 0)) / 86400000);
  res.json({ success: true, prompt: prompts[dayOfYear % prompts.length] });
});

// Education Articles categorized
const ARTICLES_BY_CATEGORY = {
  medical: [
    { id: 'a1',  title: 'Understanding Your GFR',        readTime: '3 min', summary: 'GFR measures how well your kidneys filter waste. Learn what your number means.',   content: 'GFR is the best estimate of kidney function...' },
    { id: 'a6',  title: 'Blood Pressure Control',         readTime: '4 min', summary: 'HBP is both a cause and consequence of kidney disease.',                           content: 'Target BP for most CKD patients is below 130/80 mmHg...' },
    { id: 'a8',  title: 'Phosphorus: The Hidden Mineral', readTime: '4 min', summary: 'Damaged kidneys struggle to remove phosphorus.',                                    content: 'High phosphorus weakens bones and hardens blood vessels...' },
    { id: 'a9',  title: 'Managing Anaemia in CKD',        readTime: '3 min', summary: 'Sign of damaged kidneys producing less erythropoietin.',                           content: 'Treatment includes EPO injections and iron supplements...' },
    { id: 'a13', title: 'Reading Your Lab Report',        readTime: '5 min', summary: 'Creatinine, BUN, GFR markers explained.',                                          content: 'Trends over time matter more than a single reading...' },
    { id: 'a14', title: 'Diabetes and CKD',               readTime: '4 min', summary: 'Diabetes is the leading cause of CKD.',                                            content: 'Tight glucose control is the most powerful kidney protector...' },
    { id: 'a18', title: 'Dialysis: What to Expect',       readTime: '5 min', summary: 'Replaces kidney functions by filtering waste.',                                    content: 'Dialysis is not failure — it is life-saving...' },
    { id: 'a19', title: 'Kidney Transplant Basics',       readTime: '4 min', summary: 'Best long-term treatment for kidney failure.',                                      content: 'Evaluation should begin before you need dialysis...' }
  ],
  nutrition: [
    { id: 'a2',  title: 'Potassium & Your Kidneys',   readTime: '4 min', summary: 'Too much potassium can be dangerous.',                                content: 'High-potassium foods include bananas, oranges, and dairy...' },
    { id: 'a4',  title: 'Why Sodium Matters',          readTime: '3 min', summary: 'Salt causes fluid retention and raises BP.',                          content: 'Aim for less than 2,000 mg of sodium per day...' },
    { id: 'a5',  title: 'Protein and CKD',             readTime: '5 min', summary: 'Eating the right amount of protein protects function.',               content: 'Low-to-moderate protein diet slows CKD progression...' },
    { id: 'a17', title: 'Herbal Supplements & Risk',   readTime: '3 min', summary: 'Many herbal remedies are toxic to kidneys.',                          content: 'Always tell your nephrologist about every supplement...' }
  ],
  lifestyle: [
    { id: 'a3',  title: 'Fluid Management Tips',       readTime: '3 min', summary: 'Managing fluid intake is critical.',                                  content: 'Log every cup using the Fluid Intake tracker...' },
    { id: 'a7',  title: 'Exercise & Kidney Health',    readTime: '3 min', summary: 'Light regular exercise protects heart and kidneys.',                  content: 'Aim for 150 minutes of moderate activity per week...' },
    { id: 'a10', title: 'Travel Tips for CKD',         readTime: '3 min', summary: 'Travelling with CKD requires planning.',                              content: 'Pack extra medications and identify local dialysis centres...' },
    { id: 'a11', title: 'Mental Health & CKD',         readTime: '4 min', summary: 'Depression and anxiety are common.',                                  content: 'Talk to your care team honestly about your mood...' },
    { id: 'a12', title: 'Sleep & Kidney Disease',      readTime: '3 min', summary: 'Poor sleep worsens BP and kidney function.',                          content: 'Maintain a regular sleep schedule and limit fluids before bed...' },
    { id: 'a16', title: 'Hydration vs. Over-hydration',readTime: '3 min', summary: 'Both extremes harm kidneys.',                                         content: 'Your target depends on urine output and BP...' }
  ],
  management: [
    { id: 'a15', title: 'Nephrology Appointment Prep', readTime: '3 min', summary: 'Make the most of every visit.',                                       content: 'Bring your home BP log and current medication list...' },
    { id: 'a20', title: 'Mouth Health & CKD',          readTime: '3 min', summary: 'Oral health impacts systemic inflammation.',                          content: 'Brush twice daily and see a dentist every 6 months...' }
  ]
};

const getISOWeek = (date) => {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + 4 - (d.getDay() || 7));
  const yearStart = new Date(d.getFullYear(), 0, 1);
  return Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
};

app.get('/api/education/articles', (req, res) => {
  const week   = getISOWeek(new Date());
  const select = (list, seed) => list[seed % list.length];
  const articles = [
    select(ARTICLES_BY_CATEGORY.medical,     week),
    select(ARTICLES_BY_CATEGORY.medical,     week + 1),
    select(ARTICLES_BY_CATEGORY.nutrition,   week),
    select(ARTICLES_BY_CATEGORY.lifestyle,   week),
    select(ARTICLES_BY_CATEGORY.management,  week)
  ];
  res.json({ success: true, week, articles });
});

// Direct Messages (Doctor <-> Patient)
app.get('/api/dm/:userId1/:userId2', async (req, res) => {
  try {
    const { userId1, userId2 } = req.params;
    const ds   = await getDataStore();
    const msgs = ds.directMessages.filter(
      m => (m.fromId === userId1 && m.toId === userId2) || (m.fromId === userId2 && m.toId === userId1)
    );
    res.json({ success: true, messages: msgs });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
});

app.post('/api/dm', async (req, res) => {
  try {
    const { fromId, toId, content } = req.body || {};
    if (!fromId || !toId || !String(content || '').trim()) {
      return res.status(400).json({ success: false, message: 'fromId, toId and content are required' });
    }
    const ds         = await getDataStore();
    const newMessage = { id: uuidv4(), ...req.body, timestamp: new Date().toISOString() };
    ds.directMessages.push(newMessage);
    await saveData(ds);
    res.json({ success: true, message: newMessage });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
});

// AI Chat with History
app.get('/api/ai/chat/:userId', async (req, res) => {
  try {
    const ds = await getDataStore();
    res.json({ success: true, history: ds.aiHistory[req.params.userId] || [] });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
});

app.post('/api/ai/chat', async (req, res) => {
  try {
    const { userId, message } = req.body;
    if (!userId || !String(message || '').trim()) {
      return res.status(400).json({ success: false, message: 'userId and message are required' });
    }

    const ds = await getDataStore();
    if (!ds.aiHistory[userId]) ds.aiHistory[userId] = [];

    // Save user message
    ds.aiHistory[userId].push({ role: 'user', text: message });

    let reply = 'Hello! I am RenAmi AI.';
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

      const systemInstruction = `You are RenAmi AI, a compassionate kidney health assistant.
INSTRUCTIONS:
1. Respond to the user's latest message in a friendly, empathetic, and concise way (max 3 sentences).
2. NEVER introduce yourself formally in every message. You must acknowledge ALL issues even generic symptoms like headaches, fatigue, or nausea. Do NOT say "I am a kidney health assistant. How can I help you regarding your diet, symptoms, or general renal care?"
3. Briefly explain how symptoms could relate to kidney health (e.g. headaches can be tied to blood pressure fluctuations).
4. Always advise them to log new symptoms in the Track tab.
5. Do not prefix your response with "AI:" or "MODEL:".`;

      const chatHistory = ds.aiHistory[userId].map(m => `${m.role === 'ai' ? 'MODEL' : 'USER'}: ${m.text}`).join('\n\n');

      const response = await ai.models.generateContent({
        model:    'gemini-2.5-flash',
        contents: chatHistory,
        config:   { systemInstruction }
      });
      reply = response.text;
    } catch (e) {
      console.error('AI Error:', e.message);
      reply = !process.env.GEMINI_API_KEY
        ? '[System Notice: Real AI is disabled because GEMINI_API_KEY is missing]. Simulated answer: Drinking enough fluids while monitoring your sodium is vital for kidney care.'
        : 'Sorry, I am having trouble connecting to my AI brain at the moment. Error: ' + e.message;
    }

    // Save AI reply
    ds.aiHistory[userId].push({ role: 'ai', text: reply });
    await saveData(ds);
    res.json({ success: true, reply });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
});

// ─── Start server (local dev only) ───────────────────────────────────────────
const PORT = process.env.PORT || 3001;

if (process.env.VERCEL !== '1') {
  app.listen(PORT, () => {
    console.log(`Backend server running on port ${PORT}`);
  });
}

// Export for Vercel Serverless Functions
module.exports = app;
