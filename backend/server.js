const express = require('express');
const cors = require('cors');
const { v4: uuidv4 } = require('uuid');
require('dotenv').config();
const { GoogleGenAI } = require('@google/genai');
const { loadDataStore, saveDataStore } = require('./lib/dataStore');

const app = express();
app.use(cors());
app.use(express.json());

let dataStore = loadDataStore();

const saveData = () => {
  saveDataStore(dataStore);
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
  if (!email || !password || !name) return res.status(400).json({ success: false, message: 'All fields required' });
  if (dataStore.users.find(u => u.email === email)) {
    return res.status(400).json({ success: false, message: 'Email already exists' });
  }
  const newUser = { id: uuidv4(), email, password, name, role };
  dataStore.users.push(newUser);
  saveData();
  res.json({ success: true, user: { id: newUser.id, email: newUser.email, role: newUser.role, name: newUser.name } });
});

// Profile endpoints
app.get('/api/patient/:id/profile', (req, res) => {
  res.json({ success: true, profile: dataStore.profiles[req.params.id] || null });
});
app.put('/api/patient/:id/profile', (req, res) => {
  dataStore.profiles[req.params.id] = { ...dataStore.profiles[req.params.id], ...req.body };
  saveData();
  res.json({ success: true, profile: dataStore.profiles[req.params.id] });
});

// Symptoms endpoints
app.get('/api/patient/:id/symptoms', (req, res) => {
  res.json({ success: true, symptoms: dataStore.symptoms[req.params.id] || [] });
});
app.post('/api/patient/:id/symptoms', (req, res) => {
  if (!dataStore.symptoms[req.params.id]) dataStore.symptoms[req.params.id] = [];
  const newSymptom = { id: uuidv4(), ...req.body, date: new Date().toISOString() };
  dataStore.symptoms[req.params.id].push(newSymptom);
  saveData();
  res.json({ success: true, symptom: newSymptom });
});

// Medications
app.get('/api/patient/:id/medications', (req, res) => {
  res.json({ success: true, medications: dataStore.medications[req.params.id] || [] });
});
app.post('/api/patient/:id/medications', (req, res) => {
  if (!dataStore.medications[req.params.id]) dataStore.medications[req.params.id] = [];
  const newMed = { id: uuidv4(), ...req.body };
  dataStore.medications[req.params.id].push(newMed);
  saveData();
  res.json({ success: true, medication: newMed });
});

// Weight
app.get('/api/patient/:id/weight', (req, res) => {
  res.json({ success: true, weights: dataStore.weights[req.params.id] || [] });
});
app.post('/api/patient/:id/weight', (req, res) => {
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
