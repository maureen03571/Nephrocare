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

let dataStore = loadDataStore();

const saveData = () => {
  saveDataStore(dataStore);
};

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

const getPatientDashboard = (patientId) => {
  const profile = dataStore.profiles[patientId] || {};
  const onboarding = dataStore.onboarding[patientId] || null;
  const symptoms = dataStore.symptoms[patientId] || [];
  const meds = dataStore.medications[patientId] || [];
  const weights = dataStore.weights[patientId] || [];
  const alerts = dataStore.alerts[patientId] || [];
  const fluidLogs = dataStore.fluidIntake[patientId] || [];

  const healthScore = calculateHealthScore({ symptoms, meds, weights });
  const weightDelta = getLatestWeightDelta(weights);
  const activeAlerts = alerts.filter(a => a.status !== 'resolved').slice(-5).reverse();
  const streakDays = (dataStore.streaks[patientId] && dataStore.streaks[patientId].medicationDays) || 0;
  const todayKey = getTodayKey();
  const todayFluidMl = fluidLogs
    .filter((f) => String(f.date || '').slice(0, 10) === todayKey)
    .reduce((sum, f) => sum + (Number(f.amountMl) || 0), 0);

  dataStore.healthScores[patientId] = {
    value: healthScore,
    generatedAt: new Date().toISOString()
  };

  return {
    profile,
    onboarding,
    healthScore: dataStore.healthScores[patientId],
    streaks: { medicationDays: streakDays },
    quickStats: {
      weightDelta,
      symptomsLogged: symptoms.length,
      medicationsTracked: meds.length,
      fluidTodayMl: todayFluidMl
    },
    alerts: activeAlerts
  };
};

const appendAlert = ({ patientId, type, severity, message, metadata = {} }) => {
  if (!dataStore.alerts[patientId]) dataStore.alerts[patientId] = [];
  dataStore.alerts[patientId].push({
    id: uuidv4(),
    type,
    severity,
    message,
    metadata,
    status: 'active',
    createdAt: new Date().toISOString()
  });
};

const isSameUtcDay = (a, b) => {
  const da = new Date(a);
  const db = new Date(b);
  return da.getUTCFullYear() === db.getUTCFullYear() &&
    da.getUTCMonth() === db.getUTCMonth() &&
    da.getUTCDate() === db.getUTCDate();
};

const updateMedicationStreak = (patientId, loggedAt) => {
  if (!dataStore.streaks[patientId]) {
    dataStore.streaks[patientId] = { medicationDays: 0, lastMedicationLogDate: null };
  }

  const streak = dataStore.streaks[patientId];
  if (!streak.lastMedicationLogDate) {
    streak.medicationDays = 1;
    streak.lastMedicationLogDate = loggedAt;
    return;
  }

  if (isSameUtcDay(streak.lastMedicationLogDate, loggedAt)) {
    return;
  }

  const previousDate = new Date(streak.lastMedicationLogDate);
  const currentDate = new Date(loggedAt);
  const diffDays = Math.floor((Date.UTC(
    currentDate.getUTCFullYear(),
    currentDate.getUTCMonth(),
    currentDate.getUTCDate()
  ) - Date.UTC(
    previousDate.getUTCFullYear(),
    previousDate.getUTCMonth(),
    previousDate.getUTCDate()
  )) / 86400000);

  streak.medicationDays = diffDays === 1 ? streak.medicationDays + 1 : 1;
  streak.lastMedicationLogDate = loggedAt;
};

const getTodayKey = () => new Date().toISOString().slice(0, 10);

const priorityActionCatalog = {
  hydration: {
    title: 'Drink Water (1L target)',
    metricLabel: 'Hydration target'
  },
  medication: {
    title: 'Lisinopril 10mg',
    metricLabel: 'Medication taken'
  },
  weight: {
    title: 'Log morning weight',
    metricLabel: 'Weight logged'
  },
  dialysis: {
    title: 'Dialysis session prep',
    metricLabel: 'Dialysis prep started'
  }
};

const getDailyActionBucket = (patientId, dayKey = getTodayKey()) => {
  if (!dataStore.dailyActions[patientId]) dataStore.dailyActions[patientId] = {};
  if (!dataStore.dailyActions[patientId][dayKey]) {
    dataStore.dailyActions[patientId][dayKey] = {
      completed: {},
      history: [],
      updatedAt: new Date().toISOString()
    };
  }
  return dataStore.dailyActions[patientId][dayKey];
};

