'use strict';

const assert = require('assert');

// Simulate the logic of buildInitialPlantData from app.js in a Node unit test
function buildInitialPlantData(crop, month, state = { seeds: [], selectedGardenId: 'g1', gardens: [{ id: 'g1' }] }) {
  if (!crop) return {};
  const currentMonth = new Date().getMonth() + 1;
  const m = month || currentMonth;

  const name = crop.name || '';
  const species = crop.name || '';

  const cat = (crop.category || '').toLowerCase();
  let plant_type = 'vegetables';
  if (cat === 'vegetable') plant_type = 'vegetables';
  else if (cat === 'herb') plant_type = 'herbs';
  else if (cat === 'fruit') plant_type = 'fruits';
  else if (cat === 'flower') plant_type = 'flowers';
  else if (cat === 'cannabis') plant_type = 'cannabis';
  else if (cat === 'houseplant') plant_type = 'houseplant';
  else plant_type = 'other';

  let current_stage = cat === 'houseplant' ? 'acquired' : 'seed';
  if (crop.transplant_start && m >= crop.transplant_start && m <= crop.transplant_end) {
    current_stage = 'seedling';
  } else if (crop.harvest_start && m >= crop.harvest_start && m <= crop.harvest_end) {
    current_stage = 'harvest';
  } else if ((crop.sow_indoor_start && m >= crop.sow_indoor_start && m <= crop.sow_indoor_end) ||
             (crop.sow_outdoor_start && m >= crop.sow_outdoor_start && m <= crop.sow_outdoor_end)) {
    current_stage = 'seed';
  } else if (crop.transplant_start && currentMonth >= crop.transplant_start && currentMonth <= crop.transplant_end) {
    current_stage = 'seedling';
  } else if (crop.harvest_start && currentMonth >= crop.harvest_start && currentMonth <= crop.harvest_end) {
    current_stage = 'harvest';
  }

  const todayLocal = () => {
    const n = new Date();
    return `${n.getFullYear()}-${String(n.getMonth() + 1).padStart(2, '0')}-${String(n.getDate()).padStart(2, '0')}`;
  };

  let seeded_date = todayLocal();
  if (month && month !== currentMonth) {
    const year = new Date().getFullYear();
    seeded_date = `${year}-${String(month).padStart(2, '0')}-01`;
  }

  let notes = crop.notes ? crop.notes.trim() : '';
  if (crop.days_to_maturity_min) {
    const maturity = `Days to maturity: ${crop.days_to_maturity_min}${crop.days_to_maturity_max ? '–' + crop.days_to_maturity_max : ''} days.`;
    notes = notes ? `${notes}\n${maturity}` : maturity;
  }

  let seed_id = '';
  if (state.seeds && state.seeds.length) {
    const cName = name.toLowerCase().trim();
    let found = state.seeds.find(s => s.name && s.name.toLowerCase().trim() === cName);
    if (!found) found = state.seeds.find(s => s.variety && s.variety.toLowerCase().trim() === cName);
    if (!found) {
      found = state.seeds.find(s => {
        const sName = (s.name || '').toLowerCase();
        const vName = (s.variety || '').toLowerCase();
        return sName.includes(cName) || cName.includes(sName) || vName.includes(cName) || cName.includes(vName);
      });
    }
    if (found) seed_id = found.id;
  }

  return {
    name,
    species,
    plant_type,
    current_stage,
    seeded_date,
    notes,
    seed_id,
    garden_id: state.selectedGardenId || (state.gardens[0]?.id)
  };
}

describe('Calendar Plant Creation Helper', function () {
  const tomatoCrop = {
    id: 'tomato-temperate',
    name: 'Tomato',
    category: 'vegetable',
    sow_indoor_start: 2,
    sow_indoor_end: 3,
    transplant_start: 5,
    transplant_end: 6,
    harvest_start: 7,
    harvest_end: 10,
    days_to_maturity_min: 60,
    days_to_maturity_max: 85,
    notes: 'Start indoors 6-8 weeks before last frost.'
  };

  it('auto-populates basic crop details (name, species, plant_type, notes)', function () {
    const data = buildInitialPlantData(tomatoCrop, 2);
    assert.strictEqual(data.name, 'Tomato');
    assert.strictEqual(data.species, 'Tomato');
    assert.strictEqual(data.plant_type, 'vegetables');
    assert.ok(data.notes.includes('Start indoors 6-8 weeks before last frost.'));
    assert.ok(data.notes.includes('Days to maturity: 60–85 days.'));
  });

  it('selects seed stage during indoor/outdoor sow months', function () {
    const data = buildInitialPlantData(tomatoCrop, 3);
    assert.strictEqual(data.current_stage, 'seed');
  });

  it('selects seedling stage during transplant months', function () {
    const data = buildInitialPlantData(tomatoCrop, 5);
    assert.strictEqual(data.current_stage, 'seedling');
  });

  it('selects harvest stage during harvest months', function () {
    const data = buildInitialPlantData(tomatoCrop, 8);
    assert.strictEqual(data.current_stage, 'harvest');
  });

  it('maps crop categories correctly to plant types', function () {
    assert.strictEqual(buildInitialPlantData({ name: 'Basil', category: 'herb' }).plant_type, 'herbs');
    assert.strictEqual(buildInitialPlantData({ name: 'Strawberry', category: 'fruit' }).plant_type, 'fruits');
    assert.strictEqual(buildInitialPlantData({ name: 'Marigold', category: 'flower' }).plant_type, 'flowers');
  });

  it('pre-selects matching seed from inventory when available', function () {
    const stateWithSeeds = {
      seeds: [
        { id: 'seed-1', name: 'Beefsteak Tomato', variety: 'Heirloom' },
        { id: 'seed-2', name: 'Sweet Basil', variety: 'Genovese' }
      ],
      selectedGardenId: 'garden-main',
      gardens: [{ id: 'garden-main' }]
    };

    const tomatoData = buildInitialPlantData(tomatoCrop, 3, stateWithSeeds);
    assert.strictEqual(tomatoData.seed_id, 'seed-1');
    assert.strictEqual(tomatoData.garden_id, 'garden-main');

    const basilData = buildInitialPlantData({ name: 'Basil', category: 'herb' }, 4, stateWithSeeds);
    assert.strictEqual(basilData.seed_id, 'seed-2');
  });
});
