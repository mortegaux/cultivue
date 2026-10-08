'use strict';

const DAY_MAP = {
  sun: 0, mon: 1, tue: 2, wed: 3, thu: 4, fri: 5, sat: 6
};
const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

/**
 * Normalizes days of week array.
 * Accepts arrays or comma/JSON strings: e.g. "mon,wed,fri" or ["mon", "wed"] -> ["mon", "wed", "fri"]
 */
function parseDaysOfWeek(val) {
  if (!val) return [];
  if (Array.isArray(val)) return val.map(d => String(d).toLowerCase().trim()).filter(d => DAY_MAP[d] !== undefined);
  if (typeof val === 'string') {
    try {
      const parsed = JSON.parse(val);
      if (Array.isArray(parsed)) return parsed.map(d => String(d).toLowerCase().trim()).filter(d => DAY_MAP[d] !== undefined);
    } catch {
      return val.split(',').map(d => String(d).toLowerCase().trim()).filter(d => DAY_MAP[d] !== undefined);
    }
  }
  return [];
}

/**
 * Normalizes times of day array.
 * Accepts arrays or comma/JSON strings: e.g. ["08:00", "18:00"] or "08:00,18:00" -> ["08:00", "18:00"] (sorted)
 */
function parseTimesOfDay(val) {
  if (!val) return [];
  let list = [];
  if (Array.isArray(val)) {
    list = val;
  } else if (typeof val === 'string') {
    try {
      const parsed = JSON.parse(val);
      if (Array.isArray(parsed)) list = parsed;
      else list = val.split(',');
    } catch {
      list = val.split(',');
    }
  }
  return list
    .map(t => String(t).trim())
    .filter(t => /^([01]\d|2[0-3]):[0-5]\d$/.test(t))
    .sort();
}

/**
 * Calculates next occurrence { due_date, due_time }
 */
function calculateNextOccurrence(task) {
  const currentDateStr = String(task.due_date || '').slice(0, 10);
  const currentTimeStr = task.due_time ? String(task.due_time).slice(0, 5) : null;
  const times = parseTimesOfDay(task.times_of_day);
  const recurrenceType = task.recurrence_type || 'interval';
  const daysOfWeek = parseDaysOfWeek(task.days_of_week);
  const intervalDays = Math.max(1, parseInt(task.recurring_days, 10) || 1);

  // Parse current date in UTC to avoid timezone off-by-one
  const match = currentDateStr.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return null;
  const currentYear = +match[1];
  const currentMonth = +match[2] - 1;
  const currentDay = +match[3];
  const currentDate = new Date(Date.UTC(currentYear, currentMonth, currentDay));

  // Check if multiple times per day and if there's a next time on the same date
  if (times.length > 1 && currentTimeStr) {
    const nextTimeIndex = times.findIndex(t => t > currentTimeStr);
    if (nextTimeIndex !== -1) {
      return {
        due_date: currentDateStr,
        due_time: times[nextTimeIndex]
      };
    }
  }

  const firstTimeOfDay = times.length ? times[0] : (currentTimeStr || null);

  // If recurrence is by days of week:
  if (recurrenceType === 'days_of_week' && daysOfWeek.length > 0) {
    const targetDayNums = [...new Set(daysOfWeek.map(d => DAY_MAP[d]))].sort((a, b) => a - b);
    const currentDayOfWeek = currentDate.getUTCDay();

    // Find next day in the list strictly after currentDayOfWeek
    let daysToAdd = null;
    for (const d of targetDayNums) {
      if (d > currentDayOfWeek) {
        daysToAdd = d - currentDayOfWeek;
        break;
      }
    }
    // If not found, wrap around to first day next week
    if (daysToAdd === null) {
      daysToAdd = (7 - currentDayOfWeek) + targetDayNums[0];
    }

    const nextDate = new Date(Date.UTC(currentYear, currentMonth, currentDay + daysToAdd));
    return {
      due_date: nextDate.toISOString().slice(0, 10),
      due_time: firstTimeOfDay
    };
  }

  // Otherwise, default to interval (days):
  const nextDate = new Date(Date.UTC(currentYear, currentMonth, currentDay + intervalDays));
  return {
    due_date: nextDate.toISOString().slice(0, 10),
    due_time: firstTimeOfDay
  };
}

/**
 * Checks if a task should be terminated based on its termination settings.
 * Returns null if not terminated, or a reason string if terminated.
 */
function checkTerminationCondition(db, task, nextOccurrence) {
  if (task.is_disabled) {
    return task.disabled_reason || 'Schedule is disabled';
  }

  const endType = task.end_type || 'never';

  // 1. End on Date
  if (endType === 'date' && task.end_date) {
    const targetDate = nextOccurrence ? nextOccurrence.due_date : String(task.due_date || '').slice(0, 10);
    if (targetDate > task.end_date) {
      return `Schedule ended on ${task.end_date}`;
    }
  }

  // 2. End after Occurrences
  if (endType === 'occurrences' && task.end_occurrences) {
    const currentCount = parseInt(task.occurrence_count, 10) || 0;
    if (currentCount >= task.end_occurrences) {
      return `Schedule ended after ${task.end_occurrences} occurrence${task.end_occurrences > 1 ? 's' : ''}`;
    }
  }

  // 3. Condition-based (garden-scoped)
  if (endType === 'condition' && task.end_condition && task.garden_id) {
    if (task.end_condition === 'all_harvested') {
      const activePlants = db.prepare('SELECT id, current_stage FROM plants WHERE garden_id = ? AND is_active = 1').all(task.garden_id);
      if (activePlants.length > 0 && activePlants.every(p => p.current_stage === 'harvest')) {
        return 'All plants in garden are harvested';
      }
    } else if (task.end_condition === 'all_transplanted') {
      const activePlants = db.prepare('SELECT id, current_stage FROM plants WHERE garden_id = ? AND is_active = 1').all(task.garden_id);
      const postTransplant = ['seedling', 'vegetative', 'flowering', 'fruiting', 'harvest', 'established', 'thriving'];
      if (activePlants.length > 0 && activePlants.every(p => postTransplant.includes(p.current_stage))) {
        return 'All plants in garden are transplanted';
      }
    } else if (task.end_condition === 'garden_empty') {
      const activeCount = db.prepare('SELECT COUNT(*) as count FROM plants WHERE garden_id = ? AND is_active = 1').get(task.garden_id);
      if (!activeCount || activeCount.count === 0) {
        return 'Garden is empty (no active plants)';
      }
    }
  }

  return null;
}

module.exports = {
  DAY_MAP,
  DAY_NAMES,
  parseDaysOfWeek,
  parseTimesOfDay,
  calculateNextOccurrence,
  checkTerminationCondition
};
