const allowedRoles = new Set(['patient', 'doctor', 'caregiver']);
const allowedSymptomSeverity = new Set(['Low', 'Medium', 'High']);

const isNonEmptyString = (value) => typeof value === 'string' && value.trim().length > 0;

const validateAuthRegister = ({ email, password, name, role }) => {
  if (!isNonEmptyString(email) || !isNonEmptyString(password) || !isNonEmptyString(name)) {
    return 'All fields required';
  }
  if (role && !allowedRoles.has(role)) {
    return 'Invalid role';
  }
  return null;
};

const validateSymptomPayload = ({ type, severity }) => {
  if (!isNonEmptyString(type)) return 'Symptom type is required';
  if (!allowedSymptomSeverity.has(severity)) return 'Severity must be Low, Medium, or High';
  return null;
};

const validateMedicationPayload = ({ name, dose, time }) => {
  if (!isNonEmptyString(name) || !isNonEmptyString(dose) || !isNonEmptyString(time)) {
    return 'Medication name, dose, and time are required';
  }
  return null;
};

const validateWeightPayload = ({ value, unit }) => {
  const n = Number(value);
  if (!Number.isFinite(n) || n <= 0) return 'Weight value must be a positive number';
  if (!isNonEmptyString(unit)) return 'Weight unit is required';
  return null;
};

module.exports = {
  validateAuthRegister,
  validateSymptomPayload,
  validateMedicationPayload,
  validateWeightPayload
};
