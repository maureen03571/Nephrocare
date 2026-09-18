const { v4: uuidv4 } = require('uuid');
const { hashPassword } = require('./auth');

const seedDemoAccounts = async (dataStore, saveData) => {
  let changed = false;
  const demoPassword = await hashPassword('demo1234');

  const hasDoctor = dataStore.users.some((user) => user.role === 'doctor');
  if (!hasDoctor) {
    dataStore.users.push({
      id: uuidv4(),
      email: 'doctor@nephrocare.app',
      password: demoPassword,
      name: 'Sarah Kimani',
      role: 'doctor',
      authProvider: 'local'
    });
    changed = true;
  }

  const hasCaregiver = dataStore.users.some((user) => user.role === 'caregiver');
  if (!hasCaregiver) {
    const caregiverId = uuidv4();
    dataStore.users.push({
      id: caregiverId,
      email: 'caregiver@nephrocare.app',
      password: demoPassword,
      name: 'Alex Mwangi',
      role: 'caregiver',
      authProvider: 'local'
    });

    const firstPatient = dataStore.users.find((user) => user.role === 'patient');
    if (firstPatient) {
      if (!dataStore.caregiverAssignments) dataStore.caregiverAssignments = {};
      dataStore.caregiverAssignments[caregiverId] = firstPatient.id;
    }
    changed = true;
  }

  const demoCaregiver = dataStore.users.find((user) => user.email === 'caregiver@nephrocare.app');
  const firstPatient = dataStore.users.find((user) => user.role === 'patient');
  if (demoCaregiver && firstPatient) {
    if (!dataStore.caregiverAssignments) dataStore.caregiverAssignments = {};
    if (!dataStore.caregiverAssignments[demoCaregiver.id]) {
      dataStore.caregiverAssignments[demoCaregiver.id] = firstPatient.id;
      changed = true;
    }
  }

  if (changed) {
    saveData();
    console.log('Seeded demo doctor/caregiver accounts (doctor@nephrocare.app / demo1234)');
  }
};

module.exports = { seedDemoAccounts };
