'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const V = require('../server/validate');

describe('Plant Stage Capitalization & Houseplant Stages', function () {
  describe('Backend Validation & Allow-lists (validate.js)', function () {
    it('has all houseplant stages including thriving in HOUSEPLANT_STAGES and ALL_STAGES', function () {
      assert.ok(V.HOUSEPLANT_STAGES.includes('thriving'), 'HOUSEPLANT_STAGES should include thriving');
      assert.ok(V.HOUSEPLANT_STAGES.includes('acclimating'), 'HOUSEPLANT_STAGES should include acclimating');
      assert.ok(V.HOUSEPLANT_STAGES.includes('established'), 'HOUSEPLANT_STAGES should include established');
      assert.ok(V.HOUSEPLANT_STAGES.includes('acquired'), 'HOUSEPLANT_STAGES should include acquired');
      assert.ok(V.ALL_STAGES.includes('thriving'), 'ALL_STAGES should include thriving');
    });

    it('validates stage case-insensitively via enumVal', function () {
      assert.strictEqual(V.enumVal('Thriving', V.ALL_STAGES), 'thriving');
      assert.strictEqual(V.enumVal('THRIVING', V.ALL_STAGES), 'thriving');
      assert.strictEqual(V.enumVal('thriving', V.ALL_STAGES), 'thriving');
      assert.strictEqual(V.enumVal('Acclimating', V.ALL_STAGES), 'acclimating');
      assert.strictEqual(V.enumVal('Seedling', V.ALL_STAGES), 'seedling');
    });
  });

  describe('Frontend Definitions & Formatting (app.js)', function () {
    const appJsContent = fs.readFileSync(path.join(__dirname, '../public/js/app.js'), 'utf8');

    it('defines STAGE_LABELS mapping all stages to properly capitalized strings', function () {
      assert.ok(appJsContent.includes("thriving: 'Thriving'"), "STAGE_LABELS should map thriving to 'Thriving'");
      assert.ok(appJsContent.includes("acclimating: 'Acclimating'"), "STAGE_LABELS should map acclimating to 'Acclimating'");
      assert.ok(appJsContent.includes("established: 'Established'"), "STAGE_LABELS should map established to 'Established'");
      assert.ok(appJsContent.includes("acquired: 'Acquired'"), "STAGE_LABELS should map acquired to 'Acquired'");
      assert.ok(appJsContent.includes("seed: 'Seed'"), "STAGE_LABELS should map seed to 'Seed'");
      assert.ok(appJsContent.includes("germination: 'Germination'"), "STAGE_LABELS should map germination to 'Germination'");
      assert.ok(appJsContent.includes("seedling: 'Seedling'"), "STAGE_LABELS should map seedling to 'Seedling'");
      assert.ok(appJsContent.includes("vegetative: 'Vegetative'"), "STAGE_LABELS should map vegetative to 'Vegetative'");
      assert.ok(appJsContent.includes("flowering: 'Flowering'"), "STAGE_LABELS should map flowering to 'Flowering'");
      assert.ok(appJsContent.includes("fruiting: 'Fruiting'"), "STAGE_LABELS should map fruiting to 'Fruiting'");
      assert.ok(appJsContent.includes("harvest: 'Harvest'"), "STAGE_LABELS should map harvest to 'Harvest'");
    });

    it('defines formatStage function and uses it for plant stage badges and selectors', function () {
      assert.ok(appJsContent.includes('function formatStage(stage)'), 'app.js should define formatStage helper');
      assert.ok(appJsContent.includes('formatStage(plant.current_stage)'), 'renderPlantsGrid and showPlantDetail should use formatStage');
      assert.ok(appJsContent.includes('formatStage(p.current_stage)'), 'renderDashboard should use formatStage');
      assert.ok(appJsContent.includes('formatStage(s)'), 'stage select dropdowns should format stage options');
    });

    it('formats plant_type in badges', function () {
      assert.ok(appJsContent.includes('function formatPlantType(type)'), 'app.js should define formatPlantType helper');
      assert.ok(appJsContent.includes('formatPlantType(plant.plant_type)'), 'showPlantDetail should use formatPlantType');
    });

    it('ensures buildInitialPlantData initializes houseplant to acquired stage', function () {
      assert.ok(appJsContent.includes("let current_stage = cat === 'houseplant' ? 'acquired' : 'seed';"), 'houseplant should initialize to acquired stage');
    });
  });

  describe('CSS Badge Capitalization (styles.css)', function () {
    const cssContent = fs.readFileSync(path.join(__dirname, '../public/css/styles.css'), 'utf8');

    it('has text-transform: capitalize on .badge', function () {
      const badgeMatch = cssContent.match(/\.badge\s*\{[^}]*text-transform:\s*capitalize/);
      assert.ok(badgeMatch, '.badge should have text-transform: capitalize');
    });
  });
});
