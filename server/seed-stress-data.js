/**
 * Stress-test seed data - lots of everything.
 * Run: node server/seed-stress-data.js
 */
const db = require('./database');
const { v4: uuidv4 } = require('uuid');

function id() { return uuidv4(); }
function isoDate(daysAgo = 0) {
  const d = new Date(); d.setDate(d.getDate() - daysAgo);
  return d.toISOString();
}
function rand(min, max) { return Math.round((Math.random() * (max - min) + min) * 10) / 10; }
function randInt(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; }
function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }

// --- Locations ---
const locationNames = [
  'Garage', 'Backyard', 'Basement', 'Kitchen Window', 'Greenhouse',
  'Spare Bedroom', 'Balcony', 'Rooftop', 'Side Yard', 'Shed',
  'Living Room Shelf', 'Sunroom', 'Closet Grow', 'Patio', 'Front Porch'
];
const locations = locationNames.map((name, i) => ({ id: id(), name, description: `Growing area #${i + 1}`, sort_order: i }));
const insertLoc = db.prepare('INSERT OR IGNORE INTO locations (id, name, description, sort_order, created_at, updated_at) VALUES (?,?,?,?,?,?)');
for (const loc of locations) {
  insertLoc.run(loc.id, loc.name, loc.description, loc.sort_order, isoDate(180), isoDate(0));
}
console.log(`Inserted ${locations.length} locations`);

// --- Seeds ---
const seedDefs = [
  { name: 'Beefsteak Tomato', variety: 'Big Boy', supplier: 'Burpee', germ: 7, rate: 85 },
  { name: 'Cherry Tomato', variety: 'Sweet Million', supplier: 'Burpee', germ: 6, rate: 90 },
  { name: 'Roma Tomato', variety: 'San Marzano', supplier: 'Botanical Interests', germ: 8, rate: 82 },
  { name: 'Genovese Basil', variety: 'Italian Large Leaf', supplier: 'Botanical Interests', germ: 5, rate: 90 },
  { name: 'Thai Basil', variety: 'Siam Queen', supplier: 'Baker Creek', germ: 7, rate: 80 },
  { name: 'Lemon Basil', variety: 'Mrs. Burns', supplier: 'Seed Savers', germ: 6, rate: 85 },
  { name: 'Butterhead Lettuce', variety: 'Bibb', supplier: "Johnny's Seeds", germ: 4, rate: 92 },
  { name: 'Romaine Lettuce', variety: 'Parris Island Cos', supplier: "Johnny's Seeds", germ: 4, rate: 93 },
  { name: 'Red Leaf Lettuce', variety: 'Red Sails', supplier: 'Burpee', germ: 4, rate: 91 },
  { name: 'Carolina Reaper', variety: 'HP22B', supplier: "Pepper Joe's", germ: 14, rate: 70 },
  { name: 'Jalapeno', variety: 'Early', supplier: 'Burpee', germ: 10, rate: 85 },
  { name: 'Habanero', variety: 'Orange', supplier: "Pepper Joe's", germ: 12, rate: 75 },
  { name: 'Bell Pepper', variety: 'California Wonder', supplier: 'Burpee', germ: 10, rate: 88 },
  { name: 'Sugar Snap Pea', variety: 'Super Sugar Snap', supplier: 'Seed Savers', germ: 7, rate: 88 },
  { name: 'English Cucumber', variety: 'Marketmore 76', supplier: "Johnny's Seeds", germ: 5, rate: 90 },
  { name: 'Strawberry', variety: 'Albion', supplier: 'Gurney\'s', germ: 21, rate: 60 },
  { name: 'Cilantro', variety: 'Santo', supplier: 'Botanical Interests', germ: 7, rate: 80 },
  { name: 'Dill', variety: 'Bouquet', supplier: 'Baker Creek', germ: 7, rate: 75 },
  { name: 'Mint', variety: 'Spearmint', supplier: 'Burpee', germ: 10, rate: 85 },
  { name: 'Oregano', variety: 'Greek', supplier: 'Botanical Interests', germ: 8, rate: 80 },
  { name: 'Rosemary', variety: 'Tuscan Blue', supplier: 'Baker Creek', germ: 14, rate: 65 },
  { name: 'Thyme', variety: 'English', supplier: 'Seed Savers', germ: 10, rate: 70 },
  { name: 'Kale', variety: 'Lacinato', supplier: "Johnny's Seeds", germ: 5, rate: 90 },
  { name: 'Spinach', variety: 'Bloomsdale Long Standing', supplier: 'Burpee', germ: 5, rate: 88 },
  { name: 'Swiss Chard', variety: 'Bright Lights', supplier: 'Baker Creek', germ: 5, rate: 85 },
  { name: 'Arugula', variety: 'Rocket', supplier: "Johnny's Seeds", germ: 4, rate: 92 },
  { name: 'Bok Choy', variety: 'Shanghai Green', supplier: 'Botanical Interests', germ: 4, rate: 90 },
  { name: 'Radish', variety: 'Cherry Belle', supplier: 'Burpee', germ: 3, rate: 95 },
  { name: 'Green Onion', variety: 'Evergreen White Bunching', supplier: "Johnny's Seeds", germ: 7, rate: 85 },
  { name: 'Lavender', variety: 'Munstead', supplier: 'Baker Creek', germ: 14, rate: 60 },
];
const seeds = seedDefs.map(s => ({ id: id(), ...s }));
const insertSeed = db.prepare('INSERT OR IGNORE INTO seeds (id, name, variety, supplier, purchase_date, quantity, quantity_unit, days_to_germination, expected_germination_rate, notes, created_at, updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)');
for (const s of seeds) {
  insertSeed.run(s.id, s.name, s.variety, s.supplier, isoDate(randInt(30, 200)), randInt(5, 100), pick(['seeds', 'packets', 'grams']), s.germ, s.rate, null, isoDate(randInt(60, 200)), isoDate(0));
}
console.log(`Inserted ${seeds.length} seeds`);

