'use strict';

require('./setup');
const assert = require('assert');
const supertest = require('supertest');

let app, request;

before(function () {
  app = require('../server/index');
  request = supertest(app);
});

describe('Auth', function () {
  const admin = { username: 'admin', display_name: 'Admin', password: 'TestPass1' };

  describe('POST /api/auth/setup', function () {
    it('should create admin account', async function () {
      const res = await request.post('/api/auth/setup').send(admin);
      assert.strictEqual(res.status, 201);
      assert.ok(res.body.user);
      assert.strictEqual(res.body.user.username, 'admin');
      assert.ok(res.headers['set-cookie']);
    });

    it('should reject duplicate setup', async function () {
      const res = await request.post('/api/auth/setup').send(admin);
      assert.strictEqual(res.status, 400);
    });
  });

  describe('POST /api/auth/login', function () {
    it('should login with correct credentials', async function () {
      const res = await request.post('/api/auth/login').send({ username: 'admin', password: 'TestPass1' });
      assert.strictEqual(res.status, 200);
      assert.ok(res.body.user);
    });

    it('should reject wrong password', async function () {
      const res = await request.post('/api/auth/login').send({ username: 'admin', password: 'wrong' });
      assert.strictEqual(res.status, 401);
    });
  });

  describe('Account lockout', function () {
    it('should lock after 5 failed attempts', async function () {
      // Create a test user to lock out
      const cookie = await getAdminCookie();
      await request.post('/api/admin/users')
        .set('Cookie', cookie)
        .send({ username: 'locktest', display_name: 'Lock Test', password: 'LockTest1', is_admin: false });

      for (let i = 0; i < 5; i++) {
        await request.post('/api/auth/login').send({ username: 'locktest', password: 'wrong' });
      }
      const res = await request.post('/api/auth/login').send({ username: 'locktest', password: 'LockTest1' });
      assert.strictEqual(res.status, 401);
      assert.ok(res.body.error.includes('locked'));
    });
  });

  describe('POST /api/auth/change-password', function () {
    it('should change password', async function () {
      const cookie = await getAdminCookie();
      const res = await request.post('/api/auth/change-password')
        .set('Cookie', cookie)
        .send({ current_password: 'TestPass1', new_password: 'NewPass99' });
      assert.strictEqual(res.status, 200);

      // Login with new password
      const login = await request.post('/api/auth/login').send({ username: 'admin', password: 'NewPass99' });
      assert.strictEqual(login.status, 200);

      // Reset back for other tests
      const cookie2 = extractCookie(login);
      await request.post('/api/auth/change-password')
        .set('Cookie', cookie2)
        .send({ current_password: 'NewPass99', new_password: 'TestPass1' });
    });

    it('should reject weak passwords', async function () {
      const cookie = await getAdminCookie();
      const res = await request.post('/api/auth/change-password')
        .set('Cookie', cookie)
        .send({ current_password: 'TestPass1', new_password: 'short' });
      assert.strictEqual(res.status, 400);
    });
  });

  describe('GET /api/auth/me', function () {
    it('should return user info with valid session', async function () {
      const cookie = await getAdminCookie();
      const res = await request.get('/api/auth/me').set('Cookie', cookie);
      assert.strictEqual(res.status, 200);
      assert.ok(res.body.user);
    });

    it('should return 401 without session', async function () {
      const res = await request.get('/api/auth/me');
      assert.strictEqual(res.status, 401);
    });
  });

  describe('DELETE /api/admin/users/:id', function () {
    let adminCookie, regularUserId, regularUserCookie, secondAdminId;

    before(async function () {
      adminCookie = await getAdminCookie();

      // Create a regular (non-admin) user
      const createReg = await request.post('/api/admin/users')
        .set('Cookie', adminCookie)
        .send({ username: 'reguser', display_name: 'Regular User', password: 'Password123', is_admin: false });
      assert.strictEqual(createReg.status, 201);
      regularUserId = createReg.body.id;

      // Log in as regular user to get their cookie
      const regLogin = await request.post('/api/auth/login')
        .send({ username: 'reguser', password: 'Password123' });
      regularUserCookie = extractCookie(regLogin);

      // Create another admin user
      const createAdmin = await request.post('/api/admin/users')
        .set('Cookie', adminCookie)
        .send({ username: 'admin2', display_name: 'Second Admin', password: 'Password123', is_admin: true });
      assert.strictEqual(createAdmin.status, 201);
      secondAdminId = createAdmin.body.id;
    });

    it('should reject deletion by non-admin users', async function () {
      const res = await request.delete(`/api/admin/users/${regularUserId}`)
        .set('Cookie', regularUserCookie);
      assert.strictEqual(res.status, 403);
    });

    it('should reject deleting oneself', async function () {
      const meRes = await request.get('/api/auth/me').set('Cookie', adminCookie);
      const myId = meRes.body.user.id;
      const res = await request.delete(`/api/admin/users/${myId}`)
        .set('Cookie', adminCookie);
      assert.strictEqual(res.status, 400);
      assert.ok(res.body.error.includes('Cannot delete yourself'));
    });

    it('should reject deleting another admin user', async function () {
      const res = await request.delete(`/api/admin/users/${secondAdminId}`)
        .set('Cookie', adminCookie);
      assert.strictEqual(res.status, 400);
      assert.ok(res.body.error.includes('Cannot delete admin users'));
    });

    it('should return 404 for non-existent user', async function () {
      const fakeId = '00000000-0000-0000-0000-000000000000';
      const res = await request.delete(`/api/admin/users/${fakeId}`)
        .set('Cookie', adminCookie);
      assert.strictEqual(res.status, 404);
    });

    it('should successfully delete a non-admin user', async function () {
      const res = await request.delete(`/api/admin/users/${regularUserId}`)
        .set('Cookie', adminCookie);
      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.body.success, true);

      // Verify the user cannot log in
      const loginRes = await request.post('/api/auth/login')
        .send({ username: 'reguser', password: 'Password123' });
      assert.strictEqual(loginRes.status, 401);

      // Verify user is not in users list
      const listRes = await request.get('/api/admin/users')
        .set('Cookie', adminCookie);
      assert.ok(!listRes.body.some(u => u.id === regularUserId));
    });
  });
});

// Helpers
function extractCookie(res) {
  const cookies = res.headers['set-cookie'];
  if (!cookies) return '';
  return cookies.map(c => c.split(';')[0]).join('; ');
}

async function getAdminCookie() {
  const res = await request.post('/api/auth/login').send({ username: 'admin', password: 'TestPass1' });
  return extractCookie(res);
}

module.exports = { getAdminCookie: () => getAdminCookie(), extractCookie };
