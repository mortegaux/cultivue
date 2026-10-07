'use strict';

const crypto = require('crypto');
const dns = require('dns');
const net = require('net');
const db = require('./database');
const { v4: uuidv4 } = require('uuid');

const VALID_EVENTS = ['sensor_reading', 'metric_alert', 'task_due', 'harvest'];

/**
 * SSRF guard for webhook target URLs.
 *
 * Webhooks are server-side POSTs to admin-configured URLs. Without validation,
 * a malicious or compromised-admin URL could make the server probe the LAN,
 * hit loopback services, or reach cloud metadata endpoints (169.254.169.254).
 * Only public http(s) targets are allowed.
 */
function ipv4ToInt(ip) {
  return ip.split('.').reduce((acc, oct) => (acc << 8) + parseInt(oct, 10), 0) >>> 0;
}

function isBlockedIp(ip) {
  if (net.isIPv4(ip)) {
    const n = ipv4ToInt(ip);
    const inCidr = (base, bits) => {
      const mask = bits === 0 ? 0 : (~0 << (32 - bits)) >>> 0;
      return (n & mask) === (ipv4ToInt(base) & mask);
    };
    return (
      inCidr('0.0.0.0', 8) ||
      inCidr('10.0.0.0', 8) ||
      inCidr('100.64.0.0', 10) ||
      inCidr('127.0.0.0', 8) ||
      inCidr('169.254.0.0', 16) ||
      inCidr('172.16.0.0', 12) ||
      inCidr('192.0.0.0', 24) ||
      inCidr('192.0.2.0', 24) ||
      inCidr('192.168.0.0', 16) ||
      inCidr('198.18.0.0', 15) ||
      inCidr('198.51.100.0', 24) ||
      inCidr('203.0.113.0', 24) ||
      inCidr('224.0.0.0', 4) ||
      inCidr('240.0.0.0', 4)
    );
  }
  if (net.isIPv6(ip)) {
    const lower = ip.toLowerCase();
    return (
      lower === '::' ||
      lower === '::1' ||
      lower.startsWith('fe80:') ||
      lower.startsWith('fc00:') ||
      lower.startsWith('fd00:') ||
      lower.startsWith('ff')
    );
  }
  return true;
}

async function assertSafeWebhookUrl(rawUrl) {
  let parsed;
  try {
    parsed = new URL(rawUrl);
  } catch {
    throw new Error('Invalid webhook URL');
  }
  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    throw new Error('Webhook URL must be http or https');
  }
  if (parsed.username || parsed.password) {
    throw new Error('Webhook URL must not contain credentials');
  }
  const host = parsed.hostname;
  if (net.isIP(host) && isBlockedIp(host)) {
    throw new Error('Webhook URL host is not allowed');
  }
  let addresses;
  try {
    addresses = await dns.promises.lookup(host, { all: true });
  } catch {
    throw new Error('Could not resolve webhook URL host');
  }
  if (addresses.length === 0 || addresses.some(a => isBlockedIp(a.address))) {
    throw new Error('Webhook URL host is not allowed');
  }
  return parsed.toString();
}

function sanitizeWebhook(w) {
  // Never expose the signing secret via list/get endpoints. The raw secret is
  // needed at fire time for HMAC-SHA256 signatures, so it can't be hashed
  // like a password — instead it is shown once at creation and the SQLite
  // file itself is the trust boundary. Callers that need the raw value
  // (fireWebhook) query the DB directly.
  if (!w) return w;
  const { secret, ...rest } = w;
  return { ...rest, has_secret: !!secret };
}

function listWebhooks() {
  return db.prepare('SELECT id, name, url, events, is_active, retry_count, created_at, updated_at, CASE WHEN secret IS NOT NULL AND secret != "" THEN 1 ELSE 0 END AS has_secret FROM webhooks ORDER BY created_at DESC').all()
    .map(w => ({ ...w, is_active: !!w.is_active, has_secret: !!w.has_secret, events: w.events ? w.events.split(',') : [] }));
}

function getWebhook(id) {
  const w = db.prepare('SELECT * FROM webhooks WHERE id=?').get(id);
  if (w) { w.is_active = !!w.is_active; w.events = w.events ? w.events.split(',') : []; }
  return w;
}

function getWebhookPublic(id) {
  return sanitizeWebhook(getWebhook(id));
}

function createWebhook(name, url, secret, events, retryCount) {
  const id = uuidv4();
  const now = new Date().toISOString();
  const eventsStr = (events || []).filter(e => VALID_EVENTS.includes(e)).join(',');
  db.prepare('INSERT INTO webhooks (id, name, url, secret, events, is_active, retry_count, created_at, updated_at) VALUES (?, ?, ?, ?, ?, 1, ?, ?, ?)')
    .run(id, name, url, secret || null, eventsStr, retryCount || 3, now, now);
  // The secret is returned here exactly once (show-once, like an API token).
  // listWebhooks/getWebhookPublic never include it again.
  return { id, name, url, secret: secret || null, has_secret: !!secret, events: eventsStr.split(','), is_active: true, retry_count: retryCount || 3, created_at: now };
}

function updateWebhook(id, name, url, secret, events, isActive, retryCount) {
  const now = new Date().toISOString();
  const eventsStr = (events || []).filter(e => VALID_EVENTS.includes(e)).join(',');
  if (secret) {
    db.prepare('UPDATE webhooks SET name=?, url=?, secret=?, events=?, is_active=?, retry_count=?, updated_at=? WHERE id=?')
      .run(name, url, secret, eventsStr, isActive ? 1 : 0, retryCount || 3, now, id);
  } else {
    // Empty secret on update means "keep the existing one" — never wipe it
    // as a side effect of editing the name or URL.
    db.prepare('UPDATE webhooks SET name=?, url=?, events=?, is_active=?, retry_count=?, updated_at=? WHERE id=?')
      .run(name, url, eventsStr, isActive ? 1 : 0, retryCount || 3, now, id);
  }
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
    // Re-validate the target on every fire: the URL was checked at creation,
    // but DNS can change and the DB is writable by admins.
    try {
      await assertSafeWebhookUrl(wh.url);
    } catch (err) {
      db.prepare('INSERT INTO webhook_logs (id, webhook_id, event, payload, response_status, response_body, success, attempted_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)')
        .run(uuidv4(), wh.id, event, JSON.stringify(payload), 0, `Blocked: ${err.message}`, 0, new Date().toISOString());
      continue;
    }

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
  listWebhooks, getWebhook, getWebhookPublic, createWebhook, updateWebhook, deleteWebhook,
  getWebhookLogs, fireWebhook, assertSafeWebhookUrl,
};