// --- Gardens ---
const gardenTypes = [
  { type_id: 'hydro-dwc', system: 'dwc', cat: 'hydroponic' },
  { type_id: 'hydro-kratky', system: 'kratky', cat: 'hydroponic' },
  { type_id: 'hydro-nft', system: 'nft', cat: 'hydroponic' },
  { type_id: 'hydro-ebb-flow', system: 'ebb_flow', cat: 'hydroponic' },
  { type_id: 'hydro-aeroponics', system: 'aeroponics', cat: 'hydroponic' },
  { type_id: 'hydro-drip', system: 'drip', cat: 'hydroponic' },
  { type_id: 'soil-raised-bed', system: 'soil', cat: 'soil' },
  { type_id: 'soil-in-ground', system: 'soil', cat: 'soil' },
  { type_id: 'soil-greenhouse', system: 'soil', cat: 'soil' },
  { type_id: 'container-indoor', system: 'container', cat: 'container' },
  { type_id: 'container-outdoor', system: 'container', cat: 'container' },
  { type_id: 'container-vertical', system: 'container', cat: 'container' },
  { type_id: 'aqua-media-bed', system: 'aquaponics', cat: 'aquaponics' },
  { type_id: 'aqua-raft', system: 'aquaponics', cat: 'aquaponics' },
];
const gardenNames = [
  'DWC Lettuce Raft', 'Kratky Herb Station', 'NFT Tomato Run', 'Ebb & Flow Greens',
  'Aeroponic Tower', 'Drip System Peppers', 'Backyard Raised Bed', 'Front Yard In-Ground',
  'Greenhouse Tomatoes', 'Indoor Herb Window', 'Patio Containers', 'Vertical Strawberries',
  'Aquaponic Media Bed', 'Aquaponic Lettuce Raft', 'Basement DWC Experiment',
  'Kitchen Kratky Basil', 'Garage NFT System', 'Closet Pepper Grow',
  'Rooftop Container Garden', 'Balcony Herb Collection', 'Spring Lettuce Mix',
  'Summer Tomato Bonanza', 'Hot Pepper Paradise', 'Microgreens Station',
  'Salad Table', 'Winter Greens Setup', 'Cucumber Corner', 'Strawberry Tower',
  'Medicinal Herb Garden', 'Flower Power Bed',
];
const gardens = gardenNames.map((name, i) => {
  const gt = gardenTypes[i % gardenTypes.length];
  return { id: id(), name, system_type: gt.system, type_id: gt.type_id, cat: gt.cat, location: pick(locations), plant_types: pick(['vegetables', 'herbs', 'fruits', 'vegetables,herbs', 'vegetables,fruits']), start_days_ago: randInt(5, 365) };
});
const insertGarden = db.prepare('INSERT OR IGNORE INTO gardens (id, name, system_type, plant_types, start_date, is_active, garden_type_id, location_id) VALUES (?,?,?,?,?,1,?,?)');
for (const g of gardens) {
  insertGarden.run(g.id, g.name, g.system_type, g.plant_types, isoDate(g.start_days_ago), g.type_id, g.location.id);
}
console.log(`Inserted ${gardens.length} gardens`);

