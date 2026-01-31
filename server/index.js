const express = require('express');
const path = require('path');
const db = require('./database');
const { v4: uuidv4 } = require('uuid');

const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname, '..', 'public')));

// --- Gardens API ---
app.get('/api/gardens', (req, res) => {
  const gardens = db.prepare('SELECT * FROM gardens ORDER BY start_date DESC').all();
  res.json(gardens.map(g => ({ ...g, is_active: !!g.is_active, plant_types: g.plant_types.split(',') })));
});

app.post('/api/gardens', (req, res) => {
  const { name, system_type, plant_types, start_date } = req.body;
  const id = uuidv4();
  db.prepare('INSERT INTO gardens (id, name, system_type, plant_types, start_date) VALUES (?, ?, ?, ?, ?)')
    .run(id, name, system_type, plant_types.join(','), start_date || new Date().toISOString());
  res.status(201).json({ id, name, system_type, plant_types, start_date, is_active: true });
});

app.put('/api/gardens/:id', (req, res) => {
  const { name, system_type, plant_types, is_active } = req.body;
  db.prepare('UPDATE gardens SET name=?, system_type=?, plant_types=?, is_active=? WHERE id=?')
    .run(name, system_type, plant_types.join(','), is_active ? 1 : 0, req.params.id);
  res.json({ success: true });
});

app.delete('/api/gardens/:id', (req, res) => {
  db.prepare('DELETE FROM gardens WHERE id=?').run(req.params.id);
  res.json({ success: true });
});

// --- Log Entries API ---
app.get('/api/gardens/:gardenId/logs', (req, res) => {
  const limit = parseInt(req.query.limit) || 100;
  const logs = db.prepare('SELECT * FROM log_entries WHERE garden_id=? ORDER BY timestamp DESC LIMIT ?')
    .all(req.params.gardenId, limit);
  res.json(logs);
});

app.post('/api/gardens/:gardenId/logs', (req, res) => {
  const { ph, ppm, water_temp, nutrients, notes } = req.body;
  const id = uuidv4();
  const timestamp = new Date().toISOString();
  db.prepare('INSERT INTO log_entries (id, garden_id, timestamp, ph, ppm, water_temp, nutrients, notes) VALUES (?, ?, ?, ?, ?, ?, ?, ?)')
    .run(id, req.params.gardenId, timestamp, ph ?? null, ppm ?? null, water_temp ?? null, nutrients ?? null, notes ?? null);
  res.status(201).json({ id, garden_id: req.params.gardenId, timestamp, ph, ppm, water_temp, nutrients, notes });
});

app.delete('/api/logs/:id', (req, res) => {
  db.prepare('DELETE FROM log_entries WHERE id=?').run(req.params.id);
  res.json({ success: true });
});

// --- Tasks API ---
app.get('/api/gardens/:gardenId/tasks', (req, res) => {
  const tasks = db.prepare('SELECT * FROM tasks WHERE garden_id=? ORDER BY due_date ASC')
    .all(req.params.gardenId);
  res.json(tasks.map(t => ({ ...t, is_completed: !!t.is_completed, is_recurring: !!t.is_recurring })));
});

app.post('/api/gardens/:gardenId/tasks', (req, res) => {
  const { title, description, due_date, priority, is_recurring, recurring_days } = req.body;
  const id = uuidv4();
  db.prepare('INSERT INTO tasks (id, garden_id, title, description, due_date, priority, is_recurring, recurring_days) VALUES (?, ?, ?, ?, ?, ?, ?, ?)')
    .run(id, req.params.gardenId, title, description ?? null, due_date, priority || 'medium', is_recurring ? 1 : 0, recurring_days ?? null);
  res.status(201).json({ id, garden_id: req.params.gardenId, title, description, due_date, priority: priority || 'medium', is_completed: false, is_recurring: !!is_recurring, recurring_days });
});

