'use strict';

require('./setup');
const assert = require('assert');
const supertest = require('supertest');
const recurrence = require('../server/recurrence');

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

describe('Recurrence Logic Unit Tests', function () {
  describe('parseDaysOfWeek', function () {
    it('handles arrays, comma strings, JSON strings, and invalid days', function () {
      assert.deepStrictEqual(recurrence.parseDaysOfWeek(['mon', 'Wed', 'FRI']), ['mon', 'wed', 'fri']);
      assert.deepStrictEqual(recurrence.parseDaysOfWeek('tue,thu,sat'), ['tue', 'thu', 'sat']);
      assert.deepStrictEqual(recurrence.parseDaysOfWeek('["sun", "mon"]'), ['sun', 'mon']);
      assert.deepStrictEqual(recurrence.parseDaysOfWeek('invalid,mon,unknown'), ['mon']);
      assert.deepStrictEqual(recurrence.parseDaysOfWeek(null), []);
    });
  });

  describe('parseTimesOfDay', function () {
    it('handles arrays, strings, JSON, sorts times, and validates format', function () {
      assert.deepStrictEqual(recurrence.parseTimesOfDay(['18:00', '08:30']), ['08:30', '18:00']);
      assert.deepStrictEqual(recurrence.parseTimesOfDay('14:00,09:00'), ['09:00', '14:00']);
      assert.deepStrictEqual(recurrence.parseTimesOfDay('["21:00", "07:00"]'), ['07:00', '21:00']);
      assert.deepStrictEqual(recurrence.parseTimesOfDay('invalid,08:00,99:99'), ['08:00']);
      assert.deepStrictEqual(recurrence.parseTimesOfDay(null), []);
    });
  });

  describe('calculateNextOccurrence', function () {
    it('advances to next time of day on the same date when multiple times exist', function () {
      const task = {
        due_date: '2026-06-01',
        due_time: '08:00',
        times_of_day: ['08:00', '14:00', '20:00'],
        recurrence_type: 'interval',
        recurring_days: 1
      };
      const next = recurrence.calculateNextOccurrence(task);
      assert.strictEqual(next.due_date, '2026-06-01');
      assert.strictEqual(next.due_time, '14:00');
    });

    it('advances to the next interval date at the first time when past the last time of day', function () {
      const task = {
        due_date: '2026-06-01',
        due_time: '20:00',
        times_of_day: ['08:00', '14:00', '20:00'],
        recurrence_type: 'interval',
        recurring_days: 2
      };
      const next = recurrence.calculateNextOccurrence(task);
      assert.strictEqual(next.due_date, '2026-06-03');
      assert.strictEqual(next.due_time, '08:00');
    });

    it('advances to the next day of the week correctly', function () {
      // 2026-06-01 is a Monday
      const task = {
        due_date: '2026-06-01',
        due_time: '09:00',
        times_of_day: ['09:00'],
        recurrence_type: 'days_of_week',
        days_of_week: ['mon', 'wed', 'fri']
      };
      // Next after Monday 2026-06-01 should be Wednesday 2026-06-03
      const next = recurrence.calculateNextOccurrence(task);
      assert.strictEqual(next.due_date, '2026-06-03');
      assert.strictEqual(next.due_time, '09:00');

      // Next after Friday 2026-06-05 should wrap around to Monday 2026-06-08
      const friTask = {
        due_date: '2026-06-05',
        due_time: '09:00',
        times_of_day: ['09:00'],
        recurrence_type: 'days_of_week',
        days_of_week: ['mon', 'wed', 'fri']
      };
      const nextAfterFri = recurrence.calculateNextOccurrence(friTask);
      assert.strictEqual(nextAfterFri.due_date, '2026-06-08');
      assert.strictEqual(nextAfterFri.due_time, '09:00');
    });
  });

  describe('checkTerminationCondition', function () {
    const mockDb = {
      prepare: () => ({
        all: () => [],
        get: () => ({ count: 0 })
      })
    };

    it('handles date termination', function () {
      const task = {
        end_type: 'date',
        end_date: '2026-06-10'
      };
      assert.strictEqual(recurrence.checkTerminationCondition(mockDb, task, { due_date: '2026-06-09' }), null);
      assert.strictEqual(recurrence.checkTerminationCondition(mockDb, task, { due_date: '2026-06-10' }), null);
      assert.ok(recurrence.checkTerminationCondition(mockDb, task, { due_date: '2026-06-11' }).includes('Schedule ended on 2026-06-10'));
    });

    it('handles occurrences termination', function () {
      const task = {
        end_type: 'occurrences',
        end_occurrences: 3,
        occurrence_count: 2
      };
      assert.strictEqual(recurrence.checkTerminationCondition(mockDb, task, { due_date: '2026-06-10' }), null);
      task.occurrence_count = 3;
      assert.ok(recurrence.checkTerminationCondition(mockDb, task, { due_date: '2026-06-10' }).includes('Schedule ended after 3 occurrences'));
    });
  });
});