// Users
app.get('/api/users/doctors', (req, res) => {
  const doctors = dataStore.users.filter(u => u.role === 'doctor');
  res.json({ success: true, doctors: doctors.map(d => ({ id: d.id, name: d.name, email: d.email })) });
});

app.get('/api/users/patients', (req, res) => {
  // Return all patients with profiles
  const patients = dataStore.users.filter(u => u.role === 'patient').map(p => ({
    id: p.id, name: p.name, email: p.email, profile: dataStore.profiles[p.id] || {}
  }));
  res.json({ success: true, patients });
});

app.post('/api/auth/login', (req, res) => {
  const { email, password } = req.body;
  const user = dataStore.users.find(u => u.email === email && u.password === password);
  if (user) {
    res.json({ success: true, user: { id: user.id, email: user.email, role: user.role, name: user.name } });
  } else {
    res.status(401).json({ success: false, message: 'Invalid credentials' });
  }
});

app.post('/api/auth/register', (req, res) => {
  const { email, password, name, role } = req.body;
  const validationError = validateAuthRegister({ email, password, name, role });
  if (validationError) return res.status(400).json({ success: false, message: validationError });
  if (dataStore.users.find(u => u.email === email)) {
    return res.status(400).json({ success: false, message: 'Email already exists' });
  }
  const newUser = { id: uuidv4(), email, password, name, role };
  dataStore.users.push(newUser);
  saveData();
  res.json({ success: true, user: { id: newUser.id, email: newUser.email, role: newUser.role, name: newUser.name } });
});

app.post('/api/auth/verify', (req, res) => {
  const { userId, password } = req.body;
  if (!userId || !password) {
    return res.status(400).json({ success: false, message: 'userId and password are required' });
  }
  const user = dataStore.users.find(u => u.id === userId && u.password === password);
  if (user) {
    res.json({ success: true, message: 'Password verified' });
  } else {
    res.status(401).json({ success: false, message: 'Incorrect password' });
  }
});

app.get('/api/patient/:id/onboarding', (req, res) => {
  const onboarding = dataStore.onboarding[req.params.id] || null;
  res.json({ success: true, onboarding });
});

app.put('/api/patient/:id/onboarding', (req, res) => {
  const { ckdStage, baselineLabs, medicationList, quiz } = req.body || {};

  if (!ckdStage) {
    return res.status(400).json({ success: false, message: 'ckdStage is required' });
  }

  dataStore.onboarding[req.params.id] = {
    ckdStage,
    baselineLabs: baselineLabs || {},
    medicationList: Array.isArray(medicationList) ? medicationList : [],
    quiz: quiz || {},
    updatedAt: new Date().toISOString()
  };

  saveData();
  res.json({ success: true, onboarding: dataStore.onboarding[req.params.id] });
});

app.get('/api/patient/:id/dashboard', (req, res) => {
  const dashboard = getPatientDashboard(req.params.id);
  saveData();
  res.json({ success: true, dashboard });
});

app.get('/api/patient/:id/daily-actions', (req, res) => {
  const dayKey = req.query.date || getTodayKey();
  const bucket = getDailyActionBucket(req.params.id, dayKey);
  const totalActions = Object.keys(priorityActionCatalog).length;
  const completedCount = Object.values(bucket.completed).filter(Boolean).length;
  const progressPercent = Math.round((completedCount / totalActions) * 100);

  res.json({
    success: true,
    date: dayKey,
    progress: {
      completedCount,
      totalActions,
      progressPercent
    },
    completed: bucket.completed,
    history: [...bucket.history].reverse()
  });
});

