const { betterAuth } = require('better-auth');
const { username } = require('better-auth/plugins');
const db = require('./database');
const bcrypt = require('bcryptjs');

const auth = betterAuth({
  database: db,
  user: {
    additionalFields: {
      role: {
        type: 'string',
        defaultValue: 'user',
      },
      failed_attempts: {
        type: 'number',
        defaultValue: 0,
      },
      locked_until: {
        type: 'string',
      }
    }
  },
  emailAndPassword: {
    enabled: true,
    minPasswordLength: 8,
    maxPasswordLength: 128,
  },
  plugins: [
    username({
      minUsernameLength: 3,
      maxUsernameLength: 30,
    })
  ],
  secret: process.env.BETTER_AUTH_SECRET || 'cultivue-super-secret-key-change-in-production-32-chars-min',
  baseURL: process.env.BETTER_AUTH_URL || 'http://localhost:3000',
});

function hasUsers() {
  const row = db.prepare('SELECT COUNT(*) as count FROM "user"').get();
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

async function setupAdmin(usernameStr, displayName, password) {
  const pwError = validatePasswordStrength(password);
  if (pwError) return { error: pwError };
  if (!usernameStr || typeof usernameStr !== 'string' || usernameStr.length < 3 || usernameStr.length > 30) {
    return { error: 'Username must be 3-30 characters' };
  }
  if (!/^[a-zA-Z0-9_.-]+$/.test(usernameStr)) {
    return { error: 'Username may only contain letters, numbers, underscores, dots, and hyphens' };
  }

  if (hasUsers()) {
    return { error: 'Setup already completed' };
  }

  const email = `${usernameStr.toLowerCase()}@cultivue.local`;
  try {
    const res = await auth.api.signUpEmail({
      body: {
        email,
        password,
        name: displayName,
        username: usernameStr,
        role: 'admin',
      }
    });

    db.prepare('UPDATE "user" SET role = ? WHERE id = ?').run('admin', res.user.id);

    const passwordHash = await bcrypt.hash(password, 12);
    db.prepare(`INSERT OR REPLACE INTO users (id, username, display_name, password_hash, is_admin, must_change_password, created_at, is_active)
      VALUES (?, ?, ?, ?, 1, 0, ?, 1)`).run(res.user.id, usernameStr, displayName, passwordHash, new Date().toISOString());

    return { user: { id: res.user.id, username: usernameStr, display_name: displayName, is_admin: true } };
  } catch (err) {
    return { error: err.message || 'Setup failed' };
  }
}

async function createUser(usernameStr, displayName, password, isAdmin = false, mustChangePassword = true) {
  const pwError = validatePasswordStrength(password);
  if (pwError) return { error: pwError };
  if (!usernameStr || typeof usernameStr !== 'string' || usernameStr.length < 3 || usernameStr.length > 30) {
    return { error: 'Username must be 3-30 characters' };
  }
  if (!/^[a-zA-Z0-9_.-]+$/.test(usernameStr)) {
    return { error: 'Username may only contain letters, numbers, underscores, dots, and hyphens' };
  }

  const existing = db.prepare('SELECT id FROM "user" WHERE username = ?').get(usernameStr);
  if (existing) {
    return { error: 'Username already taken' };
  }

  const role = isAdmin ? 'admin' : 'user';
  const email = `${usernameStr.toLowerCase()}@cultivue.local`;
  try {
    const res = await auth.api.signUpEmail({
      body: {
        email,
        password,
        name: displayName,
        username: usernameStr,
        role,
      }
    });

    db.prepare('UPDATE "user" SET role = ? WHERE id = ?').run(role, res.user.id);

    const passwordHash = await bcrypt.hash(password, 12);
    db.prepare(`INSERT OR REPLACE INTO users (id, username, display_name, password_hash, is_admin, must_change_password, created_at, is_active)
      VALUES (?, ?, ?, ?, ?, ?, ?, 1)`).run(res.user.id, usernameStr, displayName, passwordHash, isAdmin ? 1 : 0, mustChangePassword ? 1 : 0, new Date().toISOString());

    return { user: { id: res.user.id, username: usernameStr, display_name: displayName, is_admin: isAdmin } };
  } catch (err) {
    return { error: err.message || 'Failed to create user' };
  }
}

async function loginUser(usernameStr, password, ip) {
  if (!usernameStr || !password) {
    return { error: 'Username and password are required' };
  }

  const user = db.prepare('SELECT * FROM "user" WHERE username = ?').get(usernameStr);
  if (!user) {
    return { error: 'Invalid username or password' };
  }

  if (user.locked_until) {
    const lockExpiry = new Date(user.locked_until);
    if (lockExpiry > new Date()) {
      const minutesLeft = Math.ceil((lockExpiry.getTime() - Date.now()) / 60000);
      return { error: `Account locked. Try again in ${minutesLeft} minute${minutesLeft !== 1 ? 's' : ''}.` };
    }
    db.prepare('UPDATE "user" SET failed_attempts = 0, locked_until = NULL WHERE id = ?').run(user.id);
    db.prepare('UPDATE users SET failed_attempts = 0, locked_until = NULL WHERE id = ?').run(user.id);
    user.failed_attempts = 0;
  }

  try {
    const signInRes = await auth.api.signInUsername({
      body: { username: usernameStr, password },
      asResponse: true,
    });

    if (!signInRes.ok) {
      const attempts = (user.failed_attempts || 0) + 1;
      const MAX_FAILED_ATTEMPTS = 5;
      if (attempts >= MAX_FAILED_ATTEMPTS) {
        const lockUntil = new Date(Date.now() + 15 * 60 * 1000).toISOString();
        db.prepare('UPDATE "user" SET failed_attempts = ?, locked_until = ? WHERE id = ?').run(attempts, lockUntil, user.id);
        db.prepare('UPDATE users SET failed_attempts = ?, locked_until = ? WHERE id = ?').run(attempts, lockUntil, user.id);
        return { error: 'Account locked due to too many failed attempts. Try again in 15 minutes.' };
      } else {
        db.prepare('UPDATE "user" SET failed_attempts = ? WHERE id = ?').run(attempts, user.id);
        db.prepare('UPDATE users SET failed_attempts = ? WHERE id = ?').run(attempts, user.id);
      }
      return { error: 'Invalid username or password' };
    }

    if (user.failed_attempts > 0) {
      db.prepare('UPDATE "user" SET failed_attempts = 0, locked_until = NULL WHERE id = ?').run(user.id);
      db.prepare('UPDATE users SET failed_attempts = 0, locked_until = NULL WHERE id = ?').run(user.id);
    }

    const setCookie = signInRes.headers.get('set-cookie');
    const session = db.prepare('SELECT token, expiresAt as expires FROM "session" WHERE userId = ? ORDER BY createdAt DESC LIMIT 1').get(user.id);

    return {
      user: {
        id: user.id,
        username: user.username,
        display_name: user.name,
        is_admin: user.role === 'admin' || !!user.is_admin,
      },
      session: { token: session ? session.token : '', expires: session ? new Date(session.expires) : new Date() },
      setCookie,
    };
  } catch {
    const attempts = (user.failed_attempts || 0) + 1;
    db.prepare('UPDATE "user" SET failed_attempts = ? WHERE id = ?').run(attempts, user.id);
    db.prepare('UPDATE users SET failed_attempts = ? WHERE id = ?').run(attempts, user.id);
    return { error: 'Invalid username or password' };
  }
}

async function changePassword(userId, currentPassword, newPassword) {
  const pwError = validatePasswordStrength(newPassword);
  if (pwError) return { error: pwError };

  const user = db.prepare('SELECT * FROM "user" WHERE id = ?').get(userId);
  if (!user) return { error: 'User not found' };

  const account = db.prepare('SELECT password FROM account WHERE userId = ? AND providerId = ?').get(userId, 'credential');
  if (!account || !account.password) {
    return { error: 'Account not found' };
  }

  const valid = await bcrypt.compare(currentPassword, account.password);
  if (!valid) {
    return { error: 'Current password is incorrect' };
  }

  const newHash = await bcrypt.hash(newPassword, 12);
  db.prepare('UPDATE account SET password = ?, updatedAt = ? WHERE userId = ? AND providerId = ?')
    .run(newHash, new Date().toISOString(), userId, 'credential');

  db.prepare('UPDATE users SET password_hash = ?, must_change_password = 0 WHERE id = ?')
    .run(newHash, userId);

  return { success: true };
}

function requireAuth(req, res, next) {
  const token = req.cookies && (req.cookies['better-auth.session_token'] || req.cookies['__Secure-better-auth.session_token'] || req.cookies['session']);
  if (!token) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  const session = db.prepare(
    `SELECT s.*, u.id as uid, u.name, u.email, u.username, u.role, u.is_admin 
     FROM "session" s 
     JOIN "user" u ON s.userId = u.id 
     WHERE s.token = ? AND s.expiresAt > ?`
  ).get(token, new Date().toISOString());

  if (!session) {
    res.clearCookie('better-auth.session_token');
    res.clearCookie('session');
    return res.status(401).json({ error: 'Session expired' });
  }

  req.user = {
    id: session.uid,
    username: session.username || session.email,
    display_name: session.name,
    is_admin: session.role === 'admin' || !!session.is_admin,
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
  db.prepare('DELETE FROM "session" WHERE token = ?').run(token);
}

function listUsers() {
  return db.prepare('SELECT id, username, name as display_name, role, createdAt as created_at FROM "user" ORDER BY createdAt ASC').all()
    .map(u => ({ ...u, is_admin: u.role === 'admin', is_active: true, must_change_password: false }));
}

function setUserActive(userId, active) {
  if (!active) {
    db.prepare('DELETE FROM "session" WHERE userId = ?').run(userId);
  }
}

async function resetUserPassword(userId, newPassword) {
  const pwError = validatePasswordStrength(newPassword);
  if (pwError) return { error: pwError };

  const hash = await bcrypt.hash(newPassword, 12);
  db.prepare('UPDATE account SET password = ?, updatedAt = ? WHERE userId = ? AND providerId = ?').run(hash, new Date().toISOString(), userId, 'credential');
  db.prepare('UPDATE users SET password_hash = ? WHERE id = ?').run(hash, userId);
  db.prepare('DELETE FROM "session" WHERE userId = ?').run(userId);
  return { success: true };
}

function deleteUser(userId) {
  const user = db.prepare('SELECT id, username, role FROM "user" WHERE id = ?').get(userId);
  if (!user) {
    return { error: 'User not found' };
  }
  if (user.role === 'admin') {
    return { error: 'Cannot delete admin users' };
  }

  const deleteTx = db.transaction(() => {
    db.prepare('DELETE FROM "session" WHERE userId = ?').run(userId);
    db.prepare('DELETE FROM account WHERE userId = ?').run(userId);
    db.prepare('DELETE FROM "user" WHERE id = ?').run(userId);
    db.prepare('DELETE FROM users WHERE id = ?').run(userId);
  });

  deleteTx();
  return { success: true, user };
}

module.exports = {
  auth,
  hasUsers, setupAdmin, createUser, loginUser, changePassword,
  requireAuth, requireAdmin, destroySession,
  listUsers, setUserActive, resetUserPassword, deleteUser,
  validatePasswordStrength
};