describe('Recurring Tasks API Endpoints', function () {
  let cookie, gardenId;

  before(async function () {
    cookie = await getAdminCookie();
    const gRes = await request.post('/api/gardens')
      .set('Cookie', cookie)
      .send({ name: 'Recurring Tasks Test Garden', garden_type_id: 'hydro-dwc' });
    assert.strictEqual(gRes.status, 201);
    gardenId = gRes.body.id;
  });

  after(async function () {
    if (gardenId) {
      await request.delete(`/api/gardens/${gardenId}`).set('Cookie', cookie);
    }
  });

  it('POST /api/gardens/:id/tasks — create recurring task with days_of_week and multi-times', async function () {
    const res = await request.post(`/api/gardens/${gardenId}/tasks`)
      .set('Cookie', cookie)
      .send({
        title: 'Morning & Evening Nutrient Check',
        due_date: '2026-06-01',
        priority: 'high',
        is_recurring: true,
        recurrence_type: 'days_of_week',
        days_of_week: ['mon', 'wed', 'fri'],
        times_of_day: ['08:00', '18:00'],
        end_type: 'never'
      });

    assert.strictEqual(res.status, 201);
    assert.strictEqual(res.body.title, 'Morning & Evening Nutrient Check');
    assert.strictEqual(res.body.is_recurring, true);
    assert.strictEqual(res.body.recurrence_type, 'days_of_week');
    assert.deepStrictEqual(res.body.days_of_week, ['mon', 'wed', 'fri']);
    assert.deepStrictEqual(res.body.times_of_day, ['08:00', '18:00']);
    assert.strictEqual(res.body.due_time, '08:00');
    assert.strictEqual(res.body.is_disabled, false);

    // Toggle completion -> should spawn same-day occurrence at 18:00
    const toggleRes = await request.patch(`/api/tasks/${res.body.id}/toggle`).set('Cookie', cookie);
    assert.strictEqual(toggleRes.status, 200);
    assert.strictEqual(toggleRes.body.is_completed, true);
    assert.strictEqual(toggleRes.body.next_spawned, true);

    const listRes = await request.get(`/api/gardens/${gardenId}/tasks`).set('Cookie', cookie);
    const activeTasks = listRes.body.filter(t => !t.is_completed);
    assert.strictEqual(activeTasks.length, 1);
    const spawned = activeTasks[0];
    assert.strictEqual(spawned.due_date, '2026-06-01');
    assert.strictEqual(spawned.due_time, '18:00');
    assert.strictEqual(spawned.occurrence_count, 1);

    // Toggle 18:00 task -> should spawn Wednesday 2026-06-03 at 08:00
    const toggle2Res = await request.patch(`/api/tasks/${spawned.id}/toggle`).set('Cookie', cookie);
    assert.strictEqual(toggle2Res.status, 200);
    assert.strictEqual(toggle2Res.body.next_spawned, true);

    const listRes2 = await request.get(`/api/gardens/${gardenId}/tasks`).set('Cookie', cookie);
    const activeTasks2 = listRes2.body.filter(t => !t.is_completed);
    assert.strictEqual(activeTasks2.length, 1);
    const spawned2 = activeTasks2[0];
    assert.strictEqual(spawned2.due_date, '2026-06-03');
    assert.strictEqual(spawned2.due_time, '08:00');
  });

  it('handles occurrences termination condition and enters disabled state', async function () {
    const res = await request.post(`/api/gardens/${gardenId}/tasks`)
      .set('Cookie', cookie)
      .send({
        title: 'Two-Time Flush',
        due_date: '2026-06-01',
        is_recurring: true,
        recurring_days: 1,
        recurrence_type: 'interval',
        end_type: 'occurrences',
        end_occurrences: 2
      });

    assert.strictEqual(res.status, 201);
    const initialTaskId = res.body.id;

    // Toggle occurrence 1
    const toggle1 = await request.patch(`/api/tasks/${initialTaskId}/toggle`).set('Cookie', cookie);
    assert.strictEqual(toggle1.status, 200);
    assert.strictEqual(toggle1.body.next_spawned, true);

    const list1 = await request.get(`/api/gardens/${gardenId}/tasks`).set('Cookie', cookie);
    const active1 = list1.body.find(t => !t.is_completed && t.title === 'Two-Time Flush');
    assert.ok(active1);
    assert.strictEqual(active1.occurrence_count, 1);

    // Toggle occurrence 2 -> should terminate condition and set task to disabled
    const toggle2 = await request.patch(`/api/tasks/${active1.id}/toggle`).set('Cookie', cookie);
    assert.strictEqual(toggle2.status, 200);
    assert.strictEqual(toggle2.body.schedule_ended, true);
    assert.ok(toggle2.body.disabled_reason.includes('Schedule ended after 2 occurrences'));
    assert.strictEqual(toggle2.body.next_spawned, false);

    // Verify task is disabled in DB
    const list2 = await request.get(`/api/gardens/${gardenId}/tasks`).set('Cookie', cookie);
    const completedTask = list2.body.find(t => t.id === active1.id);
    assert.ok(completedTask);
    assert.strictEqual(completedTask.is_disabled, true);
    assert.ok(completedTask.disabled_reason.includes('2 occurrences'));
  });

  it('handles garden-scoped termination condition (garden_empty)', async function () {
    // Current garden has 0 active plants, so garden_empty condition is met immediately on toggle
    const res = await request.post(`/api/gardens/${gardenId}/tasks`)
      .set('Cookie', cookie)
      .send({
        title: 'Condition Test - Empty Garden Task',
        due_date: '2026-06-01',
        is_recurring: true,
        recurring_days: 1,
        end_type: 'condition',
        end_condition: 'garden_empty'
      });

    assert.strictEqual(res.status, 201);

    const toggle = await request.patch(`/api/tasks/${res.body.id}/toggle`).set('Cookie', cookie);
    assert.strictEqual(toggle.status, 200);
    assert.strictEqual(toggle.body.schedule_ended, true);
    assert.strictEqual(toggle.body.disabled_reason, 'Garden is empty (no active plants)');
    assert.strictEqual(toggle.body.next_spawned, false);
  });

  it('PATCH /api/tasks/:id/disable and PATCH /api/tasks/:id/re-enable', async function () {
    const res = await request.post(`/api/gardens/${gardenId}/tasks`)
      .set('Cookie', cookie)
      .send({
        title: 'Manual Pause Test',
        due_date: '2026-06-01',
        is_recurring: true,
        recurring_days: 3
      });
    assert.strictEqual(res.status, 201);
    const taskId = res.body.id;

    // Disable
    const disableRes = await request.patch(`/api/tasks/${taskId}/disable`)
      .set('Cookie', cookie)
      .send({ reason: 'Paused for maintenance' });
    assert.strictEqual(disableRes.status, 200);
    assert.strictEqual(disableRes.body.success, true);
    assert.strictEqual(disableRes.body.disabled_reason, 'Paused for maintenance');

    // Verify disabled
    const getDisabled = await request.get(`/api/tasks`).set('Cookie', cookie);
    const taskDisabled = getDisabled.body.find(t => t.id === taskId);
    assert.strictEqual(taskDisabled.is_disabled, true);
    assert.strictEqual(taskDisabled.disabled_reason, 'Paused for maintenance');

    // Re-enable
    const reEnableRes = await request.patch(`/api/tasks/${taskId}/re-enable`)
      .set('Cookie', cookie);
    assert.strictEqual(reEnableRes.status, 200);
    assert.strictEqual(reEnableRes.body.success, true);

    // Verify re-enabled
    const getReEnabled = await request.get(`/api/tasks`).set('Cookie', cookie);
    const taskReEnabled = getReEnabled.body.find(t => t.id === taskId);
    assert.strictEqual(taskReEnabled.is_disabled, false);
    assert.strictEqual(taskReEnabled.disabled_reason, null);

    // Cleanup
    await request.delete(`/api/tasks/${taskId}`).set('Cookie', cookie);
  });
});
