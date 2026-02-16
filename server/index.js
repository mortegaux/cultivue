const express = require('express');
const path = require('path');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const cookieParser = require('cookie-parser');
const compression = require('compression');
const db = require('./database');
const {
  hasUsers, setupAdmin, createUser, loginUser, changePassword,
  requireAuth, requireAdmin, destroySession,
  listUsers, setUserActive, resetUserPassword
} = require('./auth');
const { logAudit, getAuditLogs } = require('./audit');
const { getSetting, setSetting, getAllSettings, isSetupCompleted } = require('./settings');
const V = require('./validate');
const { v4: uuidv4 } = require('uuid');
const {
  listDevices, getDevice, createDevice, updateDevice, deleteDevice,
  createApiKey, listApiKeys, deleteApiKey, authenticateApiKey,
  createSensorReading, getSensorReadings,
} = require('./devices');
const {
  VALID_EVENTS,
  listWebhooks, getWebhook, createWebhook, updateWebhook, deleteWebhook,
  getWebhookLogs, fireWebhook,
} = require('./webhooks');

const app = express();

// === Security Headers ===
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'"],
      connectSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:"],
      fontSrc: ["'self'"],
      objectSrc: ["'none'"],
      frameAncestors: ["'none'"],
    },
    useDefaults: false,
  },
  crossOriginEmbedderPolicy: false,
  hsts: false,
}));

// === Rate Limiting ===
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: { error: 'Too many attempts. Try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
});

const apiLimiter = rateLimit({
  windowMs: 1 * 60 * 1000,
  max: 600,
  message: { error: 'Rate limit exceeded.' },
  standardHeaders: true,
  legacyHeaders: false,
});

const sensorLimiter = rateLimit({
  windowMs: 1 * 60 * 1000,
  max: 100,
  message: { error: 'Sensor rate limit exceeded.' },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => req.headers['x-api-key'] || req.ip,
});

// === Middleware ===
app.use(compression());
app.use(express.json({ limit: '100kb' }));
app.use(cookieParser());
app.disable('x-powered-by');
app.set('trust proxy', 1);

function getClientIP(req) {
  return req.ip || req.connection.remoteAddress || 'unknown';
}

function sessionCookieOpts(expires) {
  return {
    httpOnly: true,
    secure: process.env.COOKIE_SECURE === 'true',
    sameSite: 'lax',
    path: '/',
    expires,
  };
}

// === OOBE Setup Status ===
app.get('/api/setup/status', (req, res) => {
  const needsSetup = !hasUsers();
  const setupCompleted = isSetupCompleted();
  res.json({ needs_setup: needsSetup, setup_completed: setupCompleted });
});