app.post('/api/patient/:id/daily-actions/complete', (req, res) => {
  const actionType = String(req.body?.actionType || '').trim();
  const dayKey = req.body?.date || getTodayKey();
  const catalogItem = priorityActionCatalog[actionType];

  if (!catalogItem) {
    return res.status(400).json({ success: false, message: 'Invalid actionType' });
  }

  const bucket = getDailyActionBucket(req.params.id, dayKey);

  if (!bucket.completed[actionType]) {
    bucket.history.push({
      id: uuidv4(),
      actionType,
      title: catalogItem.title,
      metricLabel: catalogItem.metricLabel,
      completedAt: new Date().toISOString()
    });
  }

  bucket.completed[actionType] = true;
  bucket.updatedAt = new Date().toISOString();
  saveData();

  const totalActions = Object.keys(priorityActionCatalog).length;
  const completedCount = Object.values(bucket.completed).filter(Boolean).length;
  const progressPercent = Math.round((completedCount / totalActions) * 100);

  res.json({
    success: true,
    date: dayKey,
    progress: { completedCount, totalActions, progressPercent },
    completed: bucket.completed,
    history: [...bucket.history].reverse()
  });
});

app.get('/api/patient/:id/alerts', (req, res) => {
  const alerts = (dataStore.alerts[req.params.id] || []).slice().reverse();
  res.json({ success: true, alerts });
});

app.put('/api/patient/:id/alerts/:alertId/resolve', (req, res) => {
  const { id, alertId } = req.params;
  const alerts = dataStore.alerts[id] || [];
  const alert = alerts.find(a => a.id === alertId);
  if (!alert) {
    return res.status(404).json({ success: false, message: 'Alert not found' });
  }

  alert.status = 'resolved';
  alert.resolvedAt = new Date().toISOString();
  saveData();
  res.json({ success: true, alert });
});

// Profile endpoints
app.get('/api/patient/:id/profile', (req, res) => {
  res.json({ success: true, profile: dataStore.profiles[req.params.id] || null });
});
app.put('/api/patient/:id/profile', (req, res) => {
  if (!req.body || typeof req.body !== 'object') {
    return res.status(400).json({ success: false, message: 'Profile payload is required' });
  }
  dataStore.profiles[req.params.id] = { ...dataStore.profiles[req.params.id], ...req.body };
  saveData();
  res.json({ success: true, profile: dataStore.profiles[req.params.id] });
});

// Symptoms endpoints
app.get('/api/patient/:id/symptoms', (req, res) => {
  res.json({ success: true, symptoms: dataStore.symptoms[req.params.id] || [] });
});
app.post('/api/patient/:id/symptoms', (req, res) => {
  const validationError = validateSymptomPayload(req.body || {});
  if (validationError) return res.status(400).json({ success: false, message: validationError });

  if (!dataStore.symptoms[req.params.id]) dataStore.symptoms[req.params.id] = [];
  const newSymptom = { id: uuidv4(), ...req.body, date: new Date().toISOString() };
  dataStore.symptoms[req.params.id].push(newSymptom);

  if (newSymptom.severity === 'High') {
    appendAlert({
      patientId: req.params.id,
      type: 'symptom',
      severity: 'high',
      message: `High-severity symptom logged: ${newSymptom.type || 'Unknown symptom'}`,
      metadata: { symptomId: newSymptom.id }
    });
  }

  const recentSwellingCount = (dataStore.symptoms[req.params.id] || []).filter((s) => {
    if (!s.type || !String(s.type).toLowerCase().includes('swelling')) return false;
    const symptomDate = new Date(s.date);
    const threeDaysAgo = new Date(Date.now() - (3 * 24 * 60 * 60 * 1000));
    return symptomDate >= threeDaysAgo;
  }).length;

  if (recentSwellingCount >= 3) {
    appendAlert({
      patientId: req.params.id,
      type: 'pattern',
      severity: 'medium',
      message: 'Swelling has been reported 3+ times this week. Follow up with your doctor.',
      metadata: { trigger: 'swelling_pattern' }
    });
  }

  saveData();
  res.json({ success: true, symptom: newSymptom });
});

// Medications
app.get('/api/patient/:id/medications', (req, res) => {
  res.json({ success: true, medications: dataStore.medications[req.params.id] || [] });
});
app.post('/api/patient/:id/medications', (req, res) => {
  const validationError = validateMedicationPayload(req.body || {});
  if (validationError) return res.status(400).json({ success: false, message: validationError });

  if (!dataStore.medications[req.params.id]) dataStore.medications[req.params.id] = [];
  const newMed = { id: uuidv4(), ...req.body, date: new Date().toISOString() };
  dataStore.medications[req.params.id].push(newMed);

  updateMedicationStreak(req.params.id, newMed.date);

  const sideEffect = String(req.body?.sideEffect || '').toLowerCase();
  if (sideEffect && ['swelling', 'rash', 'dizziness', 'nausea'].includes(sideEffect)) {
    appendAlert({
      patientId: req.params.id,
      type: 'medication-side-effect',
      severity: sideEffect === 'swelling' || sideEffect === 'rash' ? 'high' : 'medium',
      message: `Potential medication side effect reported: ${req.body.sideEffect}`,
      metadata: { medicationId: newMed.id, sideEffect: req.body.sideEffect }
    });
  }

  saveData();
  res.json({ success: true, medication: newMed });
});

