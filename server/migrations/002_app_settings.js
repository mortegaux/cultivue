'use strict';

exports.up = function (db) {
  // App settings table
  db.exec(`
    CREATE TABLE IF NOT EXISTS app_settings (
      key TEXT PRIMARY KEY,
      value TEXT,
      type TEXT NOT NULL DEFAULT 'string',
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS garden_types (
      id TEXT PRIMARY KEY,
      category TEXT NOT NULL,
      subcategory TEXT NOT NULL,
      display_name TEXT NOT NULL,
      is_enabled INTEGER NOT NULL DEFAULT 1,
      sort_order INTEGER NOT NULL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS metric_definitions (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      unit_metric TEXT,
      unit_imperial TEXT,
      data_type TEXT NOT NULL DEFAULT 'number',
      min_value REAL,
      max_value REAL,
      ideal_min REAL,
      ideal_max REAL,
      decimal_places INTEGER NOT NULL DEFAULT 1,
      sort_order INTEGER NOT NULL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS garden_type_metrics (
      garden_type_id TEXT NOT NULL,
      metric_id TEXT NOT NULL,
      is_required INTEGER NOT NULL DEFAULT 0,
      PRIMARY KEY (garden_type_id, metric_id),
      FOREIGN KEY (garden_type_id) REFERENCES garden_types(id) ON DELETE CASCADE,
      FOREIGN KEY (metric_id) REFERENCES metric_definitions(id) ON DELETE CASCADE
    );
  `);

  // Add garden_type_id to gardens, failed_attempts/locked_until to users
  const gardenCols = db.prepare("PRAGMA table_info(gardens)").all().map(c => c.name);
  if (!gardenCols.includes('garden_type_id')) {
    db.exec(`ALTER TABLE gardens ADD COLUMN garden_type_id TEXT`);
  }

  const userCols = db.prepare("PRAGMA table_info(user)").all().map(c => c.name);
  if (!userCols.includes('failed_attempts')) {
    db.exec(`ALTER TABLE "user" ADD COLUMN failed_attempts INTEGER NOT NULL DEFAULT 0`);
  }
  if (!userCols.includes('locked_until')) {
    db.exec(`ALTER TABLE "user" ADD COLUMN locked_until TEXT`);
  }

  // Add metric_data JSON column to log_entries
  const logCols = db.prepare("PRAGMA table_info(log_entries)").all().map(c => c.name);
  if (!logCols.includes('metric_data')) {
    db.exec(`ALTER TABLE log_entries ADD COLUMN metric_data TEXT`);
  }

  // Seed garden types
  const insertType = db.prepare('INSERT OR IGNORE INTO garden_types (id, category, subcategory, display_name, is_enabled, sort_order) VALUES (?, ?, ?, ?, 1, ?)');
  const types = [
    // Hydroponic
    ['hydro-dwc', 'hydroponic', 'dwc', 'Deep Water Culture (DWC)', 1],
    ['hydro-kratky', 'hydroponic', 'kratky', 'Kratky Method', 2],
    ['hydro-nft', 'hydroponic', 'nft', 'NFT (Nutrient Film)', 3],
    ['hydro-ebb-flow', 'hydroponic', 'ebb-flow', 'Ebb & Flow', 4],
    ['hydro-aeroponics', 'hydroponic', 'aeroponics', 'Aeroponics', 5],
    ['hydro-drip', 'hydroponic', 'drip', 'Drip System', 6],
    // Soil
    ['soil-raised-bed', 'soil', 'raised-bed', 'Raised Bed', 10],
    ['soil-in-ground', 'soil', 'in-ground', 'In-Ground', 11],
    ['soil-greenhouse', 'soil', 'greenhouse', 'Greenhouse (Soil)', 12],
    // Container
    ['container-indoor', 'container', 'indoor', 'Indoor Container', 20],
    ['container-outdoor', 'container', 'outdoor', 'Outdoor Container', 21],
    ['container-vertical', 'container', 'vertical', 'Vertical Garden', 22],
    // Aquaponics
    ['aqua-media-bed', 'aquaponics', 'media-bed', 'Media Bed', 30],
    ['aqua-raft', 'aquaponics', 'raft', 'Raft / DWC Aquaponics', 31],
    ['aqua-nft', 'aquaponics', 'nft', 'NFT Aquaponics', 32],
  ];
  for (const t of types) insertType.run(...t);

  // Seed metric definitions
  const insertMetric = db.prepare('INSERT OR IGNORE INTO metric_definitions (id, name, unit_metric, unit_imperial, data_type, min_value, max_value, ideal_min, ideal_max, decimal_places, sort_order) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)');
  const metrics = [
    ['ph', 'pH', '', '', 'number', 0, 14, 5.5, 6.5, 1, 1],
    ['ppm', 'PPM (TDS)', 'ppm', 'ppm', 'number', 0, 5000, 800, 1500, 0, 2],
    ['water_temp', 'Water Temperature', '°C', '°F', 'number', 0, 50, 18, 24, 1, 3],
    ['water_level', 'Water Level', 'cm', 'in', 'number', 0, 500, null, null, 1, 4],
    ['dissolved_oxygen', 'Dissolved Oxygen', 'mg/L', 'mg/L', 'number', 0, 20, 5, 8, 1, 5],
    ['air_temp', 'Air Temperature', '°C', '°F', 'number', -20, 60, 20, 28, 1, 6],
    ['humidity', 'Humidity', '%', '%', 'number', 0, 100, 50, 70, 0, 7],
    ['soil_ph', 'Soil pH', '', '', 'number', 0, 14, 6.0, 7.0, 1, 10],
    ['soil_moisture', 'Soil Moisture', '%', '%', 'number', 0, 100, 40, 60, 0, 11],
    ['soil_temp', 'Soil Temperature', '°C', '°F', 'number', -10, 60, 15, 25, 1, 12],
    ['npk', 'NPK Ratio', '', '', 'text', null, null, null, null, 0, 13],
    ['fish_tank_ph', 'Fish Tank pH', '', '', 'number', 0, 14, 6.8, 7.2, 1, 20],
    ['ammonia', 'Ammonia', 'ppm', 'ppm', 'number', 0, 10, 0, 0.25, 2, 21],
    ['nitrite', 'Nitrite', 'ppm', 'ppm', 'number', 0, 10, 0, 0.25, 2, 22],
    ['nitrate', 'Nitrate', 'ppm', 'ppm', 'number', 0, 500, 5, 40, 0, 23],
    ['fish_count', 'Fish Count', '', '', 'integer', 0, 10000, null, null, 0, 24],
    ['light_hours', 'Light Hours', 'hrs', 'hrs', 'number', 0, 24, 12, 18, 1, 30],
  ];
  for (const m of metrics) insertMetric.run(...m);

  // Seed garden_type_metrics junction
  const insertJunction = db.prepare('INSERT OR IGNORE INTO garden_type_metrics (garden_type_id, metric_id, is_required) VALUES (?, ?, ?)');

  const hydroMetrics = [['ph', 1], ['ppm', 1], ['water_temp', 1], ['water_level', 0], ['dissolved_oxygen', 0], ['air_temp', 0], ['humidity', 0], ['light_hours', 0]];
  const soilMetrics = [['soil_ph', 1], ['soil_moisture', 1], ['soil_temp', 0], ['npk', 0], ['air_temp', 0], ['humidity', 0], ['light_hours', 0]];
  const containerMetrics = [['soil_ph', 0], ['soil_moisture', 1], ['soil_temp', 0], ['air_temp', 0], ['humidity', 0], ['light_hours', 0]];
  const aquaMetrics = [['fish_tank_ph', 1], ['ammonia', 1], ['nitrite', 1], ['nitrate', 1], ['water_temp', 1], ['dissolved_oxygen', 0], ['fish_count', 0], ['ph', 0], ['ppm', 0], ['air_temp', 0], ['humidity', 0], ['light_hours', 0]];

  const mapping = {
    hydroponic: hydroMetrics,
    soil: soilMetrics,
    container: containerMetrics,
    aquaponics: aquaMetrics,
  };

  const allTypes = db.prepare('SELECT id, category FROM garden_types').all();
  for (const gt of allTypes) {
    const metricsForCategory = mapping[gt.category] || [];
    for (const [metricId, isRequired] of metricsForCategory) {
      insertJunction.run(gt.id, metricId, isRequired);
    }
  }

  // Migrate existing gardens' system_type to garden_type_id
  const systemTypeMap = {
    dwc: 'hydro-dwc',
    kratky: 'hydro-kratky',
    nft: 'hydro-nft',
    ebbAndFlow: 'hydro-ebb-flow',
    aeroponics: 'hydro-aeroponics',
    drip: 'hydro-drip',
  };
  const gardens = db.prepare('SELECT id, system_type FROM gardens WHERE garden_type_id IS NULL').all();
  const updateGarden = db.prepare('UPDATE gardens SET garden_type_id = ? WHERE id = ?');
  for (const g of gardens) {
    const typeId = systemTypeMap[g.system_type] || 'hydro-dwc';
    updateGarden.run(typeId, g.id);
  }

  // Migrate existing log_entries ph/ppm/water_temp into metric_data JSON
  const logsToMigrate = db.prepare('SELECT id, ph, ppm, water_temp FROM log_entries WHERE metric_data IS NULL AND (ph IS NOT NULL OR ppm IS NOT NULL OR water_temp IS NOT NULL)').all();
  const updateLog = db.prepare('UPDATE log_entries SET metric_data = ? WHERE id = ?');
  for (const log of logsToMigrate) {
    const data = {};
    if (log.ph != null) data.ph = log.ph;
    if (log.ppm != null) data.ppm = log.ppm;
    if (log.water_temp != null) data.water_temp = log.water_temp;
    updateLog.run(JSON.stringify(data), log.id);
  }
};
