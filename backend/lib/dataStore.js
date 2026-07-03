/**
 * dataStore.js — Firestore-backed data layer
 *
 * All data previously written to dataStore.json is now stored in a single
 * Firestore document:  nephrocare/dataStore
 *
 * Environment variable required:
 *   FIREBASE_SERVICE_ACCOUNT  — the full JSON content of the Firebase service
 *                               account private key file, set as a Vercel
 *                               environment variable (paste the entire JSON).
 *
 * Local development:
 *   Add FIREBASE_SERVICE_ACCOUNT to backend/.env  (the JSON on one line, or
 *   use a multi-line string by wrapping in single quotes in your shell).
 */

const admin = require('firebase-admin');

// ─── Initialise firebase-admin exactly once ──────────────────────────────────
if (!admin.apps.length) {
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT;
  if (!raw) {
    throw new Error(
      'FIREBASE_SERVICE_ACCOUNT environment variable is not set. ' +
      'Please add it to your Vercel project settings and (for local dev) to backend/.env.'
    );
  }

  let serviceAccount;
  try {
    serviceAccount = JSON.parse(raw);
  } catch (e) {
    throw new Error(
      'FIREBASE_SERVICE_ACCOUNT is not valid JSON. ' +
      'Make sure you pasted the entire contents of the service account key file. ' +
      'Original parse error: ' + e.message
    );
  }

  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
}

const db = admin.firestore();
// All app data lives in a single Firestore document for simplicity.
// Each top-level key (users, profiles, symptoms, …) is a field in this doc.
const DATA_DOC = db.collection('nephrocare').doc('dataStore');

// ─── Schema helpers ───────────────────────────────────────────────────────────
const defaultDataStore = () => ({
  users: [],
  profiles: {},
  symptoms: {},
  medications: {},
  weights: {},
  bloodPressures: {},
  fluidIntake: {},
  labResults: {},
  communityMessages: [],
  appointments: {},
  directMessages: [],
  aiHistory: {},
  onboarding: {},
  healthScores: {},
  streaks: {},
  alerts: {},
  dailyActions: {},
  doctorNotes: {}
});

const ensureSchema = (raw) => ({
  ...defaultDataStore(),
  ...(raw || {}),
  users: Array.isArray(raw?.users) ? raw.users : [],
  communityMessages: Array.isArray(raw?.communityMessages) ? raw.communityMessages : [],
  directMessages: Array.isArray(raw?.directMessages) ? raw.directMessages : [],
  profiles:        raw?.profiles        && typeof raw.profiles        === 'object' ? raw.profiles        : {},
  symptoms:        raw?.symptoms        && typeof raw.symptoms        === 'object' ? raw.symptoms        : {},
  medications:     raw?.medications     && typeof raw.medications     === 'object' ? raw.medications     : {},
  weights:         raw?.weights         && typeof raw.weights         === 'object' ? raw.weights         : {},
  bloodPressures:  raw?.bloodPressures  && typeof raw.bloodPressures  === 'object' ? raw.bloodPressures  : {},
  fluidIntake:     raw?.fluidIntake     && typeof raw.fluidIntake     === 'object' ? raw.fluidIntake     : {},
  labResults:      raw?.labResults      && typeof raw.labResults      === 'object' ? raw.labResults      : {},
  appointments:    raw?.appointments    && typeof raw.appointments    === 'object' ? raw.appointments    : {},
  aiHistory:       raw?.aiHistory       && typeof raw.aiHistory       === 'object' ? raw.aiHistory       : {},
  onboarding:      raw?.onboarding      && typeof raw.onboarding      === 'object' ? raw.onboarding      : {},
  healthScores:    raw?.healthScores    && typeof raw.healthScores    === 'object' ? raw.healthScores    : {},
  streaks:         raw?.streaks         && typeof raw.streaks         === 'object' ? raw.streaks         : {},
  alerts:          raw?.alerts          && typeof raw.alerts          === 'object' ? raw.alerts          : {},
  dailyActions:    raw?.dailyActions    && typeof raw.dailyActions    === 'object' ? raw.dailyActions    : {},
  doctorNotes:     raw?.doctorNotes     && typeof raw.doctorNotes     === 'object' ? raw.doctorNotes     : {}
});

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Load the data store from Firestore.
 * Returns a plain JS object with ensureSchema applied.
 */
const loadDataStore = async () => {
  try {
    const snap = await DATA_DOC.get();
    if (!snap.exists) {
      // First run — write the default skeleton so the doc exists
      const initial = defaultDataStore();
      await DATA_DOC.set(initial);
      return initial;
    }
    return ensureSchema(snap.data());
  } catch (error) {
    console.error('Failed to load Firestore dataStore, returning defaults:', error.message);
    return defaultDataStore();
  }
};

/**
 * Persist the entire data store back to Firestore.
 * Uses set() with merge:false to overwrite the whole document atomically.
 */
const saveDataStore = async (data) => {
  try {
    await DATA_DOC.set(ensureSchema(data));
  } catch (error) {
    console.error('Failed to save Firestore dataStore:', error.message);
    throw error; // Let the caller decide how to handle
  }
};

module.exports = {
  loadDataStore,
  saveDataStore,
  ensureSchema,
  defaultDataStore
};