// Weight
app.get('/api/patient/:id/weight', (req, res) => {
  res.json({ success: true, weights: dataStore.weights[req.params.id] || [] });
});
app.post('/api/patient/:id/weight', (req, res) => {
  const validationError = validateWeightPayload(req.body || {});
  if (validationError) return res.status(400).json({ success: false, message: validationError });

  if (!dataStore.weights[req.params.id]) dataStore.weights[req.params.id] = [];
  const newWeight = { id: uuidv4(), ...req.body, date: new Date().toISOString() };
  dataStore.weights[req.params.id].push(newWeight);
  saveData();
  res.json({ success: true, weight: newWeight });
});

app.get('/api/patient/:id/blood-pressure', (req, res) => {
  res.json({ success: true, bloodPressures: dataStore.bloodPressures[req.params.id] || [] });
});

app.post('/api/patient/:id/blood-pressure', (req, res) => {
  const systolic = Number(req.body?.systolic);
  const diastolic = Number(req.body?.diastolic);
  if (!Number.isFinite(systolic) || !Number.isFinite(diastolic)) {
    return res.status(400).json({ success: false, message: 'systolic and diastolic are required numbers' });
  }

  if (!dataStore.bloodPressures[req.params.id]) dataStore.bloodPressures[req.params.id] = [];
  const bp = { id: uuidv4(), systolic, diastolic, pulse: Number(req.body?.pulse) || null, date: new Date().toISOString() };
  dataStore.bloodPressures[req.params.id].push(bp);
  saveData();
  res.json({ success: true, bloodPressure: bp });
});

app.get('/api/patient/:id/fluid-intake', (req, res) => {
  res.json({ success: true, fluidLogs: dataStore.fluidIntake[req.params.id] || [] });
});

app.post('/api/patient/:id/fluid-intake', (req, res) => {
  const amountMl = Number(req.body?.amountMl);
  if (!Number.isFinite(amountMl) || amountMl <= 0) {
    return res.status(400).json({ success: false, message: 'amountMl must be a positive number' });
  }

  if (!dataStore.fluidIntake[req.params.id]) dataStore.fluidIntake[req.params.id] = [];
  const fluid = { id: uuidv4(), amountMl, source: req.body?.source || 'manual', date: new Date().toISOString() };
  dataStore.fluidIntake[req.params.id].push(fluid);
  saveData();
  res.json({ success: true, fluid });
});

app.get('/api/patient/:id/labs', (req, res) => {
  const labs = dataStore.labResults[req.params.id] || [];
  res.json({ success: true, labs: [...labs].sort((a, b) => new Date(b.date) - new Date(a.date)) });
});

app.post('/api/patient/:id/labs', (req, res) => {
  const gfr = Number(req.body?.gfr);
  const creatinine = Number(req.body?.creatinine);
  const potassium = Number(req.body?.potassium);
  const phosphorus = Number(req.body?.phosphorus);
  const reportName = String(req.body?.reportName || '').trim() || null;

  if (![gfr, creatinine].every(Number.isFinite)) {
    return res.status(400).json({ success: false, message: 'gfr and creatinine are required numbers' });
  }

  if (!dataStore.labResults[req.params.id]) dataStore.labResults[req.params.id] = [];
  const lab = {
    id: uuidv4(),
    gfr,
    creatinine,
    potassium: Number.isFinite(potassium) ? potassium : null,
    phosphorus: Number.isFinite(phosphorus) ? phosphorus : null,
    reportName,
    date: new Date().toISOString()
  };
  dataStore.labResults[req.params.id].push(lab);
  saveData();
  res.json({ success: true, lab });
});

// Appointments
app.get('/api/patient/:id/appointments', (req, res) => {
  res.json({ success: true, appointments: dataStore.appointments[req.params.id] || [] });
});

