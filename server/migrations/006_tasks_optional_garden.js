'use strict';

exports.up = function (db) {
  // SQLite can't ALTER COLUMN, so recreate table with nullable garden_id and new plant_id
  db.exec(`
    CREATE TABLE tasks_new (
      id TEXT PRIMARY KEY,
      garden_id TEXT,
      plant_id TEXT,
      title TEXT NOT NULL,
      description TEXT,
      due_date TEXT NOT NULL,
      is_completed INTEGER NOT NULL DEFAULT 0,
      completed_at TEXT,
      priority TEXT NOT NULL DEFAULT 'medium',
      is_recurring INTEGER NOT NULL DEFAULT 0,
      recurring_days INTEGER,
      FOREIGN KEY (garden_id) REFERENCES gardens(id) ON DELETE CASCADE,
      FOREIGN KEY (plant_id) REFERENCES plants(id) ON DELETE SET NULL
    );

    INSERT INTO tasks_new (id, garden_id, title, description, due_date, is_completed, completed_at, priority, is_recurring, recurring_days)
      SELECT id, garden_id, title, description, due_date, is_completed, completed_at, priority, is_recurring, recurring_days FROM tasks;

    DROP TABLE tasks;
    ALTER TABLE tasks_new RENAME TO tasks;

    CREATE INDEX idx_tasks_garden ON tasks(garden_id);
    CREATE INDEX idx_tasks_plant ON tasks(plant_id);
  `);
};
