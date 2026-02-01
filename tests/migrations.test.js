'use strict';

require('./setup');
const assert = require('assert');
const path = require('path');
const fs = require('fs');
const Database = require('better-sqlite3');

describe('Migrations', function () {
  it('should run all migrations on a fresh database', function () {
    const tmpPath = path.join(__dirname, '..', 'data', 'migration_test.db');
    try { fs.unlinkSync(tmpPath); } catch { /* ok */ }

    const db = new Database(tmpPath);
    db.pragma('journal_mode = WAL');
    db.pragma('foreign_keys = ON');

    const { runMigrations } = require('../server/migrations/index');
    runMigrations(db);

    // Verify schema_migrations
    const versions = db.prepare('SELECT version FROM schema_migrations ORDER BY version').all();
    assert.ok(versions.length >= 3, `Expected at least 3 migrations, got ${versions.length}`);

    // Verify tables exist
    const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all().map(r => r.name);
    const required = ['users', 'sessions', 'gardens', 'log_entries', 'tasks', 'plants', 'audit_log',
      'app_settings', 'garden_types', 'metric_definitions', 'garden_type_metrics',
      'devices', 'device_api_keys', 'sensor_readings', 'webhooks', 'webhook_logs'];
    for (const t of required) {
      assert.ok(tables.includes(t), `Missing table: ${t}`);
    }

    // Verify seed data
    const gardenTypes = db.prepare('SELECT COUNT(*) as count FROM garden_types').get();
    assert.ok(gardenTypes.count >= 15, `Expected >= 15 garden types, got ${gardenTypes.count}`);

    const metrics = db.prepare('SELECT COUNT(*) as count FROM metric_definitions').get();
    assert.ok(metrics.count >= 17, `Expected >= 17 metrics, got ${metrics.count}`);

    db.close();
    try { fs.unlinkSync(tmpPath); } catch { /* ok */ }
  });

  it('should be idempotent (running twice should not error)', function () {
    const tmpPath = path.join(__dirname, '..', 'data', 'migration_idem_test.db');
    try { fs.unlinkSync(tmpPath); } catch { /* ok */ }

    const db = new Database(tmpPath);
    db.pragma('journal_mode = WAL');
    db.pragma('foreign_keys = ON');

    // Clear the require cache so runMigrations re-reads
    delete require.cache[require.resolve('../server/migrations/index')];
    const { runMigrations } = require('../server/migrations/index');

    runMigrations(db);
    runMigrations(db); // Second run should be no-op

    const versions = db.prepare('SELECT version FROM schema_migrations ORDER BY version').all();
    assert.ok(versions.length >= 3);

    db.close();
    try { fs.unlinkSync(tmpPath); } catch { /* ok */ }
  });
});