// Community / Socials
app.get('/api/community/messages', (req, res) => {
  if (!Array.isArray(dataStore.communityMessages) || dataStore.communityMessages.length === 0) {
    dataStore.communityMessages = [
      {
        id: uuidv4(),
        senderName: 'NephroCare Guide',
        senderId: 'system',
        topic: 'Tips for staying hydrated',
        content: 'What helps you stay within your daily fluid target without feeling too thirsty?',
        type: 'thread',
        timestamp: new Date().toISOString()
      },
      {
        id: uuidv4(),
        senderName: 'NephroCare Guide',
        senderId: 'system',
        topic: 'Best low-potassium snacks',
        content: 'Share your favorite low-potassium snack ideas that are easy to prepare.',
        type: 'thread',
        timestamp: new Date().toISOString()
      },
      {
        id: uuidv4(),
        senderName: 'NephroCare Guide',
        senderId: 'system',
        topic: 'How do you remember medications?',
        content: 'What reminder routine works best for your medication schedule?',
        type: 'thread',
        timestamp: new Date().toISOString()
      }
    ];
    saveData();
  }
  res.json({ success: true, messages: dataStore.communityMessages });
});
app.post('/api/community/messages', (req, res) => {
  if (!req.body || !String(req.body.content || '').trim()) {
    return res.status(400).json({ success: false, message: 'Message content is required' });
  }
  // Guard: ensure communityMessages is always an array
  if (!Array.isArray(dataStore.communityMessages)) dataStore.communityMessages = [];
  const newMessage = { id: uuidv4(), ...req.body, timestamp: new Date().toISOString() };
  dataStore.communityMessages.push(newMessage);
  saveData();
  res.json({ success: true, message: newMessage });
});

app.get('/api/community/daily-prompt', (req, res) => {
  const prompts = [
    "Question of the day: What's your biggest CKD challenge this week?",
    'What one habit helped your kidneys most this week?',
    'What food swap has worked best for you recently?',
    'How do you keep your medication routine consistent on busy days?'
  ];
  const dayOfYear = Math.floor((Date.now() - new Date(new Date().getFullYear(), 0, 0)) / 86400000);
  const prompt = prompts[dayOfYear % prompts.length];
  res.json({ success: true, prompt });
});

