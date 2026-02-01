'use strict';

const db = require('./database');

function getSetting(key) {
  const row = db.prepare('SELECT value, type FROM app_settings WHERE key = ?').get(key);
  if (!row) return null;
  if (row.type === 'boolean') return row.value === 'true';
  if (row.type === 'number') return Number(row.value);
  if (row.type === 'json') { try { return JSON.parse(row.value); } catch { return row.value; } }
  return row.value;
}

function setSetting(key, value, type = 'string') {
  const strValue = type === 'json' ? JSON.stringify(value) : String(value);
  db.prepare(
    'INSERT INTO app_settings (key, value, type, updated_at) VALUES (?, ?, ?, ?) ON CONFLICT(key) DO UPDATE SET value=excluded.value, type=excluded.type, updated_at=excluded.updated_at'
  ).run(key, strValue, type, new Date().toISOString());
}

function getAllSettings() {
  const rows = db.prepare('SELECT key, value, type FROM app_settings').all();
  const result = {};
  for (const row of rows) {
    if (row.type === 'boolean') result[row.key] = row.value === 'true';
    else if (row.type === 'number') result[row.key] = Number(row.value);
    else if (row.type === 'json') { try { result[row.key] = JSON.parse(row.value); } catch { result[row.key] = row.value; } }
    else result[row.key] = row.value;
  }
  return result;
}

function isSetupCompleted() {
  return getSetting('setup_completed') === true;
}

module.exports = { getSetting, setSetting, getAllSettings, isSetupCompleted };