// === OOBE Setup Wizard ===
app.post('/api/setup/wizard', authLimiter, async (req, res) => {
  try {
    const { admin, settings: wizardSettings, garden_types: enabledTypes } = req.body;

    if (!admin || !admin.username || !admin.password) {
      return res.status(400).json({ error: 'Admin account details required' });
    }

    // Step 1: Create admin account (only if no users exist)
    const username = V.reqStr(admin.username, 30);
    const display_name = V.reqStr(admin.display_name, 50);
    if (!username || !display_name) {
      return res.status(400).json({ error: 'Invalid admin details' });
    }

    const adminResult = await setupAdmin(username, display_name, admin.password);
    if (adminResult.error) return res.status(400).json({ error: adminResult.error });

    // Step 2: Save app settings
    if (wizardSettings) {
      if (wizardSettings.app_name) setSetting('app_name', V.str(wizardSettings.app_name, 100) || 'CultiVue', 'string');
      if (wizardSettings.default_units) setSetting('default_units', wizardSettings.default_units === 'imperial' ? 'imperial' : 'metric', 'string');
      if (wizardSettings.timezone) setSetting('timezone', V.str(wizardSettings.timezone, 100) || 'UTC', 'string');
    }

    // Step 3: Enable/disable garden types
    if (Array.isArray(enabledTypes)) {
      const allTypes = db.prepare('SELECT id FROM garden_types').all().map(r => r.id);
      for (const typeId of allTypes) {
        const enabled = enabledTypes.includes(typeId) ? 1 : 0;
        db.prepare('UPDATE garden_types SET is_enabled = ? WHERE id = ?').run(enabled, typeId);
      }
    }

    setSetting('setup_completed', 'true', 'boolean');

    // Auto-login
    const loginResult = await loginUser(username, admin.password);
    if (loginResult.error) return res.status(500).json({ error: 'Setup succeeded but login failed' });

    res.cookie('session', loginResult.session.token, sessionCookieOpts(loginResult.session.expires));
    logAudit(adminResult.user, 'setup', 'user', adminResult.user.id, 'Initial setup completed via wizard', getClientIP(req));
    res.status(201).json({ user: loginResult.user });
  } catch (err) {
    console.error('Setup wizard error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// === Auth Routes ===
app.get('/api/auth/status', (req, res) => {
  res.json({ needs_setup: !hasUsers() });
});

app.post('/api/auth/setup', authLimiter, async (req, res) => {
  try {
    const username = V.reqStr(req.body.username, 30);
    const display_name = V.reqStr(req.body.display_name, 50);
    const password = req.body.password;

    if (!username || !display_name) {
      return res.status(400).json({ error: 'Invalid input' });
    }

    const result = await setupAdmin(username, display_name, password);
    if (result.error) return res.status(400).json({ error: result.error });

    const loginResult = await loginUser(username, password, getClientIP(req));
    if (loginResult.error) return res.status(500).json({ error: 'Setup succeeded but login failed' });

    // Mark setup as completed
    setSetting('setup_completed', 'true', 'boolean');

    res.cookie('session', loginResult.session.token, sessionCookieOpts(loginResult.session.expires));
    logAudit(result.user, 'setup', 'user', result.user.id, 'Initial admin account created', getClientIP(req));
    res.status(201).json({ user: loginResult.user });
  } catch (err) {
    console.error('Setup error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

app.post('/api/auth/login', authLimiter, async (req, res) => {
  try {
    const username = V.str(req.body.username, 30);
    const password = req.body.password;

    const result = await loginUser(username, password, getClientIP(req));
    if (result.error) return res.status(401).json({ error: result.error });

    res.cookie('session', result.session.token, sessionCookieOpts(result.session.expires));
    logAudit(result.user, 'login', 'user', result.user.id, null, getClientIP(req));
    res.json({ user: result.user });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

app.post('/api/auth/logout', (req, res) => {
  destroySession(req.cookies.session);
  res.clearCookie('session', sessionCookieOpts(new Date(0)));
  res.json({ success: true });
});

app.get('/api/auth/me', requireAuth, (req, res) => {
  res.json({ user: req.user });
});

app.post('/api/auth/change-password', requireAuth, authLimiter, async (req, res) => {
  try {
    const result = await changePassword(req.user.id, req.body.current_password, req.body.new_password);
    if (result.error) return res.status(400).json({ error: result.error });

    logAudit(req.user, 'update', 'user', req.user.id, 'Changed password', getClientIP(req));
    res.json({ success: true });
  } catch (err) {
    console.error('Change password error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// === Admin: User Management ===
app.get('/api/admin/users', requireAuth, requireAdmin, (req, res) => {
  res.json(listUsers());
});

app.post('/api/admin/users', requireAuth, requireAdmin, authLimiter, async (req, res) => {
  try {
    const username = V.reqStr(req.body.username, 30);
    const display_name = V.reqStr(req.body.display_name, 50);
    const password = req.body.password;
    const is_admin = !!req.body.is_admin;

    if (!username || !display_name) {
      return res.status(400).json({ error: 'Invalid input' });
    }

    const result = await createUser(username, display_name, password, is_admin, true);
    if (result.error) return res.status(400).json({ error: result.error });

    logAudit(req.user, 'create', 'user', result.user.id, `Created user "${username}"${is_admin ? ' (admin)' : ''}`, getClientIP(req));
    res.status(201).json(result.user);
  } catch (err) {
    console.error('Create user error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

app.patch('/api/admin/users/:id/active', requireAuth, requireAdmin, (req, res) => {
  if (!V.isUUID(req.params.id)) return res.status(400).json({ error: 'Invalid ID' });
  if (req.params.id === req.user.id) return res.status(400).json({ error: 'Cannot deactivate yourself' });

  const active = !!req.body.is_active;
  setUserActive(req.params.id, active);

  const target = db.prepare('SELECT username FROM users WHERE id=?').get(req.params.id);
  logAudit(req.user, 'update', 'user', req.params.id, `${active ? 'Activated' : 'Deactivated'} user "${target?.username}"`, getClientIP(req));
  res.json({ success: true });
});

app.post('/api/admin/users/:id/reset-password', requireAuth, requireAdmin, authLimiter, async (req, res) => {
  try {
    if (!V.isUUID(req.params.id)) return res.status(400).json({ error: 'Invalid ID' });

    const result = await resetUserPassword(req.params.id, req.body.password);
    if (result.error) return res.status(400).json({ error: result.error });

    const target = db.prepare('SELECT username FROM users WHERE id=?').get(req.params.id);
    logAudit(req.user, 'update', 'user', req.params.id, `Reset password for "${target?.username}"`, getClientIP(req));
    res.json({ success: true });
  } catch (err) {
    console.error('Reset password error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// === Settings API (admin) ===
app.get('/api/settings', requireAuth, (req, res) => {
  res.json(getAllSettings());
});

app.put('/api/settings/:key', requireAuth, requireAdmin, (req, res) => {
  const key = V.reqStr(req.params.key, 100);
  if (!key) return res.status(400).json({ error: 'Invalid key' });

  const protectedKeys = ['setup_completed'];
  if (protectedKeys.includes(key)) return res.status(403).json({ error: 'Cannot modify this setting' });

  const type = req.body.type || 'string';
  setSetting(key, req.body.value, type);
  logAudit(req.user, 'update', 'setting', key, `Updated setting "${key}"`, getClientIP(req));
  res.json({ success: true });
});

// === Garden Types API ===
app.get('/api/garden-types', (req, res, next) => {
  if (isSetupCompleted()) return requireAuth(req, res, next);
  next();
}, (req, res) => {
  const types = db.prepare('SELECT * FROM garden_types ORDER BY sort_order ASC').all();
  res.json(types.map(t => ({ ...t, is_enabled: !!t.is_enabled })));
});

app.put('/api/garden-types/:id', requireAuth, requireAdmin, (req, res) => {
  const { is_enabled } = req.body;
  if (typeof is_enabled !== 'boolean') return res.status(400).json({ error: 'is_enabled must be a boolean' });
  const result = db.prepare('UPDATE garden_types SET is_enabled = ? WHERE id = ?').run(is_enabled ? 1 : 0, req.params.id);
  if (result.changes === 0) return res.status(404).json({ error: 'Garden type not found' });
  res.json({ success: true });
});

app.get('/api/garden-types/:id/metrics', requireAuth, (req, res) => {
  const metrics = db.prepare(`
    SELECT md.*, gtm.is_required FROM garden_type_metrics gtm
    JOIN metric_definitions md ON gtm.metric_id = md.id
    WHERE gtm.garden_type_id = ?
    ORDER BY md.sort_order ASC
  `).all(req.params.id);
  res.json(metrics.map(m => ({ ...m, is_required: !!m.is_required })));
});

// === Metric Definitions API ===
app.get('/api/metrics', requireAuth, (req, res) => {
  const metrics = db.prepare('SELECT * FROM metric_definitions ORDER BY sort_order ASC').all();
  res.json(metrics);
});

// === Static files ===
app.use(express.static(path.join(__dirname, '..', 'public'), {
  setHeaders(res, filePath) {
    if (filePath.endsWith('.html') || filePath.endsWith('.js') || filePath.endsWith('.css')) {
      res.setHeader('Cache-Control', 'no-cache');
    }
  }
}));

// === Locations API ===
app.get('/api/locations', requireAuth, (req, res) => {
  const locations = db.prepare(`
    SELECT l.*, COUNT(g.id) as garden_count
    FROM locations l
    LEFT JOIN gardens g ON g.location_id = l.id
    GROUP BY l.id
    ORDER BY l.sort_order ASC, l.name ASC
  `).all();
  res.json(locations);
});

app.post('/api/locations', requireAuth, (req, res) => {
  const name = V.reqStr(req.body.name, 100);
  const description = V.str(req.body.description, 500);
  const sort_order = V.int(req.body.sort_order, 0, 10000) || 0;

  if (!name) return res.status(400).json({ error: 'Location name is required' });

  const id = uuidv4();
  const now = new Date().toISOString();
  db.prepare('INSERT INTO locations (id, name, description, sort_order, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)')
    .run(id, name, description, sort_order, now, now);

  logAudit(req.user, 'create', 'location', id, `Created location "${name}"`, getClientIP(req));
  res.status(201).json({ id, name, description, sort_order, created_at: now, updated_at: now, garden_count: 0 });
});

app.put('/api/locations/:id', requireAuth, (req, res) => {
  if (!V.isUUID(req.params.id)) return res.status(400).json({ error: 'Invalid ID' });

  const name = V.reqStr(req.body.name, 100);
  const description = V.str(req.body.description, 500);
  const sort_order = V.int(req.body.sort_order, 0, 10000) || 0;

  if (!name) return res.status(400).json({ error: 'Invalid input' });

  const now = new Date().toISOString();
  db.prepare('UPDATE locations SET name=?, description=?, sort_order=?, updated_at=? WHERE id=?')
    .run(name, description, sort_order, now, req.params.id);

  logAudit(req.user, 'update', 'location', req.params.id, `Updated location "${name}"`, getClientIP(req));
  res.json({ success: true });
});

app.delete('/api/locations/:id', requireAuth, (req, res) => {
  if (!V.isUUID(req.params.id)) return res.status(400).json({ error: 'Invalid ID' });

  const location = db.prepare('SELECT name FROM locations WHERE id=?').get(req.params.id);
  db.prepare('DELETE FROM locations WHERE id=?').run(req.params.id);

  logAudit(req.user, 'delete', 'location', req.params.id, `Deleted location "${location?.name || 'unknown'}"`, getClientIP(req));
  res.json({ success: true });
});

app.get('/api/locations/:id/gardens', requireAuth, (req, res) => {
  if (!V.isUUID(req.params.id)) return res.status(400).json({ error: 'Invalid ID' });

  const gardens = db.prepare('SELECT * FROM gardens WHERE location_id=? ORDER BY start_date DESC').all(req.params.id);
  res.json(gardens.map(g => ({ ...g, is_active: !!g.is_active, plant_types: g.plant_types ? g.plant_types.split(',') : [] })));
});

// === Seeds API ===
app.get('/api/seeds', requireAuth, (req, res) => {
  const seeds = db.prepare(`
    SELECT s.*,
      COUNT(DISTINCT p.id) as plant_count,
      COUNT(DISTINCT pf.id) as failure_count
    FROM seeds s
    LEFT JOIN plants p ON p.seed_id = s.id
    LEFT JOIN plant_failures pf ON pf.seed_id = s.id
    GROUP BY s.id
    ORDER BY s.created_at DESC
  `).all();
  res.json(seeds);
});

app.get('/api/seeds/:id', requireAuth, (req, res) => {
  if (!V.isUUID(req.params.id)) return res.status(400).json({ error: 'Invalid ID' });
  const seed = db.prepare('SELECT * FROM seeds WHERE id=?').get(req.params.id);
  if (!seed) return res.status(404).json({ error: 'Not found' });
  res.json(seed);
});

app.post('/api/seeds', requireAuth, (req, res) => {
  const name = V.reqStr(req.body.name, 100);
  if (!name) return res.status(400).json({ error: 'Seed name is required' });

  const variety = V.str(req.body.variety, 100);
  const supplier = V.str(req.body.supplier, 100);
  const purchase_date = V.isoDate(req.body.purchase_date);
  const purchase_price = V.num(req.body.purchase_price, 0, 100000);
  const quantity = V.int(req.body.quantity, 0, 1000000) || 1;
  const quantity_unit = V.enumVal(req.body.quantity_unit, V.QUANTITY_UNITS) || 'packets';
  const expected_germination_rate = V.int(req.body.expected_germination_rate, 0, 100);
  const days_to_germination = V.int(req.body.days_to_germination, 0, 365);
  const notes = V.str(req.body.notes, 2000);

  const id = uuidv4();
  const now = new Date().toISOString();
  db.prepare(`INSERT INTO seeds (id, name, variety, supplier, purchase_date, purchase_price, quantity, quantity_unit, expected_germination_rate, days_to_germination, notes, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
    .run(id, name, variety, supplier, purchase_date, purchase_price, quantity, quantity_unit, expected_germination_rate, days_to_germination, notes, now, now);

  logAudit(req.user, 'create', 'seed', id, `Created seed "${name}"`, getClientIP(req));
  res.status(201).json({ id, name, variety, supplier, purchase_date, purchase_price, quantity, quantity_unit, expected_germination_rate, days_to_germination, notes, created_at: now, updated_at: now });
});

app.put('/api/seeds/:id', requireAuth, (req, res) => {
  if (!V.isUUID(req.params.id)) return res.status(400).json({ error: 'Invalid ID' });
  const name = V.reqStr(req.body.name, 100);
  if (!name) return res.status(400).json({ error: 'Invalid input' });

  const variety = V.str(req.body.variety, 100);
  const supplier = V.str(req.body.supplier, 100);
  const purchase_date = V.isoDate(req.body.purchase_date);
  const purchase_price = V.num(req.body.purchase_price, 0, 100000);
  const quantity = V.int(req.body.quantity, 0, 1000000) || 1;
  const quantity_unit = V.enumVal(req.body.quantity_unit, V.QUANTITY_UNITS) || 'packets';
  const expected_germination_rate = V.int(req.body.expected_germination_rate, 0, 100);
  const days_to_germination = V.int(req.body.days_to_germination, 0, 365);
  const notes = V.str(req.body.notes, 2000);
  const now = new Date().toISOString();

  db.prepare(`UPDATE seeds SET name=?, variety=?, supplier=?, purchase_date=?, purchase_price=?, quantity=?, quantity_unit=?, expected_germination_rate=?, days_to_germination=?, notes=?, updated_at=? WHERE id=?`)
    .run(name, variety, supplier, purchase_date, purchase_price, quantity, quantity_unit, expected_germination_rate, days_to_germination, notes, now, req.params.id);

  logAudit(req.user, 'update', 'seed', req.params.id, `Updated seed "${name}"`, getClientIP(req));
  res.json({ success: true });
});

app.delete('/api/seeds/:id', requireAuth, (req, res) => {
  if (!V.isUUID(req.params.id)) return res.status(400).json({ error: 'Invalid ID' });
  const seed = db.prepare('SELECT name FROM seeds WHERE id=?').get(req.params.id);
  db.prepare('DELETE FROM seeds WHERE id=?').run(req.params.id);
  logAudit(req.user, 'delete', 'seed', req.params.id, `Deleted seed "${seed?.name || 'unknown'}"`, getClientIP(req));
  res.json({ success: true });
});

app.get('/api/seeds/:id/metrics', requireAuth, (req, res) => {
  if (!V.isUUID(req.params.id)) return res.status(400).json({ error: 'Invalid ID' });

  const totalPlants = db.prepare('SELECT COUNT(*) as count FROM plants WHERE seed_id=?').get(req.params.id).count;
  const pastGermination = db.prepare(`SELECT COUNT(*) as count FROM plants WHERE seed_id=? AND current_stage NOT IN ('seed', 'germination')`).get(req.params.id).count;
  const failures = db.prepare(`SELECT failure_stage, failure_reason, COUNT(*) as count FROM plant_failures WHERE seed_id=? GROUP BY failure_stage, failure_reason`).all(req.params.id);
  const totalFailures = failures.reduce((sum, f) => sum + f.count, 0);
  const germinationRate = totalPlants > 0 ? Math.round((pastGermination / totalPlants) * 100) : null;

  res.json({ total_plants: totalPlants, past_germination: pastGermination, failures, total_failures: totalFailures, germination_rate: germinationRate });
});

// === Plant Failure Route ===
app.post('/api/plants/:id/fail', requireAuth, (req, res) => {
  if (!V.isUUID(req.params.id)) return res.status(400).json({ error: 'Invalid ID' });

  const plant = db.prepare('SELECT * FROM plants WHERE id=?').get(req.params.id);
  if (!plant) return res.status(404).json({ error: 'Plant not found' });

  const failure_stage = V.enumVal(req.body.failure_stage, V.FAILURE_STAGES);
  if (!failure_stage) return res.status(400).json({ error: 'Valid failure stage is required' });
  const failure_reason = V.str(req.body.failure_reason, 500);

  const id = uuidv4();
  const now = new Date().toISOString();

  db.prepare('INSERT INTO plant_failures (id, plant_id, seed_id, failure_stage, failure_reason, failed_at) VALUES (?, ?, ?, ?, ?, ?)')
    .run(id, req.params.id, plant.seed_id || null, failure_stage, failure_reason, now);

  db.prepare('UPDATE plants SET is_active=0 WHERE id=?').run(req.params.id);

  logAudit(req.user, 'update', 'plant', req.params.id, `Marked plant "${plant.name}" as failed (${failure_stage})`, getClientIP(req));
  res.status(201).json({ id, plant_id: req.params.id, seed_id: plant.seed_id, failure_stage, failure_reason, failed_at: now });
});

// === All data API routes require authentication ===
app.use('/api/gardens', requireAuth);
app.use('/api/logs', requireAuth);
app.use('/api/tasks', requireAuth);
app.use('/api/plants', requireAuth);
app.use('/api/audit', requireAuth);

// === Gardens API ===
app.get('/api/gardens', (req, res) => {
  const gardens = db.prepare('SELECT g.*, l.name as location_name FROM gardens g LEFT JOIN locations l ON g.location_id = l.id ORDER BY g.start_date DESC').all();
  res.json(gardens.map(g => ({ ...g, is_active: !!g.is_active, plant_types: g.plant_types ? g.plant_types.split(',') : [] })));
});

app.post('/api/gardens', (req, res) => {
  const name = V.reqStr(req.body.name, 100);
  const garden_type_id = V.str(req.body.garden_type_id, 100);
  const system_type = V.enumVal(req.body.system_type, V.SYSTEM_TYPES) || garden_type_id || 'hydro-dwc';
  const plant_types = V.enumArray(req.body.plant_types, V.PLANT_TYPES) || ['other'];
  const start_date = V.isoDate(req.body.start_date) || new Date().toISOString();
  const location_id = req.body.location_id && V.isUUID(req.body.location_id) ? req.body.location_id : null;

  if (!name) {
    return res.status(400).json({ error: 'Garden name is required' });
  }

  const id = uuidv4();
  db.prepare('INSERT INTO gardens (id, name, system_type, plant_types, start_date, garden_type_id, location_id) VALUES (?, ?, ?, ?, ?, ?, ?)')
    .run(id, name, system_type, plant_types.join(','), start_date, garden_type_id || null, location_id);

  logAudit(req.user, 'create', 'garden', id, `Created garden "${name}"`, getClientIP(req));
  res.status(201).json({ id, name, system_type, plant_types, start_date, is_active: true, garden_type_id, location_id });
});

app.put('/api/gardens/:id', (req, res) => {
  if (!V.isUUID(req.params.id)) return res.status(400).json({ error: 'Invalid ID' });

  const name = V.reqStr(req.body.name, 100);
  const garden_type_id = V.str(req.body.garden_type_id, 100);
  const system_type = V.enumVal(req.body.system_type, V.SYSTEM_TYPES) || req.body.system_type || '';
  const plant_types = V.enumArray(req.body.plant_types, V.PLANT_TYPES) || ['other'];
  const is_active = req.body.is_active ? 1 : 0;
  const location_id = req.body.location_id && V.isUUID(req.body.location_id) ? req.body.location_id : null;

  if (!name) {
    return res.status(400).json({ error: 'Invalid input' });
  }

  db.prepare('UPDATE gardens SET name=?, system_type=?, plant_types=?, is_active=?, garden_type_id=?, location_id=? WHERE id=?')
    .run(name, system_type, plant_types.join(','), is_active, garden_type_id || null, location_id, req.params.id);

  logAudit(req.user, 'update', 'garden', req.params.id, `Updated garden "${name}"`, getClientIP(req));
  res.json({ success: true });
});

app.delete('/api/gardens/:id', (req, res) => {
  if (!V.isUUID(req.params.id)) return res.status(400).json({ error: 'Invalid ID' });

  const garden = db.prepare('SELECT name FROM gardens WHERE id=?').get(req.params.id);
  db.prepare('DELETE FROM gardens WHERE id=?').run(req.params.id);

  logAudit(req.user, 'delete', 'garden', req.params.id, `Deleted garden "${garden?.name || 'unknown'}"`, getClientIP(req));
  res.json({ success: true });
});

// === Log Entries API ===
app.get('/api/gardens/:gardenId/logs', (req, res) => {
  if (!V.isUUID(req.params.gardenId)) return res.status(400).json({ error: 'Invalid ID' });

  const limit = V.int(req.query.limit, 1, 5000) || 1000;
  const from = req.query.from || null;
  const to = req.query.to || null;

  let sql = 'SELECT * FROM log_entries WHERE garden_id=?';
  const params = [req.params.gardenId];
  if (from) { sql += ' AND timestamp >= ?'; params.push(new Date(from).toISOString()); }
  if (to) { sql += ' AND timestamp <= ?'; params.push(new Date(to + 'T23:59:59').toISOString()); }
  sql += ' ORDER BY timestamp DESC LIMIT ?';
  params.push(limit);

  const logs = db.prepare(sql).all(...params);
  res.json(logs.map(l => {
    if (l.metric_data) { try { l.metric_data = JSON.parse(l.metric_data); } catch { l.metric_data = null; } }
    return l;
  }));
});

app.post('/api/gardens/:gardenId/logs', (req, res) => {
  if (!V.isUUID(req.params.gardenId)) return res.status(400).json({ error: 'Invalid ID' });

  const ph = V.num(req.body.ph, 0, 14);
  const ppm = V.int(req.body.ppm, 0, 100000);
  const water_temp = V.num(req.body.water_temp, -10, 60);
  const nutrients = V.str(req.body.nutrients, 500);
  const notes = V.str(req.body.notes, 2000);

  // Build metric_data from either explicit metric_data or legacy fields
  let metricData = req.body.metric_data || {};
  if (typeof metricData === 'string') { try { metricData = JSON.parse(metricData); } catch { metricData = {}; } }
  // Merge legacy fields into metric_data
  if (ph != null && metricData.ph == null) metricData.ph = ph;
  if (ppm != null && metricData.ppm == null) metricData.ppm = ppm;
  if (water_temp != null && metricData.water_temp == null) metricData.water_temp = water_temp;

  const id = uuidv4();
  const timestamp = new Date().toISOString();
  db.prepare('INSERT INTO log_entries (id, garden_id, timestamp, ph, ppm, water_temp, nutrients, notes, metric_data) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)')
    .run(id, req.params.gardenId, timestamp, ph, ppm, water_temp, nutrients, notes, Object.keys(metricData).length > 0 ? JSON.stringify(metricData) : null);

  logAudit(req.user, 'create', 'log_entry', id, `pH:${ph ?? '-'} PPM:${ppm ?? '-'} Temp:${water_temp ?? '-'}`, getClientIP(req));
  res.status(201).json({ id, garden_id: req.params.gardenId, timestamp, ph, ppm, water_temp, nutrients, notes, metric_data: metricData });
});

app.put('/api/logs/:id', requireAuth, (req, res) => {
  if (!V.isUUID(req.params.id)) return res.status(400).json({ error: 'Invalid ID' });

  const existing = db.prepare('SELECT * FROM log_entries WHERE id=?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'Not found' });

  const ph = V.num(req.body.ph, 0, 14);
  const ppm = V.int(req.body.ppm, 0, 100000);
  const water_temp = V.num(req.body.water_temp, -10, 60);
  const nutrients = V.str(req.body.nutrients, 500);
  const notes = V.str(req.body.notes, 2000);
  let metricData = req.body.metric_data || {};
  if (typeof metricData === 'string') { try { metricData = JSON.parse(metricData); } catch { metricData = {}; } }

  db.prepare('UPDATE log_entries SET ph=?, ppm=?, water_temp=?, nutrients=?, notes=?, metric_data=? WHERE id=?')
    .run(ph, ppm, water_temp, nutrients, notes, Object.keys(metricData).length > 0 ? JSON.stringify(metricData) : null, req.params.id);

  logAudit(req.user, 'update', 'log_entry', req.params.id, `Updated log entry`, getClientIP(req));
  res.json({ success: true });
});

app.delete('/api/logs/:id', (req, res) => {
  if (!V.isUUID(req.params.id)) return res.status(400).json({ error: 'Invalid ID' });

  db.prepare('DELETE FROM log_entries WHERE id=?').run(req.params.id);
  logAudit(req.user, 'delete', 'log_entry', req.params.id, null, getClientIP(req));
  res.json({ success: true });
});

// === Tasks API ===
app.get('/api/gardens/:gardenId/tasks', (req, res) => {
  if (!V.isUUID(req.params.gardenId)) return res.status(400).json({ error: 'Invalid ID' });

  const tasks = db.prepare('SELECT * FROM tasks WHERE garden_id=? ORDER BY due_date ASC')
    .all(req.params.gardenId);
  res.json(tasks.map(t => ({ ...t, is_completed: !!t.is_completed, is_recurring: !!t.is_recurring })));
});

app.get('/api/tasks', requireAuth, (req, res) => {
  const status = req.query.status;
  const priority = V.enumVal(req.query.priority, V.PRIORITIES);
  let sql = 'SELECT t.*, g.name as garden_name, p.name as plant_name FROM tasks t LEFT JOIN gardens g ON t.garden_id = g.id LEFT JOIN plants p ON t.plant_id = p.id';
  const conditions = [];
  const params = [];

  if (status === 'active') { conditions.push('t.is_completed = 0'); }
  else if (status === 'completed') { conditions.push('t.is_completed = 1'); }
  if (priority) { conditions.push('t.priority = ?'); params.push(priority); }

  if (conditions.length) sql += ' WHERE ' + conditions.join(' AND ');
  sql += ' ORDER BY t.due_date ASC';

  const tasks = db.prepare(sql).all(...params);
  res.json(tasks.map(t => ({ ...t, is_completed: !!t.is_completed, is_recurring: !!t.is_recurring })));
});

app.post('/api/tasks', requireAuth, (req, res) => {
  const garden_id = req.body.garden_id && V.isUUID(req.body.garden_id) ? req.body.garden_id : null;
  const plant_id = req.body.plant_id && V.isUUID(req.body.plant_id) ? req.body.plant_id : null;
  const title = V.reqStr(req.body.title, 200);
  const description = V.str(req.body.description, 2000);
  const due_date = V.isoDate(req.body.due_date);
  const priority = V.enumVal(req.body.priority, V.PRIORITIES) || 'medium';
  const is_recurring = req.body.is_recurring ? 1 : 0;
  const recurring_days = V.int(req.body.recurring_days, 1, 365);

  if (!title || !due_date) {
    return res.status(400).json({ error: 'Title and due date are required' });
  }

  const id = uuidv4();
  db.prepare('INSERT INTO tasks (id, garden_id, plant_id, title, description, due_date, priority, is_recurring, recurring_days) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)')
    .run(id, garden_id, plant_id, title, description, due_date, priority, is_recurring, recurring_days);

  logAudit(req.user, 'create', 'task', id, `Created task "${title}"`, getClientIP(req));
  res.status(201).json({ id, garden_id, plant_id, title, description, due_date, priority, is_completed: false, is_recurring: !!is_recurring, recurring_days });
});

app.post('/api/gardens/:gardenId/tasks', (req, res) => {
  if (!V.isUUID(req.params.gardenId)) return res.status(400).json({ error: 'Invalid ID' });

  const title = V.reqStr(req.body.title, 200);
  const description = V.str(req.body.description, 2000);
  const due_date = V.isoDate(req.body.due_date);
  const priority = V.enumVal(req.body.priority, V.PRIORITIES) || 'medium';
  const is_recurring = req.body.is_recurring ? 1 : 0;
  const recurring_days = V.int(req.body.recurring_days, 1, 365);

  if (!title || !due_date) {
    return res.status(400).json({ error: 'Title and due date are required' });
  }

  const id = uuidv4();
  db.prepare('INSERT INTO tasks (id, garden_id, title, description, due_date, priority, is_recurring, recurring_days) VALUES (?, ?, ?, ?, ?, ?, ?, ?)')
    .run(id, req.params.gardenId, title, description, due_date, priority, is_recurring, recurring_days);

  logAudit(req.user, 'create', 'task', id, `Created task "${title}"`, getClientIP(req));
  res.status(201).json({ id, garden_id: req.params.gardenId, title, description, due_date, priority, is_completed: false, is_recurring: !!is_recurring, recurring_days });
});

app.put('/api/tasks/:id', (req, res) => {
  if (!V.isUUID(req.params.id)) return res.status(400).json({ error: 'Invalid ID' });

  const title = V.reqStr(req.body.title, 200);
  const description = V.str(req.body.description, 2000);
  const due_date = V.isoDate(req.body.due_date);
  const priority = V.enumVal(req.body.priority, V.PRIORITIES) || 'medium';
  const is_completed = req.body.is_completed ? 1 : 0;
  const completed_at = is_completed ? new Date().toISOString() : null;
  const is_recurring = req.body.is_recurring ? 1 : 0;
  const recurring_days = V.int(req.body.recurring_days, 1, 365);

  if (!title || !due_date) {
    return res.status(400).json({ error: 'Invalid input' });
  }

  db.prepare('UPDATE tasks SET title=?, description=?, due_date=?, priority=?, is_completed=?, completed_at=?, is_recurring=?, recurring_days=? WHERE id=?')
    .run(title, description, due_date, priority, is_completed, completed_at, is_recurring, recurring_days, req.params.id);

  logAudit(req.user, 'update', 'task', req.params.id, `Updated task "${title}"`, getClientIP(req));
  res.json({ success: true });
});

app.patch('/api/tasks/:id/toggle', (req, res) => {
  if (!V.isUUID(req.params.id)) return res.status(400).json({ error: 'Invalid ID' });

  const task = db.prepare('SELECT * FROM tasks WHERE id=?').get(req.params.id);
  if (!task) return res.status(404).json({ error: 'Not found' });

  const newCompleted = task.is_completed ? 0 : 1;
  const completed_at = newCompleted ? new Date().toISOString() : null;
  db.prepare('UPDATE tasks SET is_completed=?, completed_at=? WHERE id=?')
    .run(newCompleted, completed_at, req.params.id);

  if (newCompleted && task.is_recurring && task.recurring_days) {
    const nextDue = new Date(task.due_date);
    nextDue.setDate(nextDue.getDate() + task.recurring_days);
    const newId = uuidv4();
    db.prepare('INSERT INTO tasks (id, garden_id, plant_id, title, description, due_date, priority, is_recurring, recurring_days) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)')
      .run(newId, task.garden_id, task.plant_id, task.title, task.description, nextDue.toISOString(), task.priority, 1, task.recurring_days);
  }

  logAudit(req.user, 'update', 'task', req.params.id, newCompleted ? `Completed task "${task.title}"` : `Reopened task "${task.title}"`, getClientIP(req));
  res.json({ success: true, is_completed: !!newCompleted });
});

app.delete('/api/tasks/:id', (req, res) => {
  if (!V.isUUID(req.params.id)) return res.status(400).json({ error: 'Invalid ID' });

  const task = db.prepare('SELECT title FROM tasks WHERE id=?').get(req.params.id);
  db.prepare('DELETE FROM tasks WHERE id=?').run(req.params.id);

  logAudit(req.user, 'delete', 'task', req.params.id, `Deleted task "${task?.title || 'unknown'}"`, getClientIP(req));
  res.json({ success: true });
});

// === Plants API ===
app.get('/api/gardens/:gardenId/plants', (req, res) => {
  if (!V.isUUID(req.params.gardenId)) return res.status(400).json({ error: 'Invalid ID' });

  const plants = db.prepare('SELECT * FROM plants WHERE garden_id=? ORDER BY created_at DESC')
    .all(req.params.gardenId);
  res.json(plants.map(p => ({ ...p, is_active: !!p.is_active })));
});

app.post('/api/gardens/:gardenId/plants', (req, res) => {
  if (!V.isUUID(req.params.gardenId)) return res.status(400).json({ error: 'Invalid ID' });

  const name = V.reqStr(req.body.name, 100);
  const plant_type = V.enumVal(req.body.plant_type, V.PLANT_TYPES);
  const species = V.reqStr(req.body.species, 100);
  const seeded_date = V.isoDate(req.body.seeded_date);
  const current_stage = V.enumVal(req.body.current_stage, V.GROWTH_STAGES) || 'seed';
  const notes = V.str(req.body.notes, 2000);
  const initial_ph = V.num(req.body.initial_ph, 0, 14);
  const initial_ppm = V.int(req.body.initial_ppm, 0, 100000);
  const seed_id = req.body.seed_id && V.isUUID(req.body.seed_id) ? req.body.seed_id : null;

  if (!name || !plant_type || !species) {
    return res.status(400).json({ error: 'Name, plant type, and species are required' });
  }

  const id = uuidv4();
  const created_at = new Date().toISOString();
  db.prepare('INSERT INTO plants (id, garden_id, name, plant_type, species, seeded_date, current_stage, notes, created_at, initial_ph, initial_ppm, seed_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)')
    .run(id, req.params.gardenId, name, plant_type, species, seeded_date, current_stage, notes, created_at, initial_ph, initial_ppm, seed_id);

  logAudit(req.user, 'create', 'plant', id, `Added plant "${name}" (${species})`, getClientIP(req));
  res.status(201).json({ id, garden_id: req.params.gardenId, name, plant_type, species, seeded_date, current_stage, notes, created_at, is_active: true, initial_ph, initial_ppm, seed_id });
});

app.put('/api/plants/:id', (req, res) => {
  if (!V.isUUID(req.params.id)) return res.status(400).json({ error: 'Invalid ID' });

  const name = V.reqStr(req.body.name, 100);
  const plant_type = V.enumVal(req.body.plant_type, V.PLANT_TYPES);
  const species = V.reqStr(req.body.species, 100);
  const seeded_date = V.isoDate(req.body.seeded_date);
  const transplanted_date = V.isoDate(req.body.transplanted_date);
  const current_stage = V.enumVal(req.body.current_stage, V.GROWTH_STAGES) || 'seed';
  const notes = V.str(req.body.notes, 2000);
  const harvest_date = V.isoDate(req.body.harvest_date);
  const yield_amount = V.num(req.body.yield_amount, 0, 1000000);
  const is_active = req.body.is_active ? 1 : 0;
  const initial_ph = V.num(req.body.initial_ph, 0, 14);
  const initial_ppm = V.int(req.body.initial_ppm, 0, 100000);
  const seed_id = req.body.seed_id && V.isUUID(req.body.seed_id) ? req.body.seed_id : null;

  if (!name || !plant_type || !species) {
    return res.status(400).json({ error: 'Invalid input' });
  }

  db.prepare(`UPDATE plants SET name=?, plant_type=?, species=?, seeded_date=?, transplanted_date=?, current_stage=?, notes=?, harvest_date=?, yield_amount=?, is_active=?, initial_ph=?, initial_ppm=?, seed_id=? WHERE id=?`)
    .run(name, plant_type, species, seeded_date, transplanted_date, current_stage, notes, harvest_date, yield_amount, is_active, initial_ph, initial_ppm, seed_id, req.params.id);

  logAudit(req.user, 'update', 'plant', req.params.id, `Updated plant "${name}"`, getClientIP(req));
  res.json({ success: true });
});

app.delete('/api/plants/:id', (req, res) => {
  if (!V.isUUID(req.params.id)) return res.status(400).json({ error: 'Invalid ID' });

  const plant = db.prepare('SELECT name FROM plants WHERE id=?').get(req.params.id);
  db.prepare('DELETE FROM plants WHERE id=?').run(req.params.id);

  logAudit(req.user, 'delete', 'plant', req.params.id, `Deleted plant "${plant?.name || 'unknown'}"`, getClientIP(req));
  res.json({ success: true });
});

// === Stats API ===
app.get('/api/gardens/:gardenId/stats', requireAuth, (req, res) => {
  if (!V.isUUID(req.params.gardenId)) return res.status(400).json({ error: 'Invalid ID' });

  const gardenId = req.params.gardenId;
  const activePlants = db.prepare('SELECT COUNT(*) as count FROM plants WHERE garden_id=? AND is_active=1').get(gardenId);
  const activeTasks = db.prepare('SELECT COUNT(*) as count FROM tasks WHERE garden_id=? AND is_completed=0').get(gardenId);
  const latestLog = db.prepare('SELECT * FROM log_entries WHERE garden_id=? ORDER BY timestamp DESC LIMIT 1').get(gardenId);
  const totalLogs = db.prepare('SELECT COUNT(*) as count FROM log_entries WHERE garden_id=?').get(gardenId);

  if (latestLog && latestLog.metric_data) {
    try { latestLog.metric_data = JSON.parse(latestLog.metric_data); } catch { latestLog.metric_data = null; }
  }

  res.json({
    active_plants: activePlants.count,
    active_tasks: activeTasks.count,
    total_logs: totalLogs.count,
    latest_log: latestLog || null
  });
});

// === Dashboard Stats API ===
app.get('/api/dashboard/stats', requireAuth, (req, res) => {
  const totalPlants = db.prepare('SELECT COUNT(*) as count FROM plants WHERE is_active=1').get();
  const totalTasks = db.prepare('SELECT COUNT(*) as count FROM tasks WHERE is_completed=0').get();
  const totalLogs = db.prepare('SELECT COUNT(*) as count FROM log_entries').get();
  const totalGardens = db.prepare('SELECT COUNT(*) as count FROM gardens WHERE is_active=1').get();

  const upcomingTasks = db.prepare(`
    SELECT t.*, g.name as garden_name FROM tasks t
    JOIN gardens g ON t.garden_id = g.id
    WHERE t.is_completed = 0 AND t.due_date <= datetime('now', '+7 days')
    ORDER BY t.due_date ASC LIMIT 10
  `).all().map(t => ({ ...t, is_completed: false, is_recurring: !!t.is_recurring }));

  const recentActivity = db.prepare(`
    SELECT * FROM audit_log ORDER BY created_at DESC LIMIT 10
  `).all();

  // Environment alerts: check latest log metrics against ideal ranges
  const environmentAlerts = [];
  const activeGardens = db.prepare(`
    SELECT g.id, g.name, g.garden_type_id FROM gardens g WHERE g.is_active=1
  `).all();
  const allMetricDefs = db.prepare('SELECT * FROM metric_definitions ORDER BY sort_order ASC').all();

  for (const garden of activeGardens) {
    const latestLog = db.prepare('SELECT * FROM log_entries WHERE garden_id=? ORDER BY timestamp DESC LIMIT 1').get(garden.id);
    if (!latestLog || !latestLog.metric_data) continue;
    let metricData;
    try { metricData = JSON.parse(latestLog.metric_data); } catch { continue; }

    // Get metrics for this garden type, or fall back to all metrics
    let metrics = allMetricDefs;
    if (garden.garden_type_id) {
      const typeMetrics = db.prepare(`
        SELECT md.* FROM garden_type_metrics gtm
        JOIN metric_definitions md ON gtm.metric_id = md.id
        WHERE gtm.garden_type_id = ? ORDER BY md.sort_order ASC
      `).all(garden.garden_type_id);
      if (typeMetrics.length) metrics = typeMetrics;
    }

    for (const m of metrics) {
      const val = metricData[m.id];
      if (val == null || m.ideal_min == null || m.ideal_max == null) continue;
      if (val >= m.ideal_min && val <= m.ideal_max) continue;
      const severity = (val >= m.ideal_min * 0.8 && val <= m.ideal_max * 1.2) ? 'warn' : 'bad';
      environmentAlerts.push({
        garden_id: garden.id, garden_name: garden.name,
        metric_name: m.name, value: val, unit: m.unit_metric || '',
        ideal_min: m.ideal_min, ideal_max: m.ideal_max,
        severity, timestamp: latestLog.timestamp
      });
    }
  }

  // Plants needing attention: stale logs + stuck growth stages
  const plantsNeedingAttention = [];
  const stuckThresholds = { seed: 14, germination: 10, seedling: 21 };

  const plantsWithGardens = db.prepare(`
    SELECT p.*, g.name as garden_name, g.id as gid,
      (SELECT MAX(le.timestamp) FROM log_entries le WHERE le.garden_id = g.id) as last_log_time
    FROM plants p
    JOIN gardens g ON p.garden_id = g.id
    WHERE p.is_active = 1 AND g.is_active = 1
  `).all();

  const seen = new Set();
  for (const p of plantsWithGardens) {
    // Stale logs: no log entry in 3+ days
    if (p.last_log_time) {
      const daysSince = Math.floor((Date.now() - new Date(p.last_log_time).getTime()) / 86400000);
      if (daysSince >= 3 && !seen.has(p.id)) {
        seen.add(p.id);
        plantsNeedingAttention.push({
          plant_id: p.id, plant_name: p.name, species: p.species,
          garden_id: p.gid, garden_name: p.garden_name,
          current_stage: p.current_stage, reason_type: 'stale_log',
          reason: `No log entries for ${daysSince} days`
        });
      }
    }
    // Stuck growth stages
    const threshold = stuckThresholds[p.current_stage];
    if (threshold) {
      const stageStart = p.seeded_date || p.created_at;
      const daysInStage = Math.floor((Date.now() - new Date(stageStart).getTime()) / 86400000);
      if (daysInStage >= threshold && !seen.has(p.id)) {
        seen.add(p.id);
        plantsNeedingAttention.push({
          plant_id: p.id, plant_name: p.name, species: p.species,
          garden_id: p.gid, garden_name: p.garden_name,
          current_stage: p.current_stage, reason_type: 'stuck_stage',
          reason: `In ${p.current_stage} stage for ${daysInStage} days`
        });
      }
    }
  }

  res.json({
    total_plants: totalPlants.count,
    total_active_tasks: totalTasks.count,
    total_logs: totalLogs.count,
    total_gardens: totalGardens.count,
    upcoming_tasks: upcomingTasks,
    recent_activity: recentActivity,
    environment_alerts: environmentAlerts,
    plants_needing_attention: plantsNeedingAttention.slice(0, 10),
  });
});

// === Audit Log API ===
app.get('/api/audit', (req, res) => {
  const limit = V.int(req.query.limit, 1, 500) || 50;
  const offset = V.int(req.query.offset, 0, 100000) || 0;
  const logs = getAuditLogs(limit, offset);
  res.json(logs);
});

// === CSV Export ===
app.get('/api/export/logs/:gardenId', requireAuth, (req, res) => {
  if (!V.isUUID(req.params.gardenId)) return res.status(400).json({ error: 'Invalid ID' });

  const logs = db.prepare('SELECT * FROM log_entries WHERE garden_id=? ORDER BY timestamp DESC').all(req.params.gardenId);
  const garden = db.prepare('SELECT name FROM gardens WHERE id=?').get(req.params.gardenId);

  const headers = ['Date', 'pH', 'PPM', 'Water Temp', 'Nutrients', 'Notes'];
  const rows = logs.map(l => [
    l.timestamp,
    l.ph ?? '',
    l.ppm ?? '',
    l.water_temp ?? '',
    `"${(l.nutrients || '').replace(/"/g, '""')}"`,
    `"${(l.notes || '').replace(/"/g, '""')}"`
  ]);

  const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', `attachment; filename="${(garden?.name || 'logs').replace(/[^a-zA-Z0-9]/g, '_')}_logs.csv"`);
  res.send(csv);
});

app.get('/api/export/plants/:gardenId', requireAuth, (req, res) => {
  if (!V.isUUID(req.params.gardenId)) return res.status(400).json({ error: 'Invalid ID' });

  const plants = db.prepare('SELECT * FROM plants WHERE garden_id=? ORDER BY created_at DESC').all(req.params.gardenId);
  const garden = db.prepare('SELECT name FROM gardens WHERE id=?').get(req.params.gardenId);

  const headers = ['Name', 'Type', 'Species', 'Stage', 'Seeded', 'Transplanted', 'Harvest Date', 'Yield', 'Active', 'Notes'];
  const rows = plants.map(p => [
    `"${(p.name || '').replace(/"/g, '""')}"`,
    p.plant_type,
    `"${(p.species || '').replace(/"/g, '""')}"`,
    p.current_stage,
    p.seeded_date || '',
    p.transplanted_date || '',
    p.harvest_date || '',
    p.yield_amount ?? '',
    p.is_active ? 'Yes' : 'No',
    `"${(p.notes || '').replace(/"/g, '""')}"`
  ]);

  const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', `attachment; filename="${(garden?.name || 'plants').replace(/[^a-zA-Z0-9]/g, '_')}_plants.csv"`);
  res.send(csv);
});

// === Devices API (admin) ===
app.get('/api/devices', requireAuth, requireAdmin, (req, res) => {
  res.json(listDevices());
});

app.post('/api/devices', requireAuth, requireAdmin, (req, res) => {
  const name = V.reqStr(req.body.name, 100);
  if (!name) return res.status(400).json({ error: 'Device name is required' });

  const gardenId = req.body.garden_id && V.isUUID(req.body.garden_id) ? req.body.garden_id : null;
  const deviceType = V.enumVal(req.body.device_type, ['sensor', 'controller', 'gateway']) || 'sensor';
  const description = V.str(req.body.description, 500);

  const device = createDevice(name, gardenId, deviceType, description);
  logAudit(req.user, 'create', 'device', device.id, `Created device "${name}"`, getClientIP(req));
  res.status(201).json(device);
});

app.get('/api/devices/:id', requireAuth, requireAdmin, (req, res) => {
  if (!V.isUUID(req.params.id)) return res.status(400).json({ error: 'Invalid ID' });
  const device = getDevice(req.params.id);
  if (!device) return res.status(404).json({ error: 'Not found' });
  res.json(device);
});

app.put('/api/devices/:id', requireAuth, requireAdmin, (req, res) => {
  if (!V.isUUID(req.params.id)) return res.status(400).json({ error: 'Invalid ID' });
  const name = V.reqStr(req.body.name, 100);
  if (!name) return res.status(400).json({ error: 'Device name is required' });

  const gardenId = req.body.garden_id && V.isUUID(req.body.garden_id) ? req.body.garden_id : null;
  const deviceType = V.enumVal(req.body.device_type, ['sensor', 'controller', 'gateway']) || 'sensor';
  const description = V.str(req.body.description, 500);
  const isActive = req.body.is_active !== false;

  updateDevice(req.params.id, name, gardenId, deviceType, description, isActive);
  logAudit(req.user, 'update', 'device', req.params.id, `Updated device "${name}"`, getClientIP(req));
  res.json({ success: true });
});

app.delete('/api/devices/:id', requireAuth, requireAdmin, (req, res) => {
  if (!V.isUUID(req.params.id)) return res.status(400).json({ error: 'Invalid ID' });
  const device = getDevice(req.params.id);
  deleteDevice(req.params.id);
  logAudit(req.user, 'delete', 'device', req.params.id, `Deleted device "${device?.name || 'unknown'}"`, getClientIP(req));
  res.json({ success: true });
});

// === Device API Keys ===
app.get('/api/devices/:id/keys', requireAuth, requireAdmin, (req, res) => {
  if (!V.isUUID(req.params.id)) return res.status(400).json({ error: 'Invalid ID' });
  res.json(listApiKeys(req.params.id));
});

app.post('/api/devices/:id/keys', requireAuth, requireAdmin, (req, res) => {
  if (!V.isUUID(req.params.id)) return res.status(400).json({ error: 'Invalid ID' });
  const device = getDevice(req.params.id);
  if (!device) return res.status(404).json({ error: 'Device not found' });

  const label = V.str(req.body.label, 100) || 'default';
  const key = createApiKey(req.params.id, label);
  logAudit(req.user, 'create', 'api_key', key.id, `Created API key for device "${device.name}"`, getClientIP(req));
  res.status(201).json(key);
});

app.delete('/api/devices/:id/keys/:keyId', requireAuth, requireAdmin, (req, res) => {
  if (!V.isUUID(req.params.id) || !V.isUUID(req.params.keyId)) return res.status(400).json({ error: 'Invalid ID' });
  deleteApiKey(req.params.keyId);
  logAudit(req.user, 'delete', 'api_key', req.params.keyId, `Deleted API key`, getClientIP(req));
  res.json({ success: true });
});

// === Sensor Data Ingestion (API-key authenticated) ===
app.post('/api/sensor/readings', sensorLimiter, (req, res) => {
  const apiKey = req.headers['x-api-key'];
  const auth = authenticateApiKey(apiKey);
  if (!auth) return res.status(401).json({ error: 'Invalid or inactive API key' });

  const readings = Array.isArray(req.body.readings) ? req.body.readings : (req.body.metric_id ? [req.body] : []);
  if (readings.length === 0) return res.status(400).json({ error: 'No readings provided' });
  if (readings.length > 100) return res.status(400).json({ error: 'Max 100 readings per batch' });

  const results = [];
  for (const r of readings) {
    const metricId = V.reqStr(r.metric_id, 100);
    const value = V.num(r.value, -1e9, 1e9);
    const recordedAt = V.isoDate(r.recorded_at);
    if (!metricId || value == null) continue;

    const reading = createSensorReading(auth.device_id, metricId, value, recordedAt);
    results.push(reading);
  }

  // Fire webhook asynchronously
  if (results.length > 0) {
    fireWebhook('sensor_reading', { device_id: auth.device_id, device_name: auth.device_name, readings: results }).catch(() => {});
  }

  res.status(201).json({ accepted: results.length, readings: results });
});

app.get('/api/sensor/readings/:deviceId', requireAuth, (req, res) => {
  if (!V.isUUID(req.params.deviceId)) return res.status(400).json({ error: 'Invalid ID' });
  const limit = V.int(req.query.limit, 1, 1000) || 100;
  const offset = V.int(req.query.offset, 0, 100000) || 0;
  const metricId = V.str(req.query.metric_id, 100);
  res.json(getSensorReadings(req.params.deviceId, limit, offset, metricId));
});

// === Webhooks API (admin) ===
app.get('/api/webhooks', requireAuth, requireAdmin, (req, res) => {
  res.json(listWebhooks());
});

app.post('/api/webhooks', requireAuth, requireAdmin, (req, res) => {
  const name = V.reqStr(req.body.name, 100);
  const url = V.reqStr(req.body.url, 2000);
  if (!name || !url) return res.status(400).json({ error: 'Name and URL are required' });

  try { new URL(url); } catch { return res.status(400).json({ error: 'Invalid URL' }); }

  const secret = V.str(req.body.secret, 200);
  const events = Array.isArray(req.body.events) ? req.body.events : [];
  const retryCount = V.int(req.body.retry_count, 0, 10) || 3;

  const webhook = createWebhook(name, url, secret, events, retryCount);
  logAudit(req.user, 'create', 'webhook', webhook.id, `Created webhook "${name}"`, getClientIP(req));
  res.status(201).json(webhook);
});

app.put('/api/webhooks/:id', requireAuth, requireAdmin, (req, res) => {
  if (!V.isUUID(req.params.id)) return res.status(400).json({ error: 'Invalid ID' });
  const name = V.reqStr(req.body.name, 100);
  const url = V.reqStr(req.body.url, 2000);
  if (!name || !url) return res.status(400).json({ error: 'Invalid input' });

  try { new URL(url); } catch { return res.status(400).json({ error: 'Invalid URL' }); }

  const secret = V.str(req.body.secret, 200);
  const events = Array.isArray(req.body.events) ? req.body.events : [];
  const isActive = req.body.is_active !== false;
  const retryCount = V.int(req.body.retry_count, 0, 10) || 3;

  updateWebhook(req.params.id, name, url, secret, events, isActive, retryCount);
  logAudit(req.user, 'update', 'webhook', req.params.id, `Updated webhook "${name}"`, getClientIP(req));
  res.json({ success: true });
});

app.delete('/api/webhooks/:id', requireAuth, requireAdmin, (req, res) => {
  if (!V.isUUID(req.params.id)) return res.status(400).json({ error: 'Invalid ID' });
  const wh = getWebhook(req.params.id);
  deleteWebhook(req.params.id);
  logAudit(req.user, 'delete', 'webhook', req.params.id, `Deleted webhook "${wh?.name || 'unknown'}"`, getClientIP(req));
  res.json({ success: true });
});

app.get('/api/webhooks/:id/logs', requireAuth, requireAdmin, (req, res) => {
  if (!V.isUUID(req.params.id)) return res.status(400).json({ error: 'Invalid ID' });
  const limit = V.int(req.query.limit, 1, 500) || 50;
  res.json(getWebhookLogs(req.params.id, limit));
});

app.post('/api/webhooks/:id/test', requireAuth, requireAdmin, async (req, res) => {
  if (!V.isUUID(req.params.id)) return res.status(400).json({ error: 'Invalid ID' });
  const wh = getWebhook(req.params.id);
  if (!wh) return res.status(404).json({ error: 'Not found' });

  const testPayload = { event: 'test', webhook_id: wh.id, timestamp: new Date().toISOString(), message: 'Test webhook from CultiVue' };

  try {
    const headers = { 'Content-Type': 'application/json', 'X-Webhook-Event': 'test' };
    if (wh.secret) {
      const crypto = require('crypto');
      const sig = crypto.createHmac('sha256', wh.secret).update(JSON.stringify(testPayload)).digest('hex');
      headers['X-Webhook-Signature'] = `sha256=${sig}`;
    }
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);
    const response = await fetch(wh.url, { method: 'POST', headers, body: JSON.stringify(testPayload), signal: controller.signal });
    clearTimeout(timeout);
    const body = await response.text().catch(() => '');
    res.json({ success: response.ok, status: response.status, body: body.slice(0, 500) });
  } catch (err) {
    res.json({ success: false, status: 0, body: err.message });
  }
});

// === Planting Calendar API ===
app.get('/api/planting-calendar', requireAuth, (req, res) => {
  const settings = getAllSettings();
  const zone = parseInt(req.query.zone, 10) || parseInt(settings.usda_zone, 10) || 7;
  const zoneGroup = zone <= 4 ? 'cold' : zone <= 7 ? 'temperate' : 'warm';

  try {
    const rows = db.prepare(
      'SELECT * FROM planting_index WHERE zone_group = ? ORDER BY category, name'
    ).all(zoneGroup);
    res.json({ zone, zone_group: zoneGroup, crops: rows });
  } catch {
    res.json({ zone, zone_group: zoneGroup, crops: [] });
  }
});

app.get('/api/planting-calendar/month/:month', requireAuth, (req, res) => {
  const month = V.int(req.params.month, 1, 12);
  if (!month) return res.status(400).json({ error: 'Invalid month (1-12)' });

  const settings = getAllSettings();
  const zone = parseInt(settings.usda_zone, 10) || 7;
  const zoneGroup = zone <= 4 ? 'cold' : zone <= 7 ? 'temperate' : 'warm';

  try {
    const rows = db.prepare(`
      SELECT * FROM planting_index WHERE zone_group = ? AND (
        (sow_indoor_start IS NOT NULL AND ? BETWEEN sow_indoor_start AND sow_indoor_end) OR
        (sow_outdoor_start IS NOT NULL AND ? BETWEEN sow_outdoor_start AND sow_outdoor_end) OR
        (transplant_start IS NOT NULL AND ? BETWEEN transplant_start AND transplant_end) OR
        (harvest_start IS NOT NULL AND ? BETWEEN harvest_start AND harvest_end)
      ) ORDER BY category, name
    `).all(zoneGroup, month, month, month, month);
    res.json({ zone, zone_group: zoneGroup, month, crops: rows });
  } catch {
    res.json({ zone, zone_group: zoneGroup, month, crops: [] });
  }
});

// === Planting Calendar CRUD + Search + Perenual Proxy ===

// In-memory cache for Perenual API responses (max 100 entries, 15 min TTL)
const perenualCache = new Map();
function getCached(key) {
  const entry = perenualCache.get(key);
  if (!entry) return null;
  if (Date.now() - entry.ts > 15 * 60 * 1000) { perenualCache.delete(key); return null; }
  return entry.data;
}
function setCache(key, data) {
  if (perenualCache.size >= 100) {
    const oldest = perenualCache.keys().next().value;
    perenualCache.delete(oldest);
  }
  perenualCache.set(key, { data, ts: Date.now() });
}

// 1a. Internal search
app.get('/api/planting-calendar/search', requireAuth, (req, res) => {
  const q = V.str(req.query.q, 100);
  if (!q || q.length < 2) return res.status(400).json({ error: 'Query must be at least 2 characters' });

  const rows = db.prepare(
    'SELECT * FROM planting_index WHERE name LIKE ? ORDER BY name, zone_group'
  ).all(`%${q}%`);

  const grouped = {};
  for (const row of rows) {
    if (!grouped[row.name]) grouped[row.name] = { name: row.name, category: row.category, zones: {} };
    grouped[row.name].zones[row.zone_group] = row;
  }
  res.json({ results: Object.values(grouped) });
});

// 1b. Perenual API proxy — search
app.get('/api/planting-calendar/lookup', requireAuth, async (req, res) => {
  const q = V.str(req.query.q, 100);
  if (!q || q.length < 2) return res.status(400).json({ error: 'Query must be at least 2 characters' });

  const apiKey = getSetting('perenual_api_key');
  if (!apiKey) return res.status(400).json({ error: 'Perenual API key not configured. Add it in Settings → Integrations.' });

  const cacheKey = `search:${q.toLowerCase()}`;
  const cached = getCached(cacheKey);
  if (cached) return res.json(cached);

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);
    const url = `https://perenual.com/api/v2/species-list?key=${encodeURIComponent(apiKey)}&q=${encodeURIComponent(q)}`;
    const response = await fetch(url, { signal: controller.signal });
    clearTimeout(timeout);

    if (!response.ok) {
      const text = await response.text().catch(() => '');
      return res.status(502).json({ error: `Perenual API error: ${response.status}`, detail: text.slice(0, 200) });
    }

    const body = await response.json();
    const results = (body.data || []).slice(0, 10).map(item => ({
      id: item.id,
      common_name: item.common_name,
      scientific_name: Array.isArray(item.scientific_name) ? item.scientific_name[0] : item.scientific_name,
      cycle: item.cycle,
      watering: item.watering,
      sunlight: Array.isArray(item.sunlight) ? item.sunlight.join(', ') : item.sunlight,
      hardiness_min: item.hardiness ? item.hardiness.min : null,
      hardiness_max: item.hardiness ? item.hardiness.max : null,
    }));

    const result = { results };
    setCache(cacheKey, result);
    res.json(result);
  } catch (err) {
    if (err.name === 'AbortError') return res.status(504).json({ error: 'Perenual API timeout' });
    console.error('Perenual search error:', err);
    res.status(502).json({ error: 'Failed to reach Perenual API' });
  }
});

// 1c. Perenual details
app.get('/api/planting-calendar/lookup/:id', requireAuth, async (req, res) => {
  const id = parseInt(req.params.id, 10);
  if (!id || id < 1) return res.status(400).json({ error: 'Invalid ID' });

  const apiKey = getSetting('perenual_api_key');
  if (!apiKey) return res.status(400).json({ error: 'Perenual API key not configured' });

  const cacheKey = `detail:${id}`;
  const cached = getCached(cacheKey);
  if (cached) return res.json(cached);

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);
    const url = `https://perenual.com/api/v2/species/details/${id}?key=${encodeURIComponent(apiKey)}`;
    const response = await fetch(url, { signal: controller.signal });
    clearTimeout(timeout);

    if (!response.ok) return res.status(502).json({ error: `Perenual API error: ${response.status}` });

    const item = await response.json();
    const result = {
      common_name: item.common_name,
      scientific_name: Array.isArray(item.scientific_name) ? item.scientific_name[0] : item.scientific_name,
      cycle: item.cycle,
      growth_rate: item.growth_rate,
      care_level: item.care_level,
      harvest_season: item.harvest_season,
      flowering_season: item.flowering_season,
      fruiting_season: item.fruiting_season,
      propagation: Array.isArray(item.propagation) ? item.propagation.join(', ') : item.propagation,
      description: item.description,
      hardiness_min: item.hardiness ? item.hardiness.min : null,
      hardiness_max: item.hardiness ? item.hardiness.max : null,
      watering: item.watering,
      sunlight: Array.isArray(item.sunlight) ? item.sunlight.join(', ') : item.sunlight,
    };
    setCache(cacheKey, result);
    res.json(result);
  } catch (err) {
    if (err.name === 'AbortError') return res.status(504).json({ error: 'Perenual API timeout' });
    console.error('Perenual detail error:', err);
    res.status(502).json({ error: 'Failed to reach Perenual API' });
  }
});

// 1d. Create crop
app.post('/api/planting-calendar', requireAuth, (req, res) => {
  const CATEGORIES = ['vegetable', 'herb', 'fruit', 'flower'];
  const ZONE_GROUPS = ['cold', 'temperate', 'warm'];

  // If all_zones array is provided, batch-insert multiple zone group rows
  const allZones = Array.isArray(req.body.all_zones) ? req.body.all_zones : [req.body];

  const inserted = [];
  const txn = db.transaction(() => {
    for (const z of allZones) {
      const name = V.reqStr(z.name, 100);
      if (!name) throw new Error('Crop name is required');
      const category = V.enumVal(z.category, CATEGORIES);
      if (!category) throw new Error('Valid category is required');
      const zone_group = V.enumVal(z.zone_group, ZONE_GROUPS);
      if (!zone_group) throw new Error('Valid zone group is required');

      const id = uuidv4();
      const sow_indoor_start = V.int(z.sow_indoor_start, 1, 12) || null;
      const sow_indoor_end = V.int(z.sow_indoor_end, 1, 12) || null;
      const sow_outdoor_start = V.int(z.sow_outdoor_start, 1, 12) || null;
      const sow_outdoor_end = V.int(z.sow_outdoor_end, 1, 12) || null;
      const transplant_start = V.int(z.transplant_start, 1, 12) || null;
      const transplant_end = V.int(z.transplant_end, 1, 12) || null;
      const harvest_start = V.int(z.harvest_start, 1, 12) || null;
      const harvest_end = V.int(z.harvest_end, 1, 12) || null;
      const days_to_maturity_min = V.int(z.days_to_maturity_min, 0, 9999) || null;
      const days_to_maturity_max = V.int(z.days_to_maturity_max, 0, 9999) || null;
      const notes = V.str(z.notes, 2000) || null;

      db.prepare(`INSERT INTO planting_index (id, name, category, zone_group, sow_indoor_start, sow_indoor_end, sow_outdoor_start, sow_outdoor_end, transplant_start, transplant_end, harvest_start, harvest_end, days_to_maturity_min, days_to_maturity_max, notes) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
        .run(id, name, category, zone_group, sow_indoor_start, sow_indoor_end, sow_outdoor_start, sow_outdoor_end, transplant_start, transplant_end, harvest_start, harvest_end, days_to_maturity_min, days_to_maturity_max, notes);

      inserted.push({ id, name, category, zone_group });
    }
  });

  try {
    txn();
    logAudit(req.user, 'create', 'planting_crop', inserted[0]?.id, `Created crop "${inserted[0]?.name}" (${inserted.length} zone(s))`, getClientIP(req));
    res.status(201).json({ success: true, crops: inserted });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// 1e. Get single crop by name (all zone groups)
app.get('/api/planting-calendar/crop/:name', requireAuth, (req, res) => {
  const name = decodeURIComponent(req.params.name);
  const rows = db.prepare('SELECT * FROM planting_index WHERE name = ? ORDER BY zone_group').all(name);
  if (!rows.length) return res.status(404).json({ error: 'Crop not found' });

  const zones = {};
  for (const row of rows) zones[row.zone_group] = row;
  res.json({ name: rows[0].name, category: rows[0].category, zones });
});

// 1f. Update crop
app.put('/api/planting-calendar/:id', requireAuth, (req, res) => {
  const CATEGORIES = ['vegetable', 'herb', 'fruit', 'flower'];

  const existing = db.prepare('SELECT * FROM planting_index WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'Crop not found' });

  const name = V.reqStr(req.body.name, 100);
  if (!name) return res.status(400).json({ error: 'Crop name is required' });
  const category = V.enumVal(req.body.category, CATEGORIES);
  if (!category) return res.status(400).json({ error: 'Valid category is required' });

  const sow_indoor_start = V.int(req.body.sow_indoor_start, 1, 12) || null;
  const sow_indoor_end = V.int(req.body.sow_indoor_end, 1, 12) || null;
  const sow_outdoor_start = V.int(req.body.sow_outdoor_start, 1, 12) || null;
  const sow_outdoor_end = V.int(req.body.sow_outdoor_end, 1, 12) || null;
  const transplant_start = V.int(req.body.transplant_start, 1, 12) || null;
  const transplant_end = V.int(req.body.transplant_end, 1, 12) || null;
  const harvest_start = V.int(req.body.harvest_start, 1, 12) || null;
  const harvest_end = V.int(req.body.harvest_end, 1, 12) || null;
  const days_to_maturity_min = V.int(req.body.days_to_maturity_min, 0, 9999) || null;
  const days_to_maturity_max = V.int(req.body.days_to_maturity_max, 0, 9999) || null;
  const notes = V.str(req.body.notes, 2000) || null;

  db.prepare(`UPDATE planting_index SET name=?, category=?, sow_indoor_start=?, sow_indoor_end=?, sow_outdoor_start=?, sow_outdoor_end=?, transplant_start=?, transplant_end=?, harvest_start=?, harvest_end=?, days_to_maturity_min=?, days_to_maturity_max=?, notes=? WHERE id=?`)
    .run(name, category, sow_indoor_start, sow_indoor_end, sow_outdoor_start, sow_outdoor_end, transplant_start, transplant_end, harvest_start, harvest_end, days_to_maturity_min, days_to_maturity_max, notes, req.params.id);

  logAudit(req.user, 'update', 'planting_crop', req.params.id, `Updated crop "${name}"`, getClientIP(req));
  res.json({ success: true });
});

// 1g. Delete crop
app.delete('/api/planting-calendar/:id', requireAuth, (req, res) => {
  const existing = db.prepare('SELECT * FROM planting_index WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'Crop not found' });

  if (req.query.all === 'true') {
    db.prepare('DELETE FROM planting_index WHERE name = ?').run(existing.name);
    logAudit(req.user, 'delete', 'planting_crop', req.params.id, `Deleted all zones for crop "${existing.name}"`, getClientIP(req));
  } else {
    db.prepare('DELETE FROM planting_index WHERE id = ?').run(req.params.id);
    logAudit(req.user, 'delete', 'planting_crop', req.params.id, `Deleted crop "${existing.name}" (${existing.zone_group})`, getClientIP(req));
  }
  res.json({ success: true });
});

// SPA fallback
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'public', 'index.html'));
});

const PORT = process.env.PORT || 3000;
if (require.main === module) {
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`CultiVue running on http://localhost:${PORT}`);
  });
}

module.exports = app;