// Education Articles – weekly rotating set
const ALL_ARTICLES = [
  {
    id: 'a1', title: 'Understanding Your GFR', readTime: '3 min',
    summary: 'GFR (Glomerular Filtration Rate) measures how well your kidneys filter waste. Learn what your number means.',
    content: 'GFR is the best estimate of kidney function. A GFR of 60 or above is considered normal. Stage 3 CKD is defined by a GFR of 30–59. Tracking your GFR over time helps your doctor spot trends early. Ask for a copy of each lab report so you can watch your own trend.'
  },
  {
    id: 'a2', title: 'Potassium & Your Kidneys', readTime: '4 min',
    summary: 'Too much potassium can be dangerous when kidneys are impaired. Discover which foods to watch.',
    content: 'Healthy kidneys remove excess potassium from the blood. When kidneys are damaged, potassium can build up (hyperkalemia), causing dangerous heart rhythms. High-potassium foods include bananas, oranges, potatoes, tomatoes, and dairy. Low-potassium alternatives include apples, berries, white rice, cauliflower, and green beans. Work with your renal dietitian to set a personal daily potassium limit.'
  },
  {
    id: 'a3', title: 'Fluid Management Tips', readTime: '3 min',
    summary: 'Managing fluid intake is critical in CKD. Practical daily strategies to stay within your target.',
    content: 'Excess fluid stresses the heart and can raise blood pressure. Use a measured bottle so you know exactly how much you have drunk. Suck on ice chips rather than drinking large glasses of water. Limit foods with high water content like soups, gelatin, and fruit cups when fluid-restricted. Log every cup using the Fluid Intake tracker in the Track tab.'
  },
  {
    id: 'a4', title: 'Why Sodium Matters', readTime: '3 min',
    summary: 'Salt causes fluid retention and raises blood pressure. Here is how to cut sodium without losing flavour.',
    content: 'Aim for less than 2,000 mg of sodium per day. Read nutrition labels — canned soups and processed meats are hidden salt traps. Cook with herbs, lemon juice, and garlic instead of salt. Request low-sodium options at restaurants. Even a modest reduction in sodium can lower blood pressure by several points within weeks.'
  },
  {
    id: 'a5', title: 'Protein and CKD', readTime: '5 min',
    summary: 'Eating the right amount of protein protects your remaining kidney function. Find your ideal range.',
    content: 'High protein diets produce more waste that kidneys must filter. A low-to-moderate protein diet (0.6–0.8 g/kg body weight) slows CKD progression in many people. Focus on high-quality proteins like eggs, fish, and poultry rather than processed meats. If you are on dialysis, your protein requirement is actually higher — discuss with your care team. Track your protein intake in a food diary.'
  },
  {
    id: 'a6', title: 'Blood Pressure Control in CKD', readTime: '4 min',
    summary: 'High blood pressure is both a cause and consequence of kidney disease. Keeping it controlled is essential.',
    content: 'Target blood pressure for most CKD patients is below 130/80 mmHg. Take medications as prescribed — ACE inhibitors and ARBs protect kidneys. Monitor at home and log readings in the Track tab. Reduce salt, exercise regularly (with doctor guidance), and manage stress through walking, breathing exercises, or yoga.'
  },
  {
    id: 'a7', title: 'Exercise & Kidney Health', readTime: '3 min',
    summary: 'Light regular exercise protects heart and kidney function. Safe activities to start today.',
    content: 'Physical activity lowers blood pressure, controls blood sugar, and reduces inflammation — all beneficial for kidneys. Aim for 150 minutes of moderate activity per week (e.g., brisk walking, cycling, swimming). Avoid heavy lifting or high-impact exercise without clearance from your nephrologist. Even 10-minute walks after meals improve glucose and blood pressure control significantly.'
  },
  {
    id: 'a8', title: 'Phosphorus: The Hidden Mineral', readTime: '4 min',
    summary: 'Damaged kidneys struggle to remove phosphorus, leading to bone and heart complications.',
    content: 'High phosphorus weakens bones by pulling calcium out of them (renal osteodystrophy) and can harden blood vessels. Limit dairy, nuts, whole-grain breads, dark colas, and processed foods with phosphate additives. Phosphate additives in packaged foods are absorbed almost completely — always check ingredients for words ending in "-phosphate". Take phosphate binders exactly as prescribed, usually with meals.'
  },
  {
    id: 'a9', title: 'Managing Anaemia in CKD', readTime: '3 min',
    summary: 'CKD often causes anaemia because damaged kidneys produce less erythropoietin. Know the signs.',
    content: 'Erythropoietin (EPO) made by healthy kidneys signals bone marrow to produce red blood cells. In CKD, EPO falls and anaemia develops — causing fatigue, shortness of breath, and brain fog. Treatment includes EPO injections, iron supplements, and in severe cases, blood transfusions. Report unusual tiredness or pallor to your doctor promptly so they can check haemoglobin levels.'
  },
  {
    id: 'a10', title: 'Travel Tips for CKD Patients', readTime: '3 min',
    summary: 'Travelling with CKD requires planning. How to stay safe and comfortable on the go.',
    content: 'Always carry a complete medication list with generic names and doses. Pack extra medications — delays happen. Identify dialysis centres at your destination if applicable. Keep to your fluid and diet restrictions even when eating out abroad. Use the NephroCare AI Health Coach for quick advice when you cannot reach your doctor during travel.'
  },
  {
    id: 'a11', title: 'Mental Health & CKD', readTime: '4 min',
    summary: 'Depression and anxiety are common in CKD. Why this happens and what helps.',
    content: 'Living with a chronic illness is stressful, and the physical symptoms of CKD — fatigue, sleep issues, and diet restrictions — amplify mental health challenges. Up to 20% of CKD patients experience clinical depression. Talk to your care team honestly about your mood. Community support groups (like this one), walking, creative hobbies, and professional counselling all help. You are not alone in this.'
  },
  {
    id: 'a12', title: 'Sleep & Kidney Disease', readTime: '3 min',
    summary: 'Poor sleep worsens blood pressure and kidney function. Practical strategies for better rest.',
    content: 'CKD patients often suffer from restless legs syndrome, sleep apnoea, and insomnia — all of which raise blood pressure and accelerate kidney decline. Maintain a regular sleep schedule. Limit fluids in the 2 hours before bed. Elevate the head of your bed slightly if you experience overnight fluid shifts. Ask your doctor about a sleep study if you snore heavily or wake exhausted.'
  },
  {
    id: 'a13', title: 'Reading Your Lab Report', readTime: '5 min',
    summary: 'Lab values like creatinine, BUN, GFR, and electrolytes — what they actually mean for you.',
    content: 'Key values to track: GFR (kidney filter rate), Creatinine (waste product — higher is worse), BUN (blood urea nitrogen), Potassium, Phosphorus, Haemoglobin (anaemia marker), and Albumin (nutrition marker). Ask your doctor for a copy of every panel. Enter GFR and creatinine into the Labs tab of NephroCare after each visit. Trends over time matter more than a single reading.'
  },
  {
    id: 'a14', title: 'Diabetes and CKD', readTime: '4 min',
    summary: 'Diabetes is the leading cause of CKD. Tight glucose control is the most powerful kidney protector.',
    content: 'High blood sugar damages the tiny blood vessels in the kidneys over years. Target HbA1c below 7% (or as advised by your doctor). Monitor blood glucose daily. Low-carbohydrate diets can significantly improve glucose control — a renal dietitian can help you design one that also fits your CKD restrictions. SGLT-2 inhibitors like empagliflozin have been shown to slow CKD progression in diabetic patients.'
  },
  {
    id: 'a15', title: 'Preparing for a Nephrology Appointment', readTime: '3 min',
    summary: 'Make the most of every specialist visit with this simple preparation checklist.',
    content: 'Before your visit: write down all symptoms since your last appointment, bring your current medication list, bring your home blood pressure log, and have your most recent lab results. During the visit: ask what your current GFR trend means, ask whether your medication doses need adjustment, and confirm the date of your next labs. After: log your new results in the Labs tab immediately.'
  },
  {
    id: 'a16', title: 'Hydration vs. Over-hydration', readTime: '3 min',
    summary: 'Both dehydration and fluid overload harm kidneys. Finding your personal balance.',
    content: 'Dehydration reduces blood flow to kidneys, causing acute injury on top of chronic disease. But over-hydration raises blood pressure and strains the heart. Your personal fluid target depends on your residual urine output, stage of disease, and blood pressure. Log your fluid intake daily and bring the log to appointments. Signs of fluid overload: ankle swelling, weight gain of more than 1 kg overnight, and shortness of breath.'
  },
  {
    id: 'a17', title: 'Herbal Supplements & Kidney Risk', readTime: '3 min',
    summary: 'Many herbal remedies are toxic to damaged kidneys. Know what to avoid.',
    content: 'Avoid aristolochic acid (found in some Chinese herbs), thunder god vine, licorice root, chromium picolinate, and high-dose vitamin C supplementation. Always tell your nephrologist about every supplement you take — including traditional or herbal remedies. The phrase "natural" does not mean safe for kidneys. When in doubt, ask your pharmacist or doctor before starting anything new.'
  },
  {
    id: 'a18', title: 'Dialysis: What to Expect', readTime: '5 min',
    summary: 'If dialysis is approaching, understanding it early reduces fear and helps you plan.',
    content: 'Dialysis replaces some kidney functions by filtering waste and excess fluid from your blood. Haemodialysis (HD) is done 3x per week at a centre or at home. Peritoneal dialysis (PD) uses your abdominal lining as a filter and can be done at home overnight. Starting dialysis is not failure — it is life-saving. Many people on dialysis work, travel, and live full lives. Talk to your care team about access creation (fistula or catheter) well before you need it.'
  },
  {
    id: 'a19', title: 'Kidney Transplant Basics', readTime: '4 min',
    summary: 'Transplantation is the best long-term treatment for kidney failure. Here is what to know.',
    content: 'A kidney transplant gives you a working kidney from a living or deceased donor. It offers a better quality of life and longer survival compared to long-term dialysis. Evaluation for transplant should ideally begin before you need dialysis (pre-emptive transplant). You will need lifelong immunosuppressant medications to prevent rejection. Ask your nephrologist when to begin the transplant referral process.'
  },
  {
    id: 'a20', title: 'Mouth Health & CKD', readTime: '3 min',
    summary: 'Oral health problems are common with CKD and can worsen kidney disease. Easy steps to protect your mouth.',
    content: 'Urea in saliva breaks down into ammonia, causing a metallic or ammonia taste — a common CKD symptom. Poor oral health raises systemic inflammation, which accelerates kidney decline. Brush twice daily, floss daily, and see a dentist every 6 months. Tell your dentist you have CKD so they can choose kidney-safe pain relievers and antibiotics if needed. Avoid NSAIDs (ibuprofen, naproxen) for dental pain.'
  }
];

