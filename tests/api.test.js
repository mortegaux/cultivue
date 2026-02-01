'use strict';

require('./setup');
const assert = require('assert');
const supertest = require('supertest');

let app, request;

before(function () {
  app = require('../server/index');
  request = supertest(app);
});

// Helper to get admin cookie (relies on auth.test.js running first and creating admin)
async function getAdminCookie() {
  const res = await request.post('/api/auth/login').send({ username: 'admin', password: 'TestPass1' });
  const cookies = res.headers['set-cookie'];
  if (!cookies) return '';
  return cookies.map(c => c.split(';')[0]).join('; ');
}

describe('Gardens API', function () {
  let cookie, gardenId;

  before(async function () {
    cookie = await getAdminCookie();
  });

  it('POST /api/gardens — create garden', async function () {
    const res = await request.post('/api/gardens')
      .set('Cookie', cookie)
      .send({ name: 'Test Garden', garden_type_id: 'hydro-dwc', plant_types: ['vegetables'] });
    assert.strictEqual(res.status, 201);
    assert.ok(res.body.id);
    gardenId = res.body.id;
  });

  it('GET /api/gardens — list gardens', async function () {
    const res = await request.get('/api/gardens').set('Cookie', cookie);
    assert.strictEqual(res.status, 200);
    assert.ok(Array.isArray(res.body));
    assert.ok(res.body.length >= 1);
  });

  it('PUT /api/gardens/:id — update garden', async function () {
    const res = await request.put(`/api/gardens/${gardenId}`)
      .set('Cookie', cookie)
      .send({ name: 'Updated Garden', garden_type_id: 'hydro-nft', plant_types: ['herbs'], is_active: true });
    assert.strictEqual(res.status, 200);
  });

  it('DELETE /api/gardens/:id — delete garden', async function () {
    // Create a temp garden to delete
    const create = await request.post('/api/gardens')
      .set('Cookie', cookie)
      .send({ name: 'To Delete', garden_type_id: 'hydro-dwc' });
    const res = await request.delete(`/api/gardens/${create.body.id}`).set('Cookie', cookie);
    assert.strictEqual(res.status, 200);
  });

  // Log entries
  describe('Log Entries', function () {
    let logId;

    it('POST /api/gardens/:id/logs — create log', async function () {
      const res = await request.post(`/api/gardens/${gardenId}/logs`)
        .set('Cookie', cookie)
        .send({ metric_data: { ph: 6.0, ppm: 1000 }, notes: 'Test log' });
      assert.strictEqual(res.status, 201);
      logId = res.body.id;
    });

    it('GET /api/gardens/:id/logs — list logs', async function () {
      const res = await request.get(`/api/gardens/${gardenId}/logs`).set('Cookie', cookie);
      assert.strictEqual(res.status, 200);
      assert.ok(res.body.length >= 1);
    });

    it('PUT /api/logs/:id — update log', async function () {
      const res = await request.put(`/api/logs/${logId}`)
        .set('Cookie', cookie)
        .send({ ph: 6.5, metric_data: { ph: 6.5 }, notes: 'Updated' });
      assert.strictEqual(res.status, 200);
    });

    it('DELETE /api/logs/:id — delete log', async function () {
      const res = await request.delete(`/api/logs/${logId}`).set('Cookie', cookie);
      assert.strictEqual(res.status, 200);
    });
  });

  // Tasks
  describe('Tasks', function () {
    let taskId;

    it('POST /api/gardens/:id/tasks — create task', async function () {
      const res = await request.post(`/api/gardens/${gardenId}/tasks`)
        .set('Cookie', cookie)
        .send({ title: 'Test Task', due_date: new Date().toISOString(), priority: 'high' });
      assert.strictEqual(res.status, 201);
      taskId = res.body.id;
    });

    it('PATCH /api/tasks/:id/toggle — toggle task', async function () {
      const res = await request.patch(`/api/tasks/${taskId}/toggle`).set('Cookie', cookie);
      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.body.is_completed, true);
    });

    it('GET /api/tasks — list all tasks', async function () {
      const res = await request.get('/api/tasks').set('Cookie', cookie);
      assert.strictEqual(res.status, 200);
      assert.ok(Array.isArray(res.body));
    });

    it('DELETE /api/tasks/:id', async function () {
      const res = await request.delete(`/api/tasks/${taskId}`).set('Cookie', cookie);
      assert.strictEqual(res.status, 200);
    });
  });

  // Plants
  describe('Plants', function () {
    let plantId;

    it('POST /api/gardens/:id/plants — create plant', async function () {
      const res = await request.post(`/api/gardens/${gardenId}/plants`)
        .set('Cookie', cookie)
        .send({ name: 'Basil', plant_type: 'herbs', species: 'Sweet Basil', current_stage: 'seedling' });
      assert.strictEqual(res.status, 201);
      plantId = res.body.id;
    });

    it('PUT /api/plants/:id — update plant', async function () {
      const res = await request.put(`/api/plants/${plantId}`)
        .set('Cookie', cookie)
        .send({ name: 'Basil Updated', plant_type: 'herbs', species: 'Sweet Basil', current_stage: 'vegetative', is_active: true });
      assert.strictEqual(res.status, 200);
    });

    it('DELETE /api/plants/:id', async function () {
      const res = await request.delete(`/api/plants/${plantId}`).set('Cookie', cookie);
      assert.strictEqual(res.status, 200);
    });
  });
});

