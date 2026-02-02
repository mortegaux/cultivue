/**
 * Seed the database with test data.
 * Run: node server/seed-test-data.js
 */
const db = require('./database');
const { v4: uuidv4 } = require('uuid');

function id() { return uuidv4(); }
function isoDate(daysAgo = 0) {
  const d = new Date(); d.setDate(d.getDate() - daysAgo);
  return d.toISOString();
}
function randomBetween(min, max) { return Math.round((Math.random() * (max - min) + min) * 10) / 10; }

// --- Locations ---
const locations = [
  { id: id(), name: 'Garage', description: 'Main indoor growing area with grow lights', sort_order: 0 },
  { id: id(), name: 'Backyard', description: 'Outdoor raised beds and containers', sort_order: 1 },
  { id: id(), name: 'Basement', description: 'Temperature-controlled grow room', sort_order: 2 },
  { id: id(), name: 'Kitchen Window', description: 'Herb windowsill garden', sort_order: 3 },
];
const insertLoc = db.prepare('INSERT OR IGNORE INTO locations (id, name, description, sort_order, created_at, updated_at) VALUES (?,?,?,?,?,?)');
for (const loc of locations) {
  insertLoc.run(loc.id, loc.name, loc.description, loc.sort_order, isoDate(60), isoDate(0));
}
console.log(`Inserted ${locations.length} locations`);

// --- Seeds ---
const seeds = [
  { id: id(), name: 'Beefsteak Tomato', variety: 'Big Boy', supplier: 'Burpee', quantity: 25, quantity_unit: 'seeds', days_to_germination: 7, expected_germination_rate: 85 },
  { id: id(), name: 'Genovese Basil', variety: 'Italian Large Leaf', supplier: 'Botanical Interests', quantity: 50, quantity_unit: 'seeds', days_to_germination: 5, expected_germination_rate: 90 },
  { id: id(), name: 'Butterhead Lettuce', variety: 'Bibb', supplier: 'Johnny\'s Seeds', quantity: 100, quantity_unit: 'seeds', days_to_germination: 4, expected_germination_rate: 92 },
  { id: id(), name: 'Carolina Reaper', variety: 'HP22B', supplier: 'Pepper Joe\'s', quantity: 10, quantity_unit: 'seeds', days_to_germination: 14, expected_germination_rate: 70 },
  { id: id(), name: 'Sugar Snap Pea', variety: 'Super Sugar Snap', supplier: 'Seed Savers', quantity: 30, quantity_unit: 'seeds', days_to_germination: 7, expected_germination_rate: 88 },
  { id: id(), name: 'Cherry Tomato', variety: 'Sweet Million', supplier: 'Burpee', quantity: 20, quantity_unit: 'seeds', days_to_germination: 6, expected_germination_rate: 90 },
  { id: id(), name: 'Thai Basil', variety: 'Siam Queen', supplier: 'Baker Creek', quantity: 40, quantity_unit: 'seeds', days_to_germination: 7, expected_germination_rate: 80 },
  { id: id(), name: 'Romaine Lettuce', variety: 'Parris Island Cos', supplier: 'Johnny\'s Seeds', quantity: 80, quantity_unit: 'seeds', days_to_germination: 4, expected_germination_rate: 93 },
];
const insertSeed = db.prepare('INSERT OR IGNORE INTO seeds (id, name, variety, supplier, purchase_date, quantity, quantity_unit, days_to_germination, expected_germination_rate, notes, created_at, updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)');
for (const s of seeds) {
  insertSeed.run(s.id, s.name, s.variety, s.supplier, isoDate(90), s.quantity, s.quantity_unit, s.days_to_germination, s.expected_germination_rate, null, isoDate(90), isoDate(0));
}
console.log(`Inserted ${seeds.length} seeds`);

// --- Gardens ---
const gardens = [
  { id: id(), name: 'DWC Lettuce Raft', system_type: 'dwc', type_id: 'hydro-dwc', location: locations[0], plant_types: 'vegetables', start_days_ago: 45 },
  { id: id(), name: 'Kratky Herbs', system_type: 'kratky', type_id: 'hydro-kratky', location: locations[3], plant_types: 'herbs', start_days_ago: 30 },
  { id: id(), name: 'NFT Tomatoes', system_type: 'nft', type_id: 'hydro-nft', location: locations[0], plant_types: 'vegetables', start_days_ago: 60 },
  { id: id(), name: 'Backyard Raised Bed', system_type: 'soil', type_id: 'soil-raised-bed', location: locations[1], plant_types: 'vegetables,herbs', start_days_ago: 90 },
  { id: id(), name: 'Indoor Peppers', system_type: 'drip', type_id: 'hydro-drip', location: locations[2], plant_types: 'vegetables', start_days_ago: 75 },
  { id: id(), name: 'Basement Greens', system_type: 'ebb_flow', type_id: 'hydro-ebb-flow', location: locations[2], plant_types: 'vegetables', start_days_ago: 20 },
];
const insertGarden = db.prepare('INSERT OR IGNORE INTO gardens (id, name, system_type, plant_types, start_date, is_active, garden_type_id, location_id) VALUES (?,?,?,?,?,1,?,?)');
for (const g of gardens) {
  insertGarden.run(g.id, g.name, g.system_type, g.plant_types, isoDate(g.start_days_ago), g.type_id, g.location.id);
}
console.log(`Inserted ${gardens.length} gardens`);

