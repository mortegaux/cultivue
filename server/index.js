const express = require('express');
const path = require('path');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const cookieParser = require('cookie-parser');
const db = require('./database');
const {
  hasUsers, setupAdmin, createUser, loginUser, changePassword,
  requireAuth, requireAdmin, destroySession,
  listUsers, setUserActive, resetUserPassword
} = require('./auth');
const { logAudit, getAuditLogs } = require('./audit');
const V = require('./validate');
const { v4: uuidv4 } = require('uuid');

const app = express();

// === Security Headers ===
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'", "https://cdn.jsdelivr.net"],
      scriptSrcAttr: ["'unsafe-inline'"],
      connectSrc: ["'self'", "https://cdn.jsdelivr.net"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:"],
      fontSrc: ["'self'"],
      objectSrc: ["'none'"],
      frameAncestors: ["'none'"],
    }
  },
  crossOriginEmbedderPolicy: false,
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
  max: 120,
  message: { error: 'Rate limit exceeded.' },
  standardHeaders: true,
  legacyHeaders: false,
});

// === Middleware ===
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
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    path: '/',
    expires,
  };
}

// === Auth Routes ===

// Check if setup is needed (no users yet)
app.get('/api/auth/status', (req, res) => {
  res.json({ needs_setup: !hasUsers() });
});

// Initial admin setup (only works once, when no users exist)
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

    // Auto-login the new admin
    const loginResult = await loginUser(username, password);
    if (loginResult.error) return res.status(500).json({ error: 'Setup succeeded but login failed' });

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

    const result = await loginUser(username, password);
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

// === Static files ===
app.use(express.static(path.join(__dirname, '..', 'public')));

// === All data API routes require authentication ===
app.use('/api/gardens', apiLimiter, requireAuth);
app.use('/api/logs', apiLimiter, requireAuth);
app.use('/api/tasks', apiLimiter, requireAuth);
app.use('/api/plants', apiLimiter, requireAuth);
app.use('/api/audit', apiLimiter, requireAuth);

// === Gardens API ===
app.get('/api/gardens', (req, res) => {
  const gardens = db.prepare('SELECT * FROM gardens ORDER BY start_date DESC').all();
  res.json(gardens.map(g => ({ ...g, is_active: !!g.is_active, plant_types: g.plant_types.split(',') })));
});

app.post('/api/gardens', (req, res) => {
  const name = V.reqStr(req.body.name, 100);
  const system_type = V.enumVal(req.body.system_type, V.SYSTEM_TYPES);
  const plant_types = V.enumArray(req.body.plant_types, V.PLANT_TYPES);
  const start_date = V.isoDate(req.body.start_date) || new Date().toISOString();

  if (!name || !system_type || !plant_types) {
    return res.status(400).json({ error: 'Invalid input: name, system_type, and plant_types are required' });
  }

  const id = uuidv4();
  db.prepare('INSERT INTO gardens (id, name, system_type, plant_types, start_date) VALUES (?, ?, ?, ?, ?)')
    .run(id, name, system_type, plant_types.join(','), start_date);

  logAudit(req.user, 'create', 'garden', id, `Created garden "${name}"`, getClientIP(req));
  res.status(201).json({ id, name, system_type, plant_types, start_date, is_active: true });
});

app.put('/api/gardens/:id', (req, res) => {
  if (!V.isUUID(req.params.id)) return res.status(400).json({ error: 'Invalid ID' });

  const name = V.reqStr(req.body.name, 100);
  const system_type = V.enumVal(req.body.system_type, V.SYSTEM_TYPES);
  const plant_types = V.enumArray(req.body.plant_types, V.PLANT_TYPES);
  const is_active = req.body.is_active ? 1 : 0;

  if (!name || !system_type || !plant_types) {
    return res.status(400).json({ error: 'Invalid input' });
  }

  db.prepare('UPDATE gardens SET name=?, system_type=?, plant_types=?, is_active=? WHERE id=?')
    .run(name, system_type, plant_types.join(','), is_active, req.params.id);

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

  const limit = V.int(req.query.limit, 1, 1000) || 100;
  const logs = db.prepare('SELECT * FROM log_entries WHERE garden_id=? ORDER BY timestamp DESC LIMIT ?')
    .all(req.params.gardenId, limit);
  res.json(logs);
});