describe('Settings API', function () {
  let cookie;
  before(async function () { cookie = await getAdminCookie(); });

  it('GET /api/settings', async function () {
    const res = await request.get('/api/settings').set('Cookie', cookie);
    assert.strictEqual(res.status, 200);
  });

  it('PUT /api/settings/:key', async function () {
    const res = await request.put('/api/settings/app_name')
      .set('Cookie', cookie)
      .send({ value: 'TestApp', type: 'string' });
    assert.strictEqual(res.status, 200);
  });

  it('should reject protected keys', async function () {
    const res = await request.put('/api/settings/setup_completed')
      .set('Cookie', cookie)
      .send({ value: 'false', type: 'boolean' });
    assert.strictEqual(res.status, 403);
  });
});

describe('Garden Types & Metrics API', function () {
  let cookie;
  before(async function () { cookie = await getAdminCookie(); });

  it('GET /api/garden-types', async function () {
    const res = await request.get('/api/garden-types').set('Cookie', cookie);
    assert.strictEqual(res.status, 200);
    assert.ok(res.body.length > 0);
  });

  it('GET /api/garden-types/:id/metrics', async function () {
    const res = await request.get('/api/garden-types/hydro-dwc/metrics').set('Cookie', cookie);
    assert.strictEqual(res.status, 200);
    assert.ok(res.body.length > 0);
  });

  it('GET /api/metrics', async function () {
    const res = await request.get('/api/metrics').set('Cookie', cookie);
    assert.strictEqual(res.status, 200);
    assert.ok(res.body.length > 0);
  });
});

describe('Dashboard & Stats API', function () {
  let cookie;
  before(async function () { cookie = await getAdminCookie(); });

  it('GET /api/dashboard/stats', async function () {
    const res = await request.get('/api/dashboard/stats').set('Cookie', cookie);
    assert.strictEqual(res.status, 200);
    assert.ok('total_gardens' in res.body);
  });
});

describe('Devices API', function () {
  let cookie, deviceId;
  before(async function () { cookie = await getAdminCookie(); });

  it('POST /api/devices — create device', async function () {
    const res = await request.post('/api/devices')
      .set('Cookie', cookie)
      .send({ name: 'Test Sensor', device_type: 'sensor' });
    assert.strictEqual(res.status, 201);
    deviceId = res.body.id;
  });

  it('GET /api/devices — list devices', async function () {
    const res = await request.get('/api/devices').set('Cookie', cookie);
    assert.strictEqual(res.status, 200);
    assert.ok(res.body.length >= 1);
  });

  it('POST /api/devices/:id/keys — create API key', async function () {
    const res = await request.post(`/api/devices/${deviceId}/keys`)
      .set('Cookie', cookie)
      .send({ label: 'test-key' });
    assert.strictEqual(res.status, 201);
    assert.ok(res.body.raw_key);
  });

  it('POST /api/sensor/readings — submit readings with API key', async function () {
    // Get a key
    const keyRes = await request.post(`/api/devices/${deviceId}/keys`)
      .set('Cookie', cookie)
      .send({ label: 'sensor-key' });
    const apiKey = keyRes.body.raw_key;

    const res = await request.post('/api/sensor/readings')
      .set('X-API-Key', apiKey)
      .send({ readings: [{ metric_id: 'ph', value: 6.2 }, { metric_id: 'ppm', value: 1100 }] });
    assert.strictEqual(res.status, 201);
    assert.strictEqual(res.body.accepted, 2);
  });

  it('GET /api/sensor/readings/:deviceId', async function () {
    const res = await request.get(`/api/sensor/readings/${deviceId}`).set('Cookie', cookie);
    assert.strictEqual(res.status, 200);
    assert.ok(res.body.length >= 2);
  });

  it('DELETE /api/devices/:id', async function () {
    const res = await request.delete(`/api/devices/${deviceId}`).set('Cookie', cookie);
    assert.strictEqual(res.status, 200);
  });
});

describe('Webhooks API', function () {
  let cookie, webhookId;
  before(async function () { cookie = await getAdminCookie(); });

  it('POST /api/webhooks — create webhook', async function () {
    const res = await request.post('/api/webhooks')
      .set('Cookie', cookie)
      .send({ name: 'Test Hook', url: 'https://httpbin.org/post', events: ['sensor_reading'], retry_count: 1 });
    assert.strictEqual(res.status, 201);
    webhookId = res.body.id;
  });

  it('GET /api/webhooks — list webhooks', async function () {
    const res = await request.get('/api/webhooks').set('Cookie', cookie);
    assert.strictEqual(res.status, 200);
    assert.ok(res.body.length >= 1);
  });

  it('GET /api/webhooks/:id/logs', async function () {
    const res = await request.get(`/api/webhooks/${webhookId}/logs`).set('Cookie', cookie);
    assert.strictEqual(res.status, 200);
    assert.ok(Array.isArray(res.body));
  });

  it('DELETE /api/webhooks/:id', async function () {
    const res = await request.delete(`/api/webhooks/${webhookId}`).set('Cookie', cookie);
    assert.strictEqual(res.status, 200);
  });
});

describe('CSV Export', function () {
  let cookie, gardenId;
  before(async function () {
    cookie = await getAdminCookie();
    const gardens = await request.get('/api/gardens').set('Cookie', cookie);
    gardenId = gardens.body[0]?.id;
  });

  it('GET /api/export/logs/:gardenId', async function () {
    if (!gardenId) return;
    const res = await request.get(`/api/export/logs/${gardenId}`).set('Cookie', cookie);
    assert.strictEqual(res.status, 200);
    assert.ok(res.headers['content-type'].includes('text/csv'));
  });

  it('GET /api/export/plants/:gardenId', async function () {
    if (!gardenId) return;
    const res = await request.get(`/api/export/plants/${gardenId}`).set('Cookie', cookie);
    assert.strictEqual(res.status, 200);
    assert.ok(res.headers['content-type'].includes('text/csv'));
  });
});