// --- Plants ---
const plantsData = [
  // DWC Lettuce Raft
  { garden: gardens[0], name: 'Bibb Lettuce #1', type: 'vegetables', species: 'Lactuca sativa', stage: 'vegetative', seeded_ago: 40, seed: seeds[2] },
  { garden: gardens[0], name: 'Bibb Lettuce #2', type: 'vegetables', species: 'Lactuca sativa', stage: 'vegetative', seeded_ago: 40, seed: seeds[2] },
  { garden: gardens[0], name: 'Bibb Lettuce #3', type: 'vegetables', species: 'Lactuca sativa', stage: 'harvest', seeded_ago: 40, seed: seeds[2] },
  { garden: gardens[0], name: 'Romaine #1', type: 'vegetables', species: 'Lactuca sativa var. longifolia', stage: 'vegetative', seeded_ago: 35, seed: seeds[7] },
  { garden: gardens[0], name: 'Romaine #2', type: 'vegetables', species: 'Lactuca sativa var. longifolia', stage: 'seedling', seeded_ago: 14, seed: seeds[7] },
  // Kratky Herbs
  { garden: gardens[1], name: 'Genovese Basil', type: 'herbs', species: 'Ocimum basilicum', stage: 'vegetative', seeded_ago: 25, seed: seeds[1] },
  { garden: gardens[1], name: 'Thai Basil', type: 'herbs', species: 'Ocimum basilicum var. thyrsiflora', stage: 'flowering', seeded_ago: 28, seed: seeds[6] },
  { garden: gardens[1], name: 'Cilantro', type: 'herbs', species: 'Coriandrum sativum', stage: 'vegetative', seeded_ago: 18 },
  // NFT Tomatoes
  { garden: gardens[2], name: 'Big Boy #1', type: 'vegetables', species: 'Solanum lycopersicum', stage: 'fruiting', seeded_ago: 55, seed: seeds[0] },
  { garden: gardens[2], name: 'Big Boy #2', type: 'vegetables', species: 'Solanum lycopersicum', stage: 'flowering', seeded_ago: 55, seed: seeds[0] },
  { garden: gardens[2], name: 'Sweet Million Cherry', type: 'vegetables', species: 'Solanum lycopersicum', stage: 'fruiting', seeded_ago: 50, seed: seeds[5] },
  { garden: gardens[2], name: 'Sweet Million Cherry #2', type: 'vegetables', species: 'Solanum lycopersicum', stage: 'vegetative', seeded_ago: 30, seed: seeds[5] },
  // Backyard Raised Bed
  { garden: gardens[3], name: 'Sugar Snap Peas', type: 'vegetables', species: 'Pisum sativum', stage: 'harvest', seeded_ago: 80, seed: seeds[4] },
  { garden: gardens[3], name: 'Basil Patch', type: 'herbs', species: 'Ocimum basilicum', stage: 'vegetative', seeded_ago: 45, seed: seeds[1] },
  { garden: gardens[3], name: 'Tomato - Garden', type: 'vegetables', species: 'Solanum lycopersicum', stage: 'flowering', seeded_ago: 70, seed: seeds[0] },
  // Indoor Peppers
  { garden: gardens[4], name: 'Carolina Reaper #1', type: 'vegetables', species: 'Capsicum chinense', stage: 'flowering', seeded_ago: 70, seed: seeds[3] },
  { garden: gardens[4], name: 'Carolina Reaper #2', type: 'vegetables', species: 'Capsicum chinense', stage: 'vegetative', seeded_ago: 70, seed: seeds[3] },
  { garden: gardens[4], name: 'Carolina Reaper #3', type: 'vegetables', species: 'Capsicum chinense', stage: 'fruiting', seeded_ago: 70, seed: seeds[3] },
  // Basement Greens
  { garden: gardens[5], name: 'Lettuce Mix A', type: 'vegetables', species: 'Lactuca sativa', stage: 'seedling', seeded_ago: 12, seed: seeds[2] },
  { garden: gardens[5], name: 'Lettuce Mix B', type: 'vegetables', species: 'Lactuca sativa', stage: 'germination', seeded_ago: 5, seed: seeds[7] },
];
const plantIds = [];
const insertPlant = db.prepare('INSERT OR IGNORE INTO plants (id, garden_id, name, plant_type, species, seeded_date, current_stage, notes, created_at, is_active, seed_id) VALUES (?,?,?,?,?,?,?,?,?,1,?)');
for (const p of plantsData) {
  const pid = id();
  plantIds.push(pid);
  insertPlant.run(pid, p.garden.id, p.name, p.type, p.species, isoDate(p.seeded_ago), p.stage, null, isoDate(p.seeded_ago), p.seed ? p.seed.id : null);
}
console.log(`Inserted ${plantsData.length} plants`);