app.post('/api/gardens/:gardenId/logs', (req, res) => {
  if (!V.isUUID(req.params.gardenId)) return res.status(400).json({ error: 'Invalid ID' });

  const ph = V.num(req.body.ph, 0, 14);
  const ppm = V.int(req.body.ppm, 0, 100000);
  const water_temp = V.num(req.body.water_temp, -10, 60);
  const nutrients = V.str(req.body.nutrients, 500);
  const notes = V.str(req.body.notes, 2000);

  const id = uuidv4();
  const timestamp = new Date().toISOString();
  db.prepare('INSERT INTO log_entries (id, garden_id, timestamp, ph, ppm, water_temp, nutrients, notes) VALUES (?, ?, ?, ?, ?, ?, ?, ?)')
    .run(id, req.params.gardenId, timestamp, ph, ppm, water_temp, nutrients, notes);

  logAudit(req.user, 'create', 'log_entry', id, `pH:${ph ?? '-'} PPM:${ppm ?? '-'} Temp:${water_temp ?? '-'}`, getClientIP(req));
  res.status(201).json({ id, garden_id: req.params.gardenId, timestamp, ph, ppm, water_temp, nutrients, notes });
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
    db.prepare('INSERT INTO tasks (id, garden_id, title, description, due_date, priority, is_recurring, recurring_days) VALUES (?, ?, ?, ?, ?, ?, ?, ?)')
      .run(newId, task.garden_id, task.title, task.description, nextDue.toISOString(), task.priority, 1, task.recurring_days);
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

  if (!name || !plant_type || !species) {
    return res.status(400).json({ error: 'Name, plant type, and species are required' });
  }

  const id = uuidv4();
  const created_at = new Date().toISOString();
  db.prepare('INSERT INTO plants (id, garden_id, name, plant_type, species, seeded_date, current_stage, notes, created_at, initial_ph, initial_ppm) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)')
    .run(id, req.params.gardenId, name, plant_type, species, seeded_date, current_stage, notes, created_at, initial_ph, initial_ppm);

  logAudit(req.user, 'create', 'plant', id, `Added plant "${name}" (${species})`, getClientIP(req));
  res.status(201).json({ id, garden_id: req.params.gardenId, name, plant_type, species, seeded_date, current_stage, notes, created_at, is_active: true, initial_ph, initial_ppm });
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

  if (!name || !plant_type || !species) {
    return res.status(400).json({ error: 'Invalid input' });
  }

  db.prepare(`UPDATE plants SET name=?, plant_type=?, species=?, seeded_date=?, transplanted_date=?, current_stage=?, notes=?, harvest_date=?, yield_amount=?, is_active=?, initial_ph=?, initial_ppm=? WHERE id=?`)
    .run(name, plant_type, species, seeded_date, transplanted_date, current_stage, notes, harvest_date, yield_amount, is_active, initial_ph, initial_ppm, req.params.id);

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
app.get('/api/gardens/:gardenId/stats', requireAuth, apiLimiter, (req, res) => {
  if (!V.isUUID(req.params.gardenId)) return res.status(400).json({ error: 'Invalid ID' });

  const gardenId = req.params.gardenId;
  const activePlants = db.prepare('SELECT COUNT(*) as count FROM plants WHERE garden_id=? AND is_active=1').get(gardenId);
  const activeTasks = db.prepare('SELECT COUNT(*) as count FROM tasks WHERE garden_id=? AND is_completed=0').get(gardenId);
  const latestLog = db.prepare('SELECT * FROM log_entries WHERE garden_id=? ORDER BY timestamp DESC LIMIT 1').get(gardenId);
  const totalLogs = db.prepare('SELECT COUNT(*) as count FROM log_entries WHERE garden_id=?').get(gardenId);
  res.json({
    active_plants: activePlants.count,
    active_tasks: activeTasks.count,
    total_logs: totalLogs.count,
    latest_log: latestLog || null
  });
});

// === Audit Log API ===
app.get('/api/audit', (req, res) => {
  const limit = V.int(req.query.limit, 1, 500) || 50;
  const offset = V.int(req.query.offset, 0, 100000) || 0;
  const logs = getAuditLogs(limit, offset);
  res.json(logs);
});

// SPA fallback
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'public', 'index.html'));
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`HydroMate running on http://localhost:${PORT}`);
});
