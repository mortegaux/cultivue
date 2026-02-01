'use strict';

const path = require('path');
const fs = require('fs');

// Use a temp DB for tests
const testDbPath = path.join(__dirname, '..', 'data', 'test.db');

before(function () {
  // Set env before requiring anything
  process.env.DB_PATH = testDbPath;
  // Remove old test DB
  try { fs.unlinkSync(testDbPath); } catch { /* ok */ }
});

after(function () {
  try { fs.unlinkSync(testDbPath); } catch { /* ok */ }
});