// --- Log Entries (sensor data for each garden over time) ---
const insertLog = db.prepare('INSERT OR IGNORE INTO log_entries (id, garden_id, timestamp, ph, ppm, water_temp, notes, metric_data) VALUES (?,?,?,?,?,?,?,?)');
let logCount = 0;
for (const g of gardens) {
  const isHydro = g.type_id.startsWith('hydro');
  const numLogs = Math.floor(Math.random() * 10) + 8;
  for (let i = 0; i < numLogs; i++) {
    const daysAgo = Math.floor(Math.random() * g.start_days_ago);
    const ph = isHydro ? randomBetween(5.2, 6.8) : randomBetween(6.0, 7.2);
    const ppm = isHydro ? Math.round(randomBetween(600, 1600)) : null;
    const waterTemp = isHydro ? randomBetween(65, 78) : null;
    const metricData = {};
    if (isHydro) {
      metricData.ph = ph;
      metricData.ppm = ppm;
      metricData.water_temp = waterTemp;
    } else {
      metricData.soil_ph = ph;
      metricData.soil_moisture = Math.round(randomBetween(30, 80));
    }
    const notes = i === 0 ? 'Initial reading' : null;
    insertLog.run(id(), g.id, isoDate(daysAgo), ph, ppm, waterTemp, notes, JSON.stringify(metricData));
    logCount++;
  }
}
console.log(`Inserted ${logCount} log entries`);

// --- Tasks ---
const insertTask = db.prepare('INSERT OR IGNORE INTO tasks (id, garden_id, plant_id, title, description, due_date, is_completed, completed_at, priority, is_recurring, recurring_days) VALUES (?,?,?,?,?,?,?,?,?,?,?)');
const taskDefs = [
  // Active tasks
  { garden: gardens[0], title: 'Check pH levels', desc: 'Weekly pH check for DWC system', due_days: 1, priority: 'high', recurring: true, recurring_days: 7 },
  { garden: gardens[0], title: 'Top off reservoir', desc: 'Add water to maintain level', due_days: 2, priority: 'medium' },
  { garden: gardens[2], title: 'Prune tomato suckers', desc: 'Remove side shoots for better fruit production', due_days: 0, priority: 'medium' },
  { garden: gardens[2], title: 'Change nutrient solution', desc: 'Full reservoir change', due_days: 3, priority: 'high', recurring: true, recurring_days: 14 },
  { garden: gardens[4], title: 'Increase light hours', desc: 'Peppers need 14h light for flowering', due_days: -1, priority: 'high' },
  { garden: gardens[1], title: 'Harvest basil tops', desc: 'Pinch off flower buds', due_days: 2, priority: 'low' },
  { garden: gardens[3], title: 'Water raised bed', desc: 'Deep watering needed', due_days: 0, priority: 'medium', recurring: true, recurring_days: 3 },
  { garden: gardens[5], title: 'Thin lettuce seedlings', desc: 'Space to 6 inches apart', due_days: 4, priority: 'medium' },
  { garden: null, title: 'Order new nutrients', desc: 'Running low on General Hydroponics Flora series', due_days: 5, priority: 'low' },
  { garden: null, title: 'Clean pH meter', desc: 'Calibrate and clean probe', due_days: 7, priority: 'medium', recurring: true, recurring_days: 30 },
  // Completed tasks
  { garden: gardens[0], title: 'Set up DWC system', desc: 'Initial setup', due_days: -40, priority: 'high', completed: true, completed_ago: 44 },
  { garden: gardens[2], title: 'Transplant tomato seedlings', desc: 'Move to NFT channels', due_days: -30, priority: 'high', completed: true, completed_ago: 32 },
  { garden: gardens[4], title: 'Germinate pepper seeds', desc: 'Start in paper towel', due_days: -70, priority: 'high', completed: true, completed_ago: 72 },
  { garden: gardens[3], title: 'Amend soil with compost', desc: 'Spring prep', due_days: -85, priority: 'medium', completed: true, completed_ago: 88 },
];
let taskCount = 0;
for (const t of taskDefs) {
  const isCompleted = t.completed ? 1 : 0;
  insertTask.run(
    id(),
    t.garden ? t.garden.id : null,
    null,
    t.title,
    t.desc,
    isoDate(-t.due_days),
    isCompleted,
    isCompleted ? isoDate(t.completed_ago) : null,
    t.priority,
    t.recurring ? 1 : 0,
    t.recurring_days || null
  );
  taskCount++;
}
console.log(`Inserted ${taskCount} tasks`);

console.log('\nTest data seeded successfully!');
