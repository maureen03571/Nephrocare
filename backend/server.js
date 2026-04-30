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

  const healthScore = calculateHealthScore({ symptoms, meds, weights });
  const weightDelta = getLatestWeightDelta(weights);
  const activeAlerts = alerts.filter(a => a.status !== 'resolved').slice(-5).reverse();
  const streakDays = (dataStore.streaks[patientId] && dataStore.streaks[patientId].medicationDays) || 0;

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
      medicationsTracked: meds.length
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

// Appointments
app.get('/api/patient/:id/appointments', (req, res) => {
  res.json({ success: true, appointments: dataStore.appointments[req.params.id] || [] });
});

// Community / Socials
app.get('/api/community/messages', (req, res) => {
  res.json({ success: true, messages: dataStore.communityMessages });
});
app.post('/api/community/messages', (req, res) => {
  if (!req.body || !String(req.body.content || '').trim()) {
    return res.status(400).json({ success: false, message: 'Message content is required' });
  }
  const newMessage = { id: uuidv4(), ...req.body, timestamp: new Date().toISOString() };
  dataStore.communityMessages.push(newMessage);
  saveData();
  res.json({ success: true, message: newMessage });
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