// --- Plants ---
const stages = ['seed', 'germination', 'seedling', 'vegetative', 'flowering', 'fruiting', 'harvest'];
const plantTypes = ['vegetables', 'herbs', 'fruits', 'flowers'];
const speciesList = [
  'Solanum lycopersicum', 'Ocimum basilicum', 'Lactuca sativa', 'Capsicum chinense',
  'Capsicum annuum', 'Pisum sativum', 'Cucumis sativus', 'Fragaria ananassa',
  'Coriandrum sativum', 'Anethum graveolens', 'Mentha spicata', 'Origanum vulgare',
  'Rosmarinus officinalis', 'Thymus vulgaris', 'Brassica oleracea', 'Spinacia oleracea',
  'Beta vulgaris', 'Eruca vesicaria', 'Brassica rapa', 'Raphanus sativus',
  'Allium fistulosum', 'Lavandula angustifolia', 'Petroselinum crispum', 'Salvia officinalis',
];
const plantNamePrefixes = [
  'Cherry Tomato', 'Beefsteak', 'Roma', 'Basil', 'Thai Basil', 'Lemon Basil',
  'Bibb Lettuce', 'Romaine', 'Red Leaf', 'Reaper', 'Jalapeno', 'Habanero',
  'Bell Pepper', 'Snap Pea', 'Cucumber', 'Strawberry', 'Cilantro', 'Dill',
  'Mint', 'Oregano', 'Rosemary', 'Thyme', 'Kale', 'Spinach',
  'Swiss Chard', 'Arugula', 'Bok Choy', 'Radish', 'Green Onion', 'Lavender',
  'Parsley', 'Sage', 'Chive', 'Watercress', 'Endive', 'Fennel',
];

const allPlants = [];
const insertPlant = db.prepare('INSERT OR IGNORE INTO plants (id, garden_id, name, plant_type, species, seeded_date, current_stage, notes, created_at, is_active, seed_id) VALUES (?,?,?,?,?,?,?,?,?,?,?)');
for (const g of gardens) {
  const numPlants = randInt(2, 12);
  for (let i = 0; i < numPlants; i++) {
    const pId = id();
    const prefix = pick(plantNamePrefixes);
    const name = numPlants > 3 ? `${prefix} #${i + 1}` : prefix;
    const seededAgo = Math.min(g.start_days_ago, randInt(5, g.start_days_ago));
    const seed = Math.random() > 0.3 ? pick(seeds) : null;
    const isActive = Math.random() > 0.1 ? 1 : 0;
    insertPlant.run(pId, g.id, name, pick(plantTypes), pick(speciesList), isoDate(seededAgo), pick(stages), null, isoDate(seededAgo), isActive, seed ? seed.id : null);
    allPlants.push({ id: pId, gardenId: g.id });
  }
}
console.log(`Inserted ${allPlants.length} plants`);

