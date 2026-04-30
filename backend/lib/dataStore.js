const fs = require('fs');
const path = require('path');

const DB_PATH = path.resolve(__dirname, '../dataStore.json');
const BACKUP_DIR = path.resolve(__dirname, '../backups');

const defaultDataStore = () => ({
  users: [],
  profiles: {},
  symptoms: {},
  medications: {},
  weights: {},
  communityMessages: [],
  appointments: {},
  directMessages: [],
  aiHistory: {},
  onboarding: {},
  healthScores: {},
  streaks: {},
  alerts: {}
});

const ensureSchema = (raw) => ({
  ...defaultDataStore(),
  ...(raw || {}),
  users: Array.isArray(raw?.users) ? raw.users : [],
  communityMessages: Array.isArray(raw?.communityMessages) ? raw.communityMessages : [],
  directMessages: Array.isArray(raw?.directMessages) ? raw.directMessages : [],
  profiles: raw?.profiles && typeof raw.profiles === 'object' ? raw.profiles : {},
  symptoms: raw?.symptoms && typeof raw.symptoms === 'object' ? raw.symptoms : {},
  medications: raw?.medications && typeof raw.medications === 'object' ? raw.medications : {},
  weights: raw?.weights && typeof raw.weights === 'object' ? raw.weights : {},
  appointments: raw?.appointments && typeof raw.appointments === 'object' ? raw.appointments : {},
  aiHistory: raw?.aiHistory && typeof raw.aiHistory === 'object' ? raw.aiHistory : {},
  onboarding: raw?.onboarding && typeof raw.onboarding === 'object' ? raw.onboarding : {},
  healthScores: raw?.healthScores && typeof raw.healthScores === 'object' ? raw.healthScores : {},
  streaks: raw?.streaks && typeof raw.streaks === 'object' ? raw.streaks : {},
  alerts: raw?.alerts && typeof raw.alerts === 'object' ? raw.alerts : {}
});

const loadDataStore = () => {
  if (!fs.existsSync(DB_PATH)) {
    const initial = defaultDataStore();
    fs.writeFileSync(DB_PATH, JSON.stringify(initial, null, 2));
    return initial;
  }

  try {
    const raw = JSON.parse(fs.readFileSync(DB_PATH, 'utf-8'));
    return ensureSchema(raw);
  } catch (error) {
    console.error('Failed to parse dataStore.json, restoring defaults:', error.message);
    const initial = defaultDataStore();
    fs.writeFileSync(DB_PATH, JSON.stringify(initial, null, 2));
    return initial;
  }
};

const saveDataStore = (data) => {
  if (!fs.existsSync(BACKUP_DIR)) {
    fs.mkdirSync(BACKUP_DIR, { recursive: true });
  }

  if (fs.existsSync(DB_PATH)) {
    const backupPath = path.join(BACKUP_DIR, `dataStore-${Date.now()}.json`);
    fs.copyFileSync(DB_PATH, backupPath);
  }

  fs.writeFileSync(DB_PATH, JSON.stringify(ensureSchema(data), null, 2));
};

module.exports = {
  loadDataStore,
  saveDataStore,
  ensureSchema,
  defaultDataStore
};
