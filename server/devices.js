'use strict';

const crypto = require('crypto');
const db = require('./database');
const { v4: uuidv4 } = require('uuid');

const API_KEY_BYTES = 32;
const API_KEY_PREFIX_LEN = 8;

function hashApiKey(key) {
  return crypto.createHash('sha256').update(key).digest('hex');
}

function isOnline(lastSeenAt) {
  if (!lastSeenAt) return false;
  const diffMs = Date.now() - new Date(lastSeenAt).getTime();
  return diffMs < 2 * 60 * 60 * 1000; // 2 hours
}

// === Devices ===

function listDevices() {
  return db.prepare('SELECT * FROM devices ORDER BY created_at DESC').all()
    .map(d => ({ ...d, is_active: !!d.is_active, is_online: isOnline(d.last_seen_at) }));
}

function getDevice(id) {
  const d = db.prepare('SELECT * FROM devices WHERE id = ?').get(id);
  if (d) {
    d.is_active = !!d.is_active;
    d.is_online = isOnline(d.last_seen_at);
  }
  return d;
}

function createDevice(name, gardenId, deviceType, description) {
  const id = uuidv4();
  const now = new Date().toISOString();
  db.prepare('INSERT INTO devices (id, name, garden_id, device_type, description, is_active, created_at, updated_at) VALUES (?, ?, ?, ?, ?, 1, ?, ?)')
    .run(id, name, gardenId || null, deviceType || 'sensor', description || null, now, now);
  return { id, name, garden_id: gardenId, device_type: deviceType || 'sensor', description, is_active: true, is_online: false, created_at: now, updated_at: now };
}

function updateDevice(id, name, gardenId, deviceType, description, isActive) {
  const now = new Date().toISOString();
  db.prepare('UPDATE devices SET name=?, garden_id=?, device_type=?, description=?, is_active=?, updated_at=? WHERE id=?')
    .run(name, gardenId || null, deviceType || 'sensor', description || null, isActive ? 1 : 0, now, id);
}

function deleteDevice(id) {
  db.prepare('DELETE FROM devices WHERE id=?').run(id);
}

// === API Keys ===

function createApiKey(deviceId, label) {
  const rawKey = crypto.randomBytes(API_KEY_BYTES).toString('hex');
  const prefix = rawKey.slice(0, API_KEY_PREFIX_LEN);
  const keyHash = hashApiKey(rawKey);
  const id = uuidv4();
  const now = new Date().toISOString();

  db.prepare('INSERT INTO device_api_keys (id, device_id, key_hash, key_prefix, label, is_active, created_at) VALUES (?, ?, ?, ?, ?, 1, ?)')
    .run(id, deviceId, keyHash, prefix, label || 'default', now);

  return { id, key_prefix: prefix, label: label || 'default', raw_key: rawKey, created_at: now };
}

function listApiKeys(deviceId) {
  return db.prepare('SELECT id, device_id, key_prefix, label, is_active, last_used_at, created_at FROM device_api_keys WHERE device_id=? ORDER BY created_at DESC')
    .all(deviceId).map(k => ({ ...k, is_active: !!k.is_active }));
}

function deleteApiKey(keyId) {
  db.prepare('DELETE FROM device_api_keys WHERE id=?').run(keyId);
}

function authenticateApiKey(rawKey) {
  if (!rawKey || typeof rawKey !== 'string') return null;
  const keyHash = hashApiKey(rawKey);
  const row = db.prepare(`
    SELECT k.*, d.id as device_id, d.name as device_name, d.garden_id, d.is_active as device_active
    FROM device_api_keys k
    JOIN devices d ON k.device_id = d.id
    WHERE k.key_hash = ? AND k.is_active = 1 AND d.is_active = 1
  `).get(keyHash);

  if (row) {
    const now = new Date().toISOString();
    db.prepare('UPDATE device_api_keys SET last_used_at=? WHERE id=?').run(now, row.id);
    db.prepare('UPDATE devices SET last_seen_at=? WHERE id=?').run(now, row.device_id);
  }

  return row || null;
}

// === Sensor Readings ===

function createSensorReading(deviceId, metricId, value, recordedAt) {
  const id = uuidv4();
  const now = new Date().toISOString();
  db.prepare('INSERT INTO sensor_readings (id, device_id, metric_id, value, recorded_at, created_at) VALUES (?, ?, ?, ?, ?, ?)')
    .run(id, deviceId, metricId, value, recordedAt || now, now);

  // Check metric thresholds & trigger webhooks
  try {
    const metric = db.prepare('SELECT ideal_min, ideal_max FROM metric_definitions WHERE id = ?').get(metricId);
    if (metric && (metric.ideal_min !== null || metric.ideal_max !== null)) {
      if ((metric.ideal_min !== null && value < metric.ideal_min) || (metric.ideal_max !== null && value > metric.ideal_max)) {
        const { fireWebhook } = require('./webhooks');
        fireWebhook('metric_alert', { device_id: deviceId, metric_id: metricId, value, ideal_min: metric.ideal_min, ideal_max: metric.ideal_max, timestamp: now });
      }
    }
    const { fireWebhook } = require('./webhooks');
    fireWebhook('sensor_reading', { device_id: deviceId, metric_id: metricId, value, recorded_at: recordedAt || now });
  } catch { /* webhook dispatch failure should not block ingestion */ }

  return { id, device_id: deviceId, metric_id: metricId, value, recorded_at: recordedAt || now };
}

function getSensorReadings(deviceId, limit = 100, offset = 0, metricId) {
  if (metricId) {
    return db.prepare('SELECT * FROM sensor_readings WHERE device_id=? AND metric_id=? ORDER BY recorded_at DESC LIMIT ? OFFSET ?')
      .all(deviceId, metricId, limit, offset);
  }
  return db.prepare('SELECT * FROM sensor_readings WHERE device_id=? ORDER BY recorded_at DESC LIMIT ? OFFSET ?')
    .all(deviceId, limit, offset);
}

module.exports = {
  listDevices, getDevice, createDevice, updateDevice, deleteDevice,
  createApiKey, listApiKeys, deleteApiKey, authenticateApiKey,
  createSensorReading, getSensorReadings,
};