// --- Log Entries ---
const insertLog = db.prepare('INSERT OR IGNORE INTO log_entries (id, garden_id, timestamp, ph, ppm, water_temp, notes, metric_data) VALUES (?,?,?,?,?,?,?,?)');
let logCount = 0;
const logNotes = [null, null, null, null, null, 'Nutrient change', 'Topped off reservoir', 'Looking healthy', 'Slight yellowing on lower leaves', 'Added CalMag', 'Adjusted pH down', 'Flushed system', 'New batch of nutrients mixed', 'Roots looking white and healthy', 'Some algae buildup, cleaned', 'Transplanted seedlings', 'Pruned dead leaves'];
for (const g of gardens) {
  const isHydro = g.cat === 'hydroponic' || g.cat === 'aquaponics';
  const numLogs = randInt(10, 50);
  for (let i = 0; i < numLogs; i++) {
    const daysAgo = randInt(0, g.start_days_ago);
    const ph = isHydro ? rand(4.8, 7.2) : rand(5.8, 7.5);
    const ppm = isHydro ? randInt(400, 1800) : null;
    const waterTemp = isHydro ? rand(60, 82) : null;
    const metricData = {};
    if (isHydro) {
      metricData.ph = ph;
      metricData.ppm = ppm;
      metricData.water_temp = waterTemp;
      if (Math.random() > 0.5) metricData.dissolved_oxygen = rand(4, 10);
    } else {
      metricData.soil_ph = ph;
      metricData.soil_moisture = randInt(20, 90);
      metricData.soil_temp = rand(55, 85);
    }
    if (g.cat === 'aquaponics') {
      metricData.ammonia = rand(0, 2);
      metricData.nitrite = rand(0, 1);
      metricData.nitrate = rand(5, 80);
    }
    insertLog.run(id(), g.id, isoDate(daysAgo), ph, ppm, waterTemp, pick(logNotes), JSON.stringify(metricData));
    logCount++;
  }
}
console.log(`Inserted ${logCount} log entries`);

// --- Tasks ---
const insertTask = db.prepare('INSERT OR IGNORE INTO tasks (id, garden_id, plant_id, title, description, due_date, is_completed, completed_at, priority, is_recurring, recurring_days) VALUES (?,?,?,?,?,?,?,?,?,?,?)');
const taskTemplates = [
  { title: 'Check pH levels', desc: 'Measure and adjust pH', priority: 'high', recurring: true, days: 3 },
  { title: 'Check PPM/EC', desc: 'Measure nutrient concentration', priority: 'high', recurring: true, days: 3 },
  { title: 'Top off reservoir', desc: 'Add water to maintain level', priority: 'medium', recurring: true, days: 5 },
  { title: 'Change nutrient solution', desc: 'Full reservoir change and clean', priority: 'high', recurring: true, days: 14 },
  { title: 'Prune dead leaves', desc: 'Remove yellowing or dead foliage', priority: 'low' },
  { title: 'Check for pests', desc: 'Inspect under leaves and stems', priority: 'medium', recurring: true, days: 7 },
  { title: 'Clean grow lights', desc: 'Wipe down light fixtures', priority: 'low', recurring: true, days: 30 },
  { title: 'Harvest ready crops', desc: 'Pick ripe vegetables/herbs', priority: 'medium' },
  { title: 'Transplant seedlings', desc: 'Move to larger containers or system', priority: 'high' },
  { title: 'Water garden', desc: 'Deep watering session', priority: 'medium', recurring: true, days: 2 },
  { title: 'Add CalMag supplement', desc: 'Calcium and magnesium supplement', priority: 'medium' },
  { title: 'Rotate plants', desc: 'Rotate for even light distribution', priority: 'low', recurring: true, days: 7 },
  { title: 'Check root health', desc: 'Inspect roots for rot or discoloration', priority: 'high', recurring: true, days: 14 },
  { title: 'Adjust light height', desc: 'Raise or lower grow lights', priority: 'low' },
  { title: 'Mix new nutrient batch', desc: 'Prepare fresh nutrient solution', priority: 'medium' },
  { title: 'Record measurements', desc: 'Take and log sensor readings', priority: 'medium', recurring: true, days: 1 },
  { title: 'Clean air filters', desc: 'Replace or clean intake filters', priority: 'low', recurring: true, days: 30 },
  { title: 'Pollinate flowers', desc: 'Hand pollinate indoor flowering plants', priority: 'medium' },
  { title: 'Stake tall plants', desc: 'Add support for heavy fruit bearers', priority: 'medium' },
  { title: 'Flush system', desc: 'Run clean water through system', priority: 'high', recurring: true, days: 30 },
];
const generalTasks = [
  { title: 'Order new nutrients', desc: 'Running low on Flora series', priority: 'medium', due: 5 },
  { title: 'Calibrate pH meter', desc: 'Monthly calibration with buffer solution', priority: 'high', due: 2 },
  { title: 'Buy replacement air stones', desc: 'Current ones getting clogged', priority: 'low', due: 10 },
  { title: 'Research new grow lights', desc: 'Compare LED options for next setup', priority: 'low', due: 14 },
  { title: 'Clean all tools', desc: 'Sanitize scissors, nets, etc.', priority: 'low', due: 7 },
  { title: 'Update garden journal', desc: 'Document this week\'s progress', priority: 'medium', due: 1, recurring: true, days: 7 },
  { title: 'Check water filter', desc: 'Replace RO membrane if needed', priority: 'medium', due: 20 },
  { title: 'Inventory seed stock', desc: 'Count remaining seeds and plan orders', priority: 'low', due: 30 },
  { title: 'Plan next season', desc: 'Decide which varieties to grow', priority: 'low', due: 45 },
  { title: 'Backup sensor data', desc: 'Export logs for safe keeping', priority: 'low', due: 14, recurring: true, days: 14 },
];

