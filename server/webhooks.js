'use strict';

const crypto = require('crypto');
const dns = require('dns').promises;
const db = require('./database');
const { v4: uuidv4 } = require('uuid');

const VALID_EVENTS = ['sensor_reading', 'metric_alert', 'task_due', 'harvest'];

// SSRF protection: block webhook URLs pointing at private/internal addresses.
function isPrivateIP(ip) {
  const v4 = ip.match(/^(\d+)\.(\d+)\.(\d+)\.(\d+)$/);
  if (v4) {
    const [, a, b] = v4.map(Number);
    if (a === 10) return true;
    if (a === 172 && b >= 16 && b <= 31) return true;
    if (a === 192 && b === 168) return true;
    if (a === 127) return true;
    if (a === 0) return true;
    return false;
  }
  const low = ip.toLowerCase();
  if (low === '::1' || low.startsWith('fc') || low.startsWith('fd') || low.startsWith('fe80')) return true;
  return false;
}

async function isWebhookUrlAllowed(url) {
  let parsed;
  try { parsed = new URL(url); } catch { return false; }
  if (!['http:', 'https:'].includes(parsed.protocol)) return false;
  const host = parsed.hostname.toLowerCase();
  if (host === 'localhost' || host.endsWith('.localhost')) return false;
  if (/^[\d.]+$/.test(host) || host.includes(':')) {
    return !isPrivateIP(host);
  }
  try {
    const addrs = await dns.lookup(host, { all: true });
    return addrs.length > 0 && addrs.every(a => !isPrivateIP(a.address));
  } catch {
    return false;
  }
}

function sanitizeWebhook(w) {
  if (!w) return w;
  const { secret, ...rest } = w;
  return { ...rest, has_secret: !!secret };
}

function listWebhooks() {
  return db.prepare('SELECT * FROM webhooks ORDER BY created_at DESC').all()
    .map(w => sanitizeWebhook({ ...w, is_active: !!w.is_active, events: w.events ? w.events.split(',') : [] }));
}

function getWebhook(id) {
  const w = db.prepare('SELECT * FROM webhooks WHERE id=?').get(id);
  if (w) { w.is_active = !!w.is_active; w.events = w.events ? w.events.split(',') : []; }
  return w;
}

function createWebhook(name, url, secret, events, retryCount) {
  const id = uuidv4();
  const now = new Date().toISOString();
  const eventsStr = (events || []).filter(e => VALID_EVENTS.includes(e)).join(',');
  db.prepare('INSERT INTO webhooks (id, name, url, secret, events, is_active, retry_count, created_at, updated_at) VALUES (?, ?, ?, ?, ?, 1, ?, ?, ?)')
    .run(id, name, url, secret || null, eventsStr, retryCount || 3, now, now);
  return { id, name, url, secret: secret || null, events: eventsStr.split(','), is_active: true, retry_count: retryCount || 3, created_at: now };
}

function updateWebhook(id, name, url, secret, events, isActive, retryCount) {
  const now = new Date().toISOString();
  const eventsStr = (events || []).filter(e => VALID_EVENTS.includes(e)).join(',');
  db.prepare('UPDATE webhooks SET name=?, url=?, secret=?, events=?, is_active=?, retry_count=?, updated_at=? WHERE id=?')
    .run(name, url, secret || null, eventsStr, isActive ? 1 : 0, retryCount || 3, now, id);
}

function deleteWebhook(id) {
  db.prepare('DELETE FROM webhooks WHERE id=?').run(id);
}

function getWebhookLogs(webhookId, limit = 50) {
  return db.prepare('SELECT * FROM webhook_logs WHERE webhook_id=? ORDER BY attempted_at DESC LIMIT ?')
    .all(webhookId, limit).map(l => ({ ...l, success: !!l.success }));
}

function signPayload(payload, secret) {
  if (!secret) return null;
  return crypto.createHmac('sha256', secret).update(JSON.stringify(payload)).digest('hex');
}

async function fireWebhook(event, payload) {
  const webhooks = db.prepare('SELECT * FROM webhooks WHERE is_active=1 AND events LIKE ?')
    .all(`%${event}%`)
    .filter(w => w.events.split(',').includes(event));

  for (const wh of webhooks) {
    const maxRetries = wh.retry_count || 3;
    let success = false;
    let responseStatus = null;
    let responseBody = null;

    for (let attempt = 0; attempt < maxRetries && !success; attempt++) {
      try {
        const headers = { 'Content-Type': 'application/json', 'X-Webhook-Event': event };
        const signature = signPayload(payload, wh.secret);
        if (signature) headers['X-Webhook-Signature'] = `sha256=${signature}`;

        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 10000);

        const res = await fetch(wh.url, {
          method: 'POST',
          headers,
          body: JSON.stringify(payload),
          signal: controller.signal,
        });
        clearTimeout(timeout);

        responseStatus = res.status;
        responseBody = await res.text().catch(() => '');
        if (responseBody.length > 2000) responseBody = responseBody.slice(0, 2000);
        success = res.ok;
      } catch (err) {
        responseStatus = 0;
        responseBody = err.message || 'Connection failed';
      }
    }

    // Log result
    db.prepare('INSERT INTO webhook_logs (id, webhook_id, event, payload, response_status, response_body, success, attempted_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)')
      .run(uuidv4(), wh.id, event, JSON.stringify(payload), responseStatus, responseBody, success ? 1 : 0, new Date().toISOString());
  }
}

module.exports = {
  VALID_EVENTS,
  listWebhooks, getWebhook, createWebhook, updateWebhook, deleteWebhook,
  getWebhookLogs, fireWebhook, isWebhookUrlAllowed, sanitizeWebhook,
};
