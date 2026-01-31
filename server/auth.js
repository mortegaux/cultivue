const crypto = require('crypto');
const bcrypt = require('bcrypt');
const db = require('./database');
const { v4: uuidv4 } = require('uuid');

const BCRYPT_ROUNDS = 12;
const SESSION_DURATION_MS = 7 * 24 * 60 * 60 * 1000; // 7 days
const TOKEN_BYTES = 32;

function hashToken(token) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

function createSession(userId) {
  const token = crypto.randomBytes(TOKEN_BYTES).toString('hex');
  const tokenHash = hashToken(token);
  const id = uuidv4();
  const now = new Date();
  const expires = new Date(now.getTime() + SESSION_DURATION_MS);

  db.prepare('INSERT INTO sessions (id, user_id, token_hash, created_at, expires_at) VALUES (?, ?, ?, ?, ?)')
    .run(id, userId, tokenHash, now.toISOString(), expires.toISOString());

  return { token, expires };
}

function cleanExpiredSessions() {
  db.prepare('DELETE FROM sessions WHERE expires_at < ?').run(new Date().toISOString());
}
setInterval(cleanExpiredSessions, 60 * 60 * 1000);

// Check if any users exist (for initial setup)
function hasUsers() {
  const row = db.prepare('SELECT COUNT(*) as count FROM users').get();
  return row.count > 0;
}

// Setup: create the first admin account (only works when no users exist)
async function setupAdmin(username, displayName, password) {
  if (hasUsers()) {
    return { error: 'Setup already completed' };
  }
  return createUser(username, displayName, password, true, false);
}

// Admin: create a new user account with a temporary password
async function createUser(username, displayName, password, isAdmin = false, mustChangePassword = true) {
  if (!username || typeof username !== 'string' || username.length < 3 || username.length > 30) {
    return { error: 'Username must be 3-30 characters' };
  }
  if (!/^[a-zA-Z0-9_.-]+$/.test(username)) {
    return { error: 'Username may only contain letters, numbers, underscores, dots, and hyphens' };
  }
  if (!displayName || typeof displayName !== 'string' || displayName.length < 1 || displayName.length > 50) {
    return { error: 'Display name must be 1-50 characters' };
  }
  if (!password || typeof password !== 'string' || password.length < 8 || password.length > 128) {
    return { error: 'Password must be 8-128 characters' };
  }

  const existing = db.prepare('SELECT id FROM users WHERE username = ?').get(username);
  if (existing) {
    return { error: 'Username already taken' };
  }

  const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);
  const id = uuidv4();
  const created_at = new Date().toISOString();

  db.prepare('INSERT INTO users (id, username, display_name, password_hash, is_admin, must_change_password, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)')
    .run(id, username, displayName, passwordHash, isAdmin ? 1 : 0, mustChangePassword ? 1 : 0, created_at);

  return { user: { id, username, display_name: displayName, is_admin: isAdmin } };
}

// Login
async function loginUser(username, password) {
  if (!username || !password) {
    return { error: 'Username and password are required' };
  }

  const user = db.prepare('SELECT * FROM users WHERE username = ? AND is_active = 1').get(username);
  if (!user) {
    await bcrypt.hash(password, BCRYPT_ROUNDS);
    return { error: 'Invalid username or password' };
  }

  const valid = await bcrypt.compare(password, user.password_hash);
  if (!valid) {
    return { error: 'Invalid username or password' };
  }

  const session = createSession(user.id);
  return {
    user: {
      id: user.id,
      username: user.username,
      display_name: user.display_name,
      is_admin: !!user.is_admin,
      must_change_password: !!user.must_change_password,
    },
    session
  };
}

// Change password
async function changePassword(userId, currentPassword, newPassword) {
  if (!newPassword || typeof newPassword !== 'string' || newPassword.length < 8 || newPassword.length > 128) {
    return { error: 'New password must be 8-128 characters' };
  }

  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(userId);
  if (!user) return { error: 'User not found' };

  // If must_change_password, currentPassword can be the temp password
  const valid = await bcrypt.compare(currentPassword, user.password_hash);
  if (!valid) {
    return { error: 'Current password is incorrect' };
  }

  const newHash = await bcrypt.hash(newPassword, BCRYPT_ROUNDS);
  db.prepare('UPDATE users SET password_hash = ?, must_change_password = 0 WHERE id = ?')
    .run(newHash, userId);

  return { success: true };
}

// Middleware: authenticate request via cookie
function requireAuth(req, res, next) {
  const token = req.cookies && req.cookies.session;
  if (!token) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  const tokenHash = hashToken(token);
  const session = db.prepare(
    'SELECT s.*, u.id as uid, u.username, u.display_name, u.is_admin, u.must_change_password FROM sessions s JOIN users u ON s.user_id = u.id WHERE s.token_hash = ? AND s.expires_at > ? AND u.is_active = 1'
  ).get(tokenHash, new Date().toISOString());

  if (!session) {
    res.clearCookie('session');
    return res.status(401).json({ error: 'Session expired' });
  }

  req.user = {
    id: session.uid,
    username: session.username,
    display_name: session.display_name,
    is_admin: !!session.is_admin,
    must_change_password: !!session.must_change_password,
  };
  next();
}

// Middleware: require admin
function requireAdmin(req, res, next) {
  if (!req.user || !req.user.is_admin) {
    return res.status(403).json({ error: 'Admin access required' });
  }
  next();
}

function destroySession(token) {
  if (!token) return;
  const tokenHash = hashToken(token);
  db.prepare('DELETE FROM sessions WHERE token_hash = ?').run(tokenHash);
}

// List all users (admin)
function listUsers() {
  return db.prepare('SELECT id, username, display_name, is_admin, is_active, must_change_password, created_at FROM users ORDER BY created_at ASC').all()
    .map(u => ({ ...u, is_admin: !!u.is_admin, is_active: !!u.is_active, must_change_password: !!u.must_change_password }));
}

// Admin: deactivate/reactivate user
function setUserActive(userId, active) {
  db.prepare('UPDATE users SET is_active = ? WHERE id = ?').run(active ? 1 : 0, userId);
  if (!active) {
    // Kill all sessions for deactivated user
    db.prepare('DELETE FROM sessions WHERE user_id = ?').run(userId);
  }
}

// Admin: reset user password (sets must_change_password)
async function resetUserPassword(userId, newPassword) {
  if (!newPassword || typeof newPassword !== 'string' || newPassword.length < 8 || newPassword.length > 128) {
    return { error: 'Password must be 8-128 characters' };
  }
  const hash = await bcrypt.hash(newPassword, BCRYPT_ROUNDS);
  db.prepare('UPDATE users SET password_hash = ?, must_change_password = 1 WHERE id = ?').run(hash, userId);
  db.prepare('DELETE FROM sessions WHERE user_id = ?').run(userId);
  return { success: true };
}

module.exports = {
  hasUsers, setupAdmin, createUser, loginUser, changePassword,
  requireAuth, requireAdmin, destroySession,
  listUsers, setUserActive, resetUserPassword
};
