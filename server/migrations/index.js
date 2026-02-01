'use strict';

const path = require('path');
const fs = require('fs');

function runMigrations(db) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      version INTEGER UNIQUE NOT NULL,
      applied_at TEXT NOT NULL
    )
  `);

  const applied = new Set(
    db.prepare('SELECT version FROM schema_migrations ORDER BY version').all().map(r => r.version)
  );

  const migrationsDir = __dirname;
  const files = fs.readdirSync(migrationsDir)
    .filter(f => /^\d{3}_.*\.js$/.test(f))
    .sort();

  for (const file of files) {
    const version = parseInt(file.split('_')[0], 10);
    if (applied.has(version)) continue;

    console.log(`Running migration ${file}...`);
    const migration = require(path.join(migrationsDir, file));

    const runInTransaction = db.transaction(() => {
      migration.up(db);
      db.prepare('INSERT INTO schema_migrations (version, applied_at) VALUES (?, ?)').run(version, new Date().toISOString());
    });
    runInTransaction();
    console.log(`Migration ${file} applied.`);
  }
}

module.exports = { runMigrations };
