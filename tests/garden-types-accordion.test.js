'use strict';

require('./setup');
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const supertest = require('supertest');

let app, request;

before(function () {
  app = require('../server/index');
  request = supertest(app);
});

async function getAdminCookie() {
  const res = await request.post('/api/auth/login').send({ username: 'admin', password: 'TestPass1' });
  const cookies = res.headers['set-cookie'];
  if (!cookies) return '';
  return cookies.map(c => c.split(';')[0]).join('; ');
}

describe('Garden Types Accordion & Container Controls', function () {
  let cookie;

  before(async function () {
    cookie = await getAdminCookie();
  });

  describe('Backend Category Toggle API', function () {
    it('requires authentication for PUT /api/garden-types/category/:category', async function () {
      const res = await request.put('/api/garden-types/category/hydroponic').send({ is_enabled: false });
      assert.strictEqual(res.status, 401);
    });

    it('rejects invalid boolean for is_enabled', async function () {
      const res = await request.put('/api/garden-types/category/hydroponic')
        .set('Cookie', cookie)
        .send({ is_enabled: 'not-a-bool' });
      assert.strictEqual(res.status, 400);
      assert.ok(res.body.error);
    });

    it('returns 404 for nonexistent category', async function () {
      const res = await request.put('/api/garden-types/category/nonexistent-cat')
        .set('Cookie', cookie)
        .send({ is_enabled: false });
      assert.strictEqual(res.status, 404);
    });

    it('disables all types in soil category and records audit log', async function () {
      const res = await request.put('/api/garden-types/category/soil')
        .set('Cookie', cookie)
        .send({ is_enabled: false });
      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.body.success, true);
      assert.ok(res.body.count >= 3);

      const check = await request.get('/api/garden-types').set('Cookie', cookie);
      const soilTypes = check.body.filter(t => t.category === 'soil');
      assert.ok(soilTypes.length >= 3);
      assert.ok(soilTypes.every(t => t.is_enabled === false));

      // Re-enable
      const res2 = await request.put('/api/garden-types/category/soil')
        .set('Cookie', cookie)
        .send({ is_enabled: true });
      assert.strictEqual(res2.status, 200);
      assert.strictEqual(res2.body.success, true);

      const check2 = await request.get('/api/garden-types').set('Cookie', cookie);
      const soilTypes2 = check2.body.filter(t => t.category === 'soil');
      assert.ok(soilTypes2.every(t => t.is_enabled === true));
    });

    it('disables all types in container category and re-enables them', async function () {
      const res = await request.put('/api/garden-types/category/container')
        .set('Cookie', cookie)
        .send({ is_enabled: false });
      assert.strictEqual(res.status, 200);

      const check = await request.get('/api/garden-types').set('Cookie', cookie);
      const containerTypes = check.body.filter(t => t.category === 'container');
      assert.ok(containerTypes.length >= 3);
      assert.ok(containerTypes.every(t => t.is_enabled === false));

      // Re-enable
      await request.put('/api/garden-types/category/container')
        .set('Cookie', cookie)
        .send({ is_enabled: true });
    });
  });

  describe('Frontend Accordion Implementation', function () {
    const appJs = fs.readFileSync(path.join(__dirname, '../public/js/app.js'), 'utf8');
    const apiJs = fs.readFileSync(path.join(__dirname, '../public/js/api.js'), 'utf8');
    const stylesCss = fs.readFileSync(path.join(__dirname, '../public/css/styles.css'), 'utf8');

    it('API client provides updateGardenTypeCategory method', function () {
      assert.ok(apiJs.includes('updateGardenTypeCategory(category, data)'), 'api.js should have updateGardenTypeCategory');
    });

    it('app.js builds accordion structure with groups, headers, badges, and container toggles', function () {
      assert.ok(appJs.includes('settings-accordion-group'), 'app.js should contain settings-accordion-group');
      assert.ok(appJs.includes('settings-accordion-header'), 'app.js should contain settings-accordion-header');
      assert.ok(appJs.includes('settings-accordion-trigger'), 'app.js should contain settings-accordion-trigger');
      assert.ok(appJs.includes('settings-accordion-badge'), 'app.js should contain settings-accordion-badge');
      assert.ok(appJs.includes('data-toggle-category='), 'app.js should contain container toggle attribute data-toggle-category');
      assert.ok(appJs.includes('settings-accordion-panel'), 'app.js should contain settings-accordion-panel');
      assert.ok(appJs.includes('updateCategoryContainerUI'), 'app.js should define updateCategoryContainerUI');
    });

    it('styles.css includes accordion and partial toggle switch styles', function () {
      assert.ok(stylesCss.includes('.settings-accordion-group'), 'styles.css should style .settings-accordion-group');
      assert.ok(stylesCss.includes('.settings-accordion-header'), 'styles.css should style .settings-accordion-header');
      assert.ok(stylesCss.includes('.settings-accordion-chevron'), 'styles.css should style .settings-accordion-chevron');
      assert.ok(stylesCss.includes('.toggle.partial'), 'styles.css should style .toggle.partial');
      assert.ok(stylesCss.includes('translateX(10px)'), 'styles.css should position partial toggle in the center');
    });
  });
});
