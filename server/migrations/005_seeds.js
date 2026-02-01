'use strict';

exports.up = function (db) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS seeds (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      variety TEXT,
      supplier TEXT,
      purchase_date TEXT,
      purchase_price REAL,
      quantity INTEGER NOT NULL DEFAULT 1,
      quantity_unit TEXT NOT NULL DEFAULT 'packets',
      expected_germination_rate INTEGER,
      days_to_germination INTEGER,
      notes TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS plant_failures (
      id TEXT PRIMARY KEY,
      plant_id TEXT NOT NULL,
      seed_id TEXT,
      failure_stage TEXT NOT NULL,
      failure_reason TEXT,
      failed_at TEXT NOT NULL,
      FOREIGN KEY (plant_id) REFERENCES plants(id) ON DELETE CASCADE,
      FOREIGN KEY (seed_id) REFERENCES seeds(id) ON DELETE SET NULL
    );

    ALTER TABLE plants ADD COLUMN seed_id TEXT REFERENCES seeds(id) ON DELETE SET NULL;
    CREATE INDEX idx_plants_seed ON plants(seed_id);
    CREATE INDEX idx_plant_failures_seed ON plant_failures(seed_id);
  `);
};
