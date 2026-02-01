'use strict';

exports.up = function (db) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS locations (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT,
      sort_order INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    ALTER TABLE gardens ADD COLUMN location_id TEXT REFERENCES locations(id) ON DELETE SET NULL;
    CREATE INDEX idx_gardens_location ON gardens(location_id);
  `);
};