let taskCount = 0;
// Garden-specific tasks
for (const g of gardens) {
  const numTasks = randInt(2, 6);
  const used = new Set();
  for (let i = 0; i < numTasks; i++) {
    let t;
    do { t = pick(taskTemplates); } while (used.has(t.title));
    used.add(t.title);
    const isCompleted = Math.random() > 0.65 ? 1 : 0;
    const dueDays = isCompleted ? -randInt(1, 30) : randInt(-3, 14);
    const plant = Math.random() > 0.7 ? pick(allPlants.filter(p => p.gardenId === g.id)) : null;
    insertTask.run(id(), g.id, plant ? plant.id : null, t.title, t.desc, isoDate(-dueDays), isCompleted, isCompleted ? isoDate(randInt(0, 5)) : null, t.priority, t.recurring ? 1 : 0, t.days || null);
    taskCount++;
  }
}
// General tasks (no garden)
for (const t of generalTasks) {
  const isCompleted = Math.random() > 0.7 ? 1 : 0;
  insertTask.run(id(), null, null, t.title, t.desc, isoDate(-t.due), isCompleted, isCompleted ? isoDate(randInt(0, 3)) : null, t.priority, t.recurring ? 1 : 0, t.days || null);
  taskCount++;
}
console.log(`Inserted ${taskCount} tasks`);

// --- Plant Failures ---
const insertFailure = db.prepare('INSERT OR IGNORE INTO plant_failures (id, plant_id, seed_id, failure_stage, failure_reason, failed_at) VALUES (?,?,?,?,?,?)');
const failureReasons = ['Damping off', 'Root rot', 'Nutrient burn', 'Light stress', 'Pest damage', 'Mold', 'Failed to germinate', 'Dried out', 'Overwatered', 'pH shock'];
let failCount = 0;
for (const p of allPlants) {
  if (Math.random() > 0.9) {
    const seed = seeds.find(s => Math.random() > 0.5);
    insertFailure.run(id(), p.id, seed ? seed.id : null, pick(stages.slice(0, 4)), pick(failureReasons), isoDate(randInt(1, 60)));
    failCount++;
  }
}
console.log(`Inserted ${failCount} plant failures`);

console.log('\nStress test data seeded successfully!');
