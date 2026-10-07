const crypto = require('crypto');
const bcrypt = require('bcrypt');
const db = require('./database');
const { v4: uuidv4 } = require('uuid');

const BCRYPT_ROUNDS = 12;
const SESSION_DURATION_MS = 7 * 24 * 60 * 60 * 1000; // 7 days
const TOKEN_BYTES = 32;
const MAX_FAILED_ATTEMPTS = 5;
const LOCKOUT_DURATION_MS = 15 * 60 * 1000; // 15 minutes

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

function hasUsers() {
  const row = db.prepare('SELECT COUNT(*) as count FROM users').get();
  return row.count > 0;
}

function validatePasswordStrength(password) {
  if (!password || typeof password !== 'string' || password.length < 8 || password.length > 128) {
    return 'Password must be 8-128 characters';
  }
  if (!/[a-zA-Z]/.test(password)) {
    return 'Password must contain at least one letter';
  }
  if (!/[0-9]/.test(password)) {
    return 'Password must contain at least one number';
  }
  return null;
}

async function setupAdmin(username, displayName, password) {
  // Atomic: only insert the admin if no users exist yet. The WHERE NOT EXISTS
  // makes the check-and-insert a single statement, closing the race where two
  // concurrent setup requests could both create an admin.
  const pwError = validatePasswordStrength(password);
  if (pwError) return { error: pwError };
  if (!username || typeof username !== 'string' || username.length < 3 || username.length > 30) {
    return { error: 'Username must be 3-30 characters' };
  }
  if (!/^[a-zA-Z0-9_.-]+$/.test(username)) {
    return { error: 'Username may only contain letters, numbers, underscores, dots, and hyphens' };
  }

  const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);
  const id = uuidv4();
  const created_at = new Date().toISOString();

  const info = db.prepare(`INSERT INTO users (id, username, display_name, password_hash, is_admin, must_change_password, created_at)
    SELECT ?, ?, ?, ?, 1, 0, ? WHERE NOT EXISTS (SELECT 1 FROM users)`)
    .run(id, username, displayName, passwordHash, created_at);

  if (info.changes === 0) {
    return { error: 'Setup already completed' };
  }
  return { user: { id, username, display_name: displayName, is_admin: true } };
}

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

  const pwError = validatePasswordStrength(password);
  if (pwError) return { error: pwError };

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

async function loginUser(username, password, ip) {
  if (!username || !password) {
    return { error: 'Username and password are required' };
  }

  const user = db.prepare('SELECT * FROM users WHERE username = ? AND is_active = 1').get(username);
  if (!user) {
    await bcrypt.hash(password, BCRYPT_ROUNDS);
    return { error: 'Invalid username or password' };
  }

  // Check lockout
  if (user.locked_until) {
    const lockExpiry = new Date(user.locked_until);
    if (lockExpiry > new Date()) {
      const minutesLeft = Math.ceil((lockExpiry.getTime() - Date.now()) / 60000);
      return { error: `Account locked. Try again in ${minutesLeft} minute${minutesLeft !== 1 ? 's' : ''}.` };
    }
    // Lock expired, reset
    db.prepare('UPDATE users SET failed_attempts = 0, locked_until = NULL WHERE id = ?').run(user.id);
    user.failed_attempts = 0;
    user.locked_until = null;
  }

  const valid = await bcrypt.compare(password, user.password_hash);
  if (!valid) {
    const attempts = (user.failed_attempts || 0) + 1;
    if (attempts >= MAX_FAILED_ATTEMPTS) {
      const lockUntil = new Date(Date.now() + LOCKOUT_DURATION_MS).toISOString();
      db.prepare('UPDATE users SET failed_attempts = ?, locked_until = ? WHERE id = ?').run(attempts, lockUntil, user.id);
      // Log failed attempt that triggered lockout
      try {
        db.prepare("INSERT INTO audit_log (user_id, username, action, entity_type, entity_id, details, ip_address, created_at) VALUES (?, ?, 'login_failed', 'user', ?, ?, ?, ?)")
          .run(user.id, user.username, user.id, `Account locked after ${attempts} failed attempts`, ip || null, new Date().toISOString());
      } catch { /* audit log failure shouldn't block auth */ }
      return { error: 'Account locked due to too many failed attempts. Try again in 15 minutes.' };
    } else {
      db.prepare('UPDATE users SET failed_attempts = ? WHERE id = ?').run(attempts, user.id);
      try {
        db.prepare("INSERT INTO audit_log (user_id, username, action, entity_type, entity_id, details, ip_address, created_at) VALUES (?, ?, 'login_failed', 'user', ?, ?, ?, ?)")
          .run(user.id, user.username, user.id, `Failed login attempt ${attempts}/${MAX_FAILED_ATTEMPTS}`, ip || null, new Date().toISOString());
      } catch { /* audit log failure shouldn't block auth */ }
    }
    return { error: 'Invalid username or password' };
  }

  // Successful login — reset failed attempts
  if (user.failed_attempts > 0) {
    db.prepare('UPDATE users SET failed_attempts = 0, locked_until = NULL WHERE id = ?').run(user.id);
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

async function changePassword(userId, currentPassword, newPassword) {
  const pwError = validatePasswordStrength(newPassword);
  if (pwError) return { error: pwError };

  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(userId);
  if (!user) return { error: 'User not found' };

  const valid = await bcrypt.compare(currentPassword, user.password_hash);
  if (!valid) {
    return { error: 'Current password is incorrect' };
  }

  const newHash = await bcrypt.hash(newPassword, BCRYPT_ROUNDS);
  db.prepare('UPDATE users SET password_hash = ?, must_change_password = 0 WHERE id = ?')
    .run(newHash, userId);

  return { success: true };
}

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

function listUsers() {
  return db.prepare('SELECT id, username, display_name, is_admin, is_active, must_change_password, created_at FROM users ORDER BY created_at ASC').all()
    .map(u => ({ ...u, is_admin: !!u.is_admin, is_active: !!u.is_active, must_change_password: !!u.must_change_password }));
}

function setUserActive(userId, active) {
  db.prepare('UPDATE users SET is_active = ? WHERE id = ?').run(active ? 1 : 0, userId);
  if (!active) {
    db.prepare('DELETE FROM sessions WHERE user_id = ?').run(userId);
  }
}

async function resetUserPassword(userId, newPassword) {
  const pwError = validatePasswordStrength(newPassword);
  if (pwError) return { error: pwError };

  const hash = await bcrypt.hash(newPassword, BCRYPT_ROUNDS);
  db.prepare('UPDATE users SET password_hash = ?, must_change_password = 1 WHERE id = ?').run(hash, userId);
  db.prepare('DELETE FROM sessions WHERE user_id = ?').run(userId);
  return { success: true };
}

module.exports = {
  hasUsers, setupAdmin, createUser, loginUser, changePassword,
  requireAuth, requireAdmin, destroySession,
  listUsers, setUserActive, resetUserPassword,
  validatePasswordStrength
};