const getISOWeek = (date) => {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + 4 - (d.getDay() || 7));
  const yearStart = new Date(d.getFullYear(), 0, 1);
  return Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
};

app.get('/api/education/articles', (req, res) => {
  const week = getISOWeek(new Date());
  const articlesPerWeek = 5;
  const startIndex = (week * articlesPerWeek) % ALL_ARTICLES.length;
  const articles = [];
  for (let i = 0; i < articlesPerWeek; i++) {
    articles.push(ALL_ARTICLES[(startIndex + i) % ALL_ARTICLES.length]);
  }
  res.json({ success: true, week, articles });
});

// Direct Messages (Doctor <-> Patient)
app.get('/api/dm/:userId1/:userId2', (req, res) => {
  const { userId1, userId2 } = req.params;
  const msgs = dataStore.directMessages.filter(
    m => (m.fromId === userId1 && m.toId === userId2) || (m.fromId === userId2 && m.toId === userId1)
  );
  res.json({ success: true, messages: msgs });
});

app.post('/api/dm', (req, res) => {
  const { fromId, toId, content } = req.body || {};
  if (!fromId || !toId || !String(content || '').trim()) {
    return res.status(400).json({ success: false, message: 'fromId, toId and content are required' });
  }
  const newMessage = { id: uuidv4(), ...req.body, timestamp: new Date().toISOString() };
  dataStore.directMessages.push(newMessage);
  saveData();
  res.json({ success: true, message: newMessage });
});

