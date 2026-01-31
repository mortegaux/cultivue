const db = require('./database');

/**
 * Log an auditable action.
 * @param {object} user - { id, username }
 * @param {string} action - e.g. 'create', 'update', 'delete', 'login', 'register'
 * @param {string} entityType - e.g. 'garden', 'log_entry', 'task', 'plant', 'user'
 * @param {string|null} entityId - ID of the affected entity
 * @param {string|null} details - Additional detail text
 * @param {string|null} ip - Client IP address
 */
function logAudit(user, action, entityType, entityId, details, ip) {
  db.prepare(
    'INSERT INTO audit_log (user_id, username, action, entity_type, entity_id, details, ip_address, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
  ).run(
    user.id,
    user.username,
    action,
    entityType,
    entityId || null,
    details || null,
    ip || null,
    new Date().toISOString()
  );
}

function getAuditLogs(limit = 100, offset = 0) {
  return db.prepare(
    'SELECT * FROM audit_log ORDER BY created_at DESC LIMIT ? OFFSET ?'
  ).all(limit, offset);
}

module.exports = { logAudit, getAuditLogs };
