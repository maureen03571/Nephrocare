const bcrypt = require('bcryptjs');
const { OAuth2Client } = require('google-auth-library');

const BCRYPT_PREFIX = /^\$2[aby]\$/;

const isBcryptHash = (value) => typeof value === 'string' && BCRYPT_PREFIX.test(value);

const hashPassword = async (password) => bcrypt.hash(password, 12);

const verifyPassword = async (plainPassword, storedPassword) => {
  if (!storedPassword) return false;
  if (isBcryptHash(storedPassword)) {
    return bcrypt.compare(plainPassword, storedPassword);
  }
  return plainPassword === storedPassword;
};

const migrateStoredPasswords = async (dataStore, saveData) => {
  let changed = false;

  for (const user of dataStore.users) {
    if (user.password && !isBcryptHash(user.password)) {
      user.password = await hashPassword(user.password);
      changed = true;
    }
  }

  if (changed) saveData();
};

const verifyGoogleToken = async (credential) => {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  if (!clientId) {
    throw new Error('GOOGLE_CLIENT_ID is not configured');
  }

  const client = new OAuth2Client(clientId);
  const ticket = await client.verifyIdToken({
    idToken: credential,
    audience: clientId
  });

  return ticket.getPayload();
};

const toPublicUser = (user) => ({
  id: user.id,
  email: user.email,
  role: user.role,
  name: user.name,
  authProvider: user.authProvider || (user.password ? 'local' : 'google')
});

module.exports = {
  hashPassword,
  verifyPassword,
  isBcryptHash,
  migrateStoredPasswords,
  verifyGoogleToken,
  toPublicUser
};