// AI Chat with History
app.get('/api/ai/chat/:userId', (req, res) => {
  res.json({ success: true, history: dataStore.aiHistory[req.params.userId] || [] });
});

app.post('/api/ai/chat', async (req, res) => {
  const { userId, message } = req.body;
  if (!userId || !String(message || '').trim()) {
    return res.status(400).json({ success: false, message: 'userId and message are required' });
  }
  if (!dataStore.aiHistory[userId]) dataStore.aiHistory[userId] = [];
  
  // Save user message
  dataStore.aiHistory[userId].push({ role: 'user', text: message });
  
  let reply = "Hello! I am NephroCare AI.";
  try {
    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY }); 
    
    const systemInstruction = `You are NephroCare AI, a compassionate kidney health assistant.
INSTRUCTIONS:
1. Respond to the user's latest message in a friendly, empathetic, and concise way (max 3 sentences).
2. NEVER introduce yourself formally in every message. You must acknowledge ALL issues even generic symptoms like headaches, fatigue, or nausea. Do NOT say "I am a kidney health assistant. How can I help you regarding your diet, symptoms, or general renal care?" 
3. Briefly explain how symptoms could relate to kidney health (e.g. headaches can be tied to blood pressure fluctuations). 
4. Always advise them to log new symptoms in the Track tab.
5. Do not prefix your response with "AI:" or "MODEL:".`;

    const chatHistory = dataStore.aiHistory[userId].map(m => `${m.role === 'ai' ? 'MODEL' : 'USER'}: ${m.text}`).join('\n\n');
    const fullPrompt = `${chatHistory}`;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: fullPrompt,
      config: {
        systemInstruction: systemInstruction,
      }
    });
    reply = response.text;
  } catch (e) {
    console.error("AI Error:", e.message);
    if (!process.env.GEMINI_API_KEY) {
      reply = "[System Notice: Real AI is disabled because GEMINI_API_KEY is missing]. Please add it to your .env file or environment variables in the backend directory! Simulated answer: Drinking enough fluids while monitoring your sodium is vital for kidney care.";
    } else {
      reply = "Sorry, I am having trouble connecting to my AI brain at the moment. Error: " + e.message;
    }
  }

  // Save AI reply
  dataStore.aiHistory[userId].push({ role: 'ai', text: reply });
  saveData();

  res.json({ success: true, reply });
});

const PORT = 3001;
app.listen(PORT, () => {
  console.log(`Backend server running on port ${PORT}`);
});
