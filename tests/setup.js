'use strict';

const path = require('path');
const fs = require('fs');

// Set test environment
process.env.NODE_ENV = 'test';

// Use a temp DB for tests
const testDbPath = path.join(__dirname, '..', 'data', 'test.db');

beforeEach(function () {
  // Set env before requiring anything
  process.env.DB_PATH = testDbPath;
  try { fs.unlinkSync(testDbPath); } catch { /* ok */ }

  // Clear require cache for server modules
  Object.keys(require.cache).forEach(key => {
    if (key.includes('/server/')) {
      delete require.cache[key];
    }
  });
});

after(function () {
  try { fs.unlinkSync(testDbPath); } catch { /* ok */ }
});
