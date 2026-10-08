'use strict';

exports.up = function (db) {
  const cols = db.prepare("PRAGMA table_info(tasks)").all().map(c => c.name);

  if (!cols.includes('due_time')) {
    db.exec(`ALTER TABLE tasks ADD COLUMN due_time TEXT;`);
  }
  if (!cols.includes('recurrence_type')) {
    db.exec(`ALTER TABLE tasks ADD COLUMN recurrence_type TEXT DEFAULT 'interval';`);
  }
  if (!cols.includes('days_of_week')) {
    db.exec(`ALTER TABLE tasks ADD COLUMN days_of_week TEXT;`);
  }
  if (!cols.includes('times_of_day')) {
    db.exec(`ALTER TABLE tasks ADD COLUMN times_of_day TEXT;`);
  }
  if (!cols.includes('end_type')) {
    db.exec(`ALTER TABLE tasks ADD COLUMN end_type TEXT DEFAULT 'never';`);
  }
  if (!cols.includes('end_date')) {
    db.exec(`ALTER TABLE tasks ADD COLUMN end_date TEXT;`);
  }
  if (!cols.includes('end_occurrences')) {
    db.exec(`ALTER TABLE tasks ADD COLUMN end_occurrences INTEGER;`);
  }
  if (!cols.includes('occurrence_count')) {
    db.exec(`ALTER TABLE tasks ADD COLUMN occurrence_count INTEGER NOT NULL DEFAULT 0;`);
  }
  if (!cols.includes('end_condition')) {
    db.exec(`ALTER TABLE tasks ADD COLUMN end_condition TEXT;`);
  }
  if (!cols.includes('is_disabled')) {
    db.exec(`ALTER TABLE tasks ADD COLUMN is_disabled INTEGER NOT NULL DEFAULT 0;`);
  }
  if (!cols.includes('disabled_reason')) {
    db.exec(`ALTER TABLE tasks ADD COLUMN disabled_reason TEXT;`);
  }
};