app.put('/api/tasks/:id', (req, res) => {
  const { title, description, due_date, priority, is_completed, is_recurring, recurring_days } = req.body;
  const completed_at = is_completed ? new Date().toISOString() : null;
  db.prepare('UPDATE tasks SET title=?, description=?, due_date=?, priority=?, is_completed=?, completed_at=?, is_recurring=?, recurring_days=? WHERE id=?')
    .run(title, description ?? null, due_date, priority, is_completed ? 1 : 0, completed_at, is_recurring ? 1 : 0, recurring_days ?? null, req.params.id);
  res.json({ success: true });
});

app.patch('/api/tasks/:id/toggle', (req, res) => {
  const task = db.prepare('SELECT * FROM tasks WHERE id=?').get(req.params.id);
  if (!task) return res.status(404).json({ error: 'Not found' });
  const newCompleted = task.is_completed ? 0 : 1;
  const completed_at = newCompleted ? new Date().toISOString() : null;
  db.prepare('UPDATE tasks SET is_completed=?, completed_at=? WHERE id=?')
    .run(newCompleted, completed_at, req.params.id);

  // If recurring and being completed, create next task
  if (newCompleted && task.is_recurring && task.recurring_days) {
    const nextDue = new Date(task.due_date);
    nextDue.setDate(nextDue.getDate() + task.recurring_days);
    const newId = uuidv4();
    db.prepare('INSERT INTO tasks (id, garden_id, title, description, due_date, priority, is_recurring, recurring_days) VALUES (?, ?, ?, ?, ?, ?, ?, ?)')
      .run(newId, task.garden_id, task.title, task.description, nextDue.toISOString(), task.priority, 1, task.recurring_days);
  }

  res.json({ success: true, is_completed: !!newCompleted });
});

app.delete('/api/tasks/:id', (req, res) => {
  db.prepare('DELETE FROM tasks WHERE id=?').run(req.params.id);
  res.json({ success: true });
});

// --- Plants API ---
app.get('/api/gardens/:gardenId/plants', (req, res) => {
  const plants = db.prepare('SELECT * FROM plants WHERE garden_id=? ORDER BY created_at DESC')
    .all(req.params.gardenId);
  res.json(plants.map(p => ({ ...p, is_active: !!p.is_active })));
});

app.post('/api/gardens/:gardenId/plants', (req, res) => {
  const { name, plant_type, species, seeded_date, current_stage, notes, initial_ph, initial_ppm } = req.body;
  const id = uuidv4();
  const created_at = new Date().toISOString();
  db.prepare('INSERT INTO plants (id, garden_id, name, plant_type, species, seeded_date, current_stage, notes, created_at, initial_ph, initial_ppm) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)')
    .run(id, req.params.gardenId, name, plant_type, species, seeded_date ?? null, current_stage || 'seed', notes ?? null, created_at, initial_ph ?? null, initial_ppm ?? null);
  res.status(201).json({ id, garden_id: req.params.gardenId, name, plant_type, species, seeded_date, current_stage: current_stage || 'seed', notes, created_at, is_active: true, initial_ph, initial_ppm });
});

app.put('/api/plants/:id', (req, res) => {
  const { name, plant_type, species, seeded_date, transplanted_date, current_stage, notes, harvest_date, yield_amount, is_active, initial_ph, initial_ppm } = req.body;
  db.prepare(`UPDATE plants SET name=?, plant_type=?, species=?, seeded_date=?, transplanted_date=?, current_stage=?, notes=?, harvest_date=?, yield_amount=?, is_active=?, initial_ph=?, initial_ppm=? WHERE id=?`)
    .run(name, plant_type, species, seeded_date ?? null, transplanted_date ?? null, current_stage, notes ?? null, harvest_date ?? null, yield_amount ?? null, is_active ? 1 : 0, initial_ph ?? null, initial_ppm ?? null, req.params.id);
  res.json({ success: true });
});

app.delete('/api/plants/:id', (req, res) => {
  db.prepare('DELETE FROM plants WHERE id=?').run(req.params.id);
  res.json({ success: true });
});

// --- Stats API ---
app.get('/api/gardens/:gardenId/stats', (req, res) => {
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

// SPA fallback
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'public', 'index.html'));
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`HydroMate running on http://localhost:${PORT}`);
});
