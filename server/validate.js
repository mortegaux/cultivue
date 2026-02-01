// Strict allow-lists for enum-type fields
const SYSTEM_TYPES = ['dwc', 'kratky', 'nft', 'ebbAndFlow', 'aeroponics', 'drip'];
const PLANT_TYPES = ['vegetables', 'fruits', 'herbs', 'cannabis', 'flowers', 'other'];
const GROWTH_STAGES = ['seed', 'germination', 'seedling', 'vegetative', 'flowering', 'fruiting', 'harvest'];
const PRIORITIES = ['low', 'medium', 'high'];
const QUANTITY_UNITS = ['packets', 'seeds', 'grams'];
const FAILURE_STAGES = ['seed', 'germination', 'seedling'];

// Sanitize string: trim, limit length, strip control chars
function str(val, maxLen = 500) {
  if (val == null) return null;
  if (typeof val !== 'string') return null;
  // Strip control characters except newlines/tabs
  return val.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '').trim().slice(0, maxLen);
}

// Require non-empty string
function reqStr(val, maxLen = 500) {
  const s = str(val, maxLen);
  if (!s || s.length === 0) return undefined; // signals invalid
  return s;
}

// Validate number in range
function num(val, min, max) {
  if (val == null || val === '') return null;
  const n = Number(val);
  if (!Number.isFinite(n)) return null;
  if (min != null && n < min) return null;
  if (max != null && n > max) return null;
  return n;
}

// Require number in range
function reqNum(val, min, max) {
  const n = num(val, min, max);
  if (n == null) return undefined;
  return n;
}

// Validate integer
function int(val, min, max) {
  const n = num(val, min, max);
  if (n == null) return null;
  return Math.round(n);
}

// Validate ISO date string
function isoDate(val) {
  if (!val || typeof val !== 'string') return null;
  const d = new Date(val);
  if (isNaN(d.getTime())) return null;
  return d.toISOString();
}

// Validate enum value against allow-list
function enumVal(val, allowed) {
  if (!val || typeof val !== 'string') return null;
  return allowed.includes(val) ? val : null;
}

// Validate UUID format (basic check)
function isUUID(val) {
  return typeof val === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(val);
}

// Validate array of enum values
function enumArray(val, allowed) {
  if (!Array.isArray(val)) return null;
  const valid = val.filter(v => typeof v === 'string' && allowed.includes(v));
  return valid.length > 0 ? valid : null;
}

module.exports = {
  SYSTEM_TYPES, PLANT_TYPES, GROWTH_STAGES, PRIORITIES, QUANTITY_UNITS, FAILURE_STAGES,
  str, reqStr, num, reqNum, int, isoDate, enumVal, isUUID, enumArray
};
