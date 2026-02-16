'use strict';

exports.up = function (db) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS planting_index (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      category TEXT NOT NULL,
      sow_indoor_start INTEGER,
      sow_indoor_end INTEGER,
      sow_outdoor_start INTEGER,
      sow_outdoor_end INTEGER,
      transplant_start INTEGER,
      transplant_end INTEGER,
      harvest_start INTEGER,
      harvest_end INTEGER,
      days_to_maturity_min INTEGER,
      days_to_maturity_max INTEGER,
      zone_group TEXT NOT NULL,
      notes TEXT
    );
    CREATE INDEX idx_planting_index_zone ON planting_index(zone_group);
    CREATE INDEX idx_planting_index_category ON planting_index(category);
  `);

  db.exec(`
    INSERT INTO planting_index (id, name, category, sow_indoor_start, sow_indoor_end, sow_outdoor_start, sow_outdoor_end, transplant_start, transplant_end, harvest_start, harvest_end, days_to_maturity_min, days_to_maturity_max, zone_group, notes) VALUES
    -- =====================
    -- VEGETABLES (30 crops)
    -- =====================

    -- Tomato
    ('tomato-cold', 'Tomato', 'vegetable', 3, 4, NULL, NULL, 6, 6, 8, 9, 65, 85, 'cold', 'Start indoors 6-8 weeks before last frost. Use short-season varieties.'),
    ('tomato-temperate', 'Tomato', 'vegetable', 2, 3, NULL, NULL, 5, 6, 7, 10, 60, 85, 'temperate', 'Start indoors 6-8 weeks before last frost. Stake or cage for support.'),
    ('tomato-warm', 'Tomato', 'vegetable', 1, 2, NULL, NULL, 2, 3, 5, 11, 60, 85, 'warm', 'Can grow nearly year-round. Provide afternoon shade in extreme heat.'),

    -- Pepper (Bell)
    ('pepper-bell-cold', 'Pepper (Bell)', 'vegetable', 3, 4, NULL, NULL, 6, 6, 8, 9, 70, 90, 'cold', 'Needs warm soil. Start indoors early and harden off well.'),
    ('pepper-bell-temperate', 'Pepper (Bell)', 'vegetable', 2, 3, NULL, NULL, 5, 6, 7, 10, 65, 85, 'temperate', 'Start indoors 8-10 weeks before last frost. Likes warm, sunny spots.'),
    ('pepper-bell-warm', 'Pepper (Bell)', 'vegetable', 1, 2, NULL, NULL, 2, 3, 5, 11, 60, 80, 'warm', 'Can plant early. Provide consistent moisture for best fruit set.'),

    -- Pepper (Hot)
    ('pepper-hot-cold', 'Pepper (Hot)', 'vegetable', 2, 3, NULL, NULL, 6, 6, 8, 9, 75, 100, 'cold', 'Start indoors very early. Hot peppers need long warm season.'),
    ('pepper-hot-temperate', 'Pepper (Hot)', 'vegetable', 2, 3, NULL, NULL, 5, 6, 7, 10, 70, 95, 'temperate', 'Start indoors 10-12 weeks before last frost for best results.'),
    ('pepper-hot-warm', 'Pepper (Hot)', 'vegetable', 1, 2, NULL, NULL, 2, 3, 5, 11, 65, 90, 'warm', 'Thrives in heat. Can produce fruit nearly year-round.'),

    -- Cucumber
    ('cucumber-cold', 'Cucumber', 'vegetable', 4, 5, NULL, NULL, 6, 6, 7, 9, 50, 70, 'cold', 'Very frost-sensitive. Use row covers to extend season.'),
    ('cucumber-temperate', 'Cucumber', 'vegetable', 3, 4, 5, 6, 5, 6, 7, 9, 50, 65, 'temperate', 'Can direct sow after last frost or start indoors 3-4 weeks early.'),
    ('cucumber-warm', 'Cucumber', 'vegetable', 2, 3, 3, 4, 3, 4, 5, 10, 45, 60, 'warm', 'Plant early for spring harvest. Succession plant for continuous yield.'),

    -- Zucchini
    ('zucchini-cold', 'Zucchini', 'vegetable', 4, 5, NULL, NULL, 6, 6, 7, 9, 45, 65, 'cold', 'Direct sow or transplant after all frost danger passes.'),
    ('zucchini-temperate', 'Zucchini', 'vegetable', 3, 4, 5, 6, 5, 6, 6, 10, 45, 60, 'temperate', 'Very productive. Harvest regularly to encourage more fruit.'),
    ('zucchini-warm', 'Zucchini', 'vegetable', 2, 3, 3, 4, 3, 4, 4, 11, 40, 55, 'warm', 'Can plant in early spring and again in fall for two seasons.'),

    -- Squash (Winter)
    ('squash-winter-cold', 'Squash (Winter)', 'vegetable', 4, 5, NULL, NULL, 6, 6, 8, 10, 85, 110, 'cold', 'Needs long season. Start indoors to ensure maturity before frost.'),
    ('squash-winter-temperate', 'Squash (Winter)', 'vegetable', 3, 4, 5, 6, 5, 6, 8, 10, 80, 110, 'temperate', 'Give plenty of space. Cure fruits in sun after harvest.'),
    ('squash-winter-warm', 'Squash (Winter)', 'vegetable', 2, 3, 3, 4, 3, 4, 6, 11, 80, 100, 'warm', 'Plant early to avoid vine borers. Store in cool, dry place.'),

    -- Pumpkin
    ('pumpkin-cold', 'Pumpkin', 'vegetable', 4, 5, NULL, NULL, 6, 6, 8, 10, 90, 120, 'cold', 'Start indoors. Choose short-season varieties for cold climates.'),
    ('pumpkin-temperate', 'Pumpkin', 'vegetable', 4, 5, 5, 6, 5, 6, 8, 10, 85, 120, 'temperate', 'Direct sow after soil warms. Needs lots of space and water.'),
    ('pumpkin-warm', 'Pumpkin', 'vegetable', 2, 3, 3, 4, 3, 4, 6, 10, 80, 110, 'warm', 'Plant early in season when temps are moderate.'),

    -- Lettuce
    ('lettuce-cold', 'Lettuce', 'vegetable', 3, 4, 5, 6, 5, 6, 6, 9, 30, 60, 'cold', 'Cool-season crop. Succession plant every 2 weeks.'),
    ('lettuce-temperate', 'Lettuce', 'vegetable', 2, 3, 3, 5, 3, 4, 4, 6, 30, 55, 'temperate', 'Best in spring and fall. Bolts in summer heat.'),
    ('lettuce-warm', 'Lettuce', 'vegetable', 10, 11, 10, 2, 11, 1, 12, 4, 25, 50, 'warm', 'Grow in fall through spring. Too hot for summer production.'),

    -- Spinach
    ('spinach-cold', 'Spinach', 'vegetable', NULL, NULL, 4, 5, NULL, NULL, 6, 8, 35, 50, 'cold', 'Direct sow as soon as soil can be worked. Very cold-hardy.'),
    ('spinach-temperate', 'Spinach', 'vegetable', NULL, NULL, 3, 4, NULL, NULL, 4, 6, 35, 45, 'temperate', 'Best in spring and fall. Bolts quickly in heat.'),
    ('spinach-warm', 'Spinach', 'vegetable', NULL, NULL, 10, 1, NULL, NULL, 12, 3, 30, 45, 'warm', 'Plant in fall for winter harvest. Heat-resistant varieties help.'),

    -- Kale
    ('kale-cold', 'Kale', 'vegetable', 3, 4, 5, 6, 5, 6, 7, 11, 50, 70, 'cold', 'Extremely cold-hardy. Flavor improves after frost.'),
    ('kale-temperate', 'Kale', 'vegetable', 2, 3, 3, 4, 3, 4, 5, 12, 50, 65, 'temperate', 'Can grow spring through fall. Mulch well for winter harvest.'),
    ('kale-warm', 'Kale', 'vegetable', 9, 10, 9, 10, 10, 11, 11, 3, 50, 65, 'warm', 'Grow as a fall/winter crop. Struggles in summer heat.'),

    -- Swiss Chard
    ('swiss-chard-cold', 'Swiss Chard', 'vegetable', 3, 4, 5, 6, 5, 6, 7, 10, 50, 65, 'cold', 'More heat-tolerant than spinach. Harvest outer leaves.'),
    ('swiss-chard-temperate', 'Swiss Chard', 'vegetable', 2, 3, 3, 5, 4, 5, 5, 11, 50, 60, 'temperate', 'Cut-and-come-again harvest. Tolerates light frost.'),
    ('swiss-chard-warm', 'Swiss Chard', 'vegetable', 9, 10, 9, 11, 10, 11, 11, 4, 45, 60, 'warm', 'Best as fall/winter crop. Provide some shade in warm spells.'),

    -- Arugula
    ('arugula-cold', 'Arugula', 'vegetable', NULL, NULL, 4, 6, NULL, NULL, 5, 8, 21, 40, 'cold', 'Fast-growing cool-season green. Direct sow succession plantings.'),
    ('arugula-temperate', 'Arugula', 'vegetable', NULL, NULL, 3, 5, NULL, NULL, 4, 6, 21, 35, 'temperate', 'Bolts quickly in heat. Best in spring and fall.'),
    ('arugula-warm', 'Arugula', 'vegetable', NULL, NULL, 10, 2, NULL, NULL, 11, 3, 21, 35, 'warm', 'Grow fall through early spring only. Bolts immediately in warmth.'),

    -- Broccoli
    ('broccoli-cold', 'Broccoli', 'vegetable', 3, 4, NULL, NULL, 5, 6, 7, 9, 60, 90, 'cold', 'Start indoors. Transplant when soil is workable. Prefers cool weather.'),
    ('broccoli-temperate', 'Broccoli', 'vegetable', 2, 3, NULL, NULL, 4, 5, 6, 7, 55, 80, 'temperate', 'Spring and fall crops. Harvest before flowers open.'),
    ('broccoli-warm', 'Broccoli', 'vegetable', 8, 9, NULL, NULL, 9, 10, 11, 2, 55, 80, 'warm', 'Fall/winter crop only. Needs consistent cool temps to head.'),

    -- Cauliflower
    ('cauliflower-cold', 'Cauliflower', 'vegetable', 3, 4, NULL, NULL, 5, 6, 7, 9, 65, 100, 'cold', 'Demanding crop. Needs consistent moisture and cool temps.'),
    ('cauliflower-temperate', 'Cauliflower', 'vegetable', 2, 3, NULL, NULL, 4, 5, 6, 7, 60, 85, 'temperate', 'Blanch curds by tying leaves over heads. Very frost-sensitive.'),
    ('cauliflower-warm', 'Cauliflower', 'vegetable', 8, 9, NULL, NULL, 9, 10, 11, 2, 55, 80, 'warm', 'Only grow in coolest months. Choose heat-tolerant varieties.'),

    -- Cabbage
    ('cabbage-cold', 'Cabbage', 'vegetable', 3, 4, NULL, NULL, 5, 6, 7, 9, 70, 100, 'cold', 'Start indoors early. Tolerates light frost.'),
    ('cabbage-temperate', 'Cabbage', 'vegetable', 2, 3, NULL, NULL, 4, 5, 6, 8, 65, 95, 'temperate', 'Spring and fall plantings. Keep soil consistently moist.'),
    ('cabbage-warm', 'Cabbage', 'vegetable', 8, 9, NULL, NULL, 9, 10, 11, 2, 60, 90, 'warm', 'Fall/winter crop. Provide afternoon shade if needed.'),

    -- Brussels Sprouts
    ('brussels-sprouts-cold', 'Brussels Sprouts', 'vegetable', 3, 4, NULL, NULL, 5, 6, 8, 10, 90, 130, 'cold', 'Long season crop. Flavor improves with frost.'),
    ('brussels-sprouts-temperate', 'Brussels Sprouts', 'vegetable', 4, 5, NULL, NULL, 6, 7, 9, 11, 85, 120, 'temperate', 'Start midsummer for fall harvest. Top plants to speed maturity.'),
    ('brussels-sprouts-warm', 'Brussels Sprouts', 'vegetable', 7, 8, NULL, NULL, 8, 9, 11, 2, 85, 110, 'warm', 'Plant in late summer for winter harvest. Needs cool temps to form sprouts.'),

    -- Carrot
    ('carrot-cold', 'Carrot', 'vegetable', NULL, NULL, 5, 6, NULL, NULL, 7, 10, 60, 80, 'cold', 'Direct sow only. Keep soil moist until germination. Thin to 2 inches.'),
    ('carrot-temperate', 'Carrot', 'vegetable', NULL, NULL, 3, 5, NULL, NULL, 6, 10, 55, 75, 'temperate', 'Succession sow every 3 weeks. Loose, sandy soil is best.'),
    ('carrot-warm', 'Carrot', 'vegetable', NULL, NULL, 9, 2, NULL, NULL, 12, 4, 55, 75, 'warm', 'Fall/winter crop. Afternoon shade helps in shoulder seasons.'),

    -- Beet
    ('beet-cold', 'Beet', 'vegetable', NULL, NULL, 5, 6, NULL, NULL, 7, 9, 50, 70, 'cold', 'Direct sow after last frost. Soak seeds overnight for faster germination.'),
    ('beet-temperate', 'Beet', 'vegetable', NULL, NULL, 3, 5, NULL, NULL, 5, 7, 45, 65, 'temperate', 'Spring and fall crops. Harvest greens and roots.'),
    ('beet-warm', 'Beet', 'vegetable', NULL, NULL, 9, 1, NULL, NULL, 11, 3, 45, 60, 'warm', 'Best in cooler months. Mulch to keep soil cool.'),

    -- Radish
    ('radish-cold', 'Radish', 'vegetable', NULL, NULL, 5, 6, NULL, NULL, 6, 7, 22, 35, 'cold', 'One of the fastest crops. Direct sow after last frost.'),
    ('radish-temperate', 'Radish', 'vegetable', NULL, NULL, 3, 5, NULL, NULL, 4, 6, 22, 30, 'temperate', 'Spring and fall. Gets spicy and woody in heat.'),
    ('radish-warm', 'Radish', 'vegetable', NULL, NULL, 10, 2, NULL, NULL, 11, 3, 20, 30, 'warm', 'Cool season only. Try daikon varieties for winter harvest.'),

    -- Turnip
    ('turnip-cold', 'Turnip', 'vegetable', NULL, NULL, 5, 6, NULL, NULL, 7, 9, 40, 60, 'cold', 'Direct sow. Harvest young for best flavor.'),
    ('turnip-temperate', 'Turnip', 'vegetable', NULL, NULL, 3, 4, NULL, NULL, 5, 6, 35, 55, 'temperate', 'Spring and fall crops. Eat greens and roots.'),
    ('turnip-warm', 'Turnip', 'vegetable', NULL, NULL, 9, 11, NULL, NULL, 11, 2, 35, 50, 'warm', 'Fall/winter crop. Tolerates light frost.'),

    -- Onion
    ('onion-cold', 'Onion', 'vegetable', 2, 3, NULL, NULL, 5, 5, 8, 9, 90, 120, 'cold', 'Start indoors very early or use sets. Choose long-day varieties.'),
    ('onion-temperate', 'Onion', 'vegetable', 1, 2, NULL, NULL, 3, 4, 7, 8, 90, 120, 'temperate', 'Start indoors in winter. Day-length sensitive: choose correct type.'),
    ('onion-warm', 'Onion', 'vegetable', 10, 11, NULL, NULL, 11, 12, 4, 6, 90, 120, 'warm', 'Plant in fall. Use short-day varieties for southern climates.'),

    -- Garlic
    ('garlic-cold', 'Garlic', 'vegetable', NULL, NULL, 9, 10, NULL, NULL, 7, 8, 240, 270, 'cold', 'Plant in fall for next summer harvest. Hardneck varieties do best.'),
    ('garlic-temperate', 'Garlic', 'vegetable', NULL, NULL, 9, 11, NULL, NULL, 6, 7, 210, 270, 'temperate', 'Fall-planted. Mulch heavily after planting.'),
    ('garlic-warm', 'Garlic', 'vegetable', NULL, NULL, 10, 12, NULL, NULL, 5, 6, 180, 240, 'warm', 'Softneck varieties best for warm climates. Needs some chill hours.'),

    -- Pea
    ('pea-cold', 'Pea', 'vegetable', NULL, NULL, 5, 6, NULL, NULL, 7, 8, 55, 70, 'cold', 'Direct sow as soon as soil can be worked. Provide support.'),
    ('pea-temperate', 'Pea', 'vegetable', NULL, NULL, 3, 4, NULL, NULL, 5, 6, 50, 65, 'temperate', 'Cool season crop. Plant early spring and again in late summer.'),
    ('pea-warm', 'Pea', 'vegetable', NULL, NULL, 10, 12, NULL, NULL, 1, 3, 50, 65, 'warm', 'Fall/winter crop. Peas stop producing when temps exceed 80F.'),

    -- Bean (Green)
    ('bean-green-cold', 'Bean (Green)', 'vegetable', NULL, NULL, 6, 6, NULL, NULL, 7, 9, 45, 60, 'cold', 'Direct sow after all frost danger. Do not start indoors.'),
    ('bean-green-temperate', 'Bean (Green)', 'vegetable', NULL, NULL, 5, 6, NULL, NULL, 7, 9, 45, 55, 'temperate', 'Succession plant every 2-3 weeks for continuous harvest.'),
    ('bean-green-warm', 'Bean (Green)', 'vegetable', NULL, NULL, 3, 4, NULL, NULL, 5, 6, 40, 55, 'warm', 'Plant in spring and again in fall. Avoid hottest months.'),

    -- Bean (Pole)
    ('bean-pole-cold', 'Bean (Pole)', 'vegetable', NULL, NULL, 6, 6, NULL, NULL, 7, 9, 60, 75, 'cold', 'Needs warm soil. Provide sturdy trellis or poles.'),
    ('bean-pole-temperate', 'Bean (Pole)', 'vegetable', NULL, NULL, 5, 6, NULL, NULL, 7, 10, 55, 70, 'temperate', 'More productive than bush beans over the season. Need support.'),
    ('bean-pole-warm', 'Bean (Pole)', 'vegetable', NULL, NULL, 3, 4, NULL, NULL, 5, 7, 55, 65, 'warm', 'Plant early. Provide shade cloth in extreme heat.'),

    -- Corn
    ('corn-cold', 'Corn', 'vegetable', NULL, NULL, 5, 6, NULL, NULL, 8, 9, 70, 100, 'cold', 'Direct sow when soil is 60F+. Choose early-maturing varieties.'),
    ('corn-temperate', 'Corn', 'vegetable', NULL, NULL, 4, 5, NULL, NULL, 7, 9, 65, 95, 'temperate', 'Plant in blocks for pollination. Needs rich, well-drained soil.'),
    ('corn-warm', 'Corn', 'vegetable', NULL, NULL, 2, 4, NULL, NULL, 5, 8, 60, 90, 'warm', 'Can get two crops per season. Plant in blocks for pollination.'),

    -- Eggplant
    ('eggplant-cold', 'Eggplant', 'vegetable', 3, 4, NULL, NULL, 6, 6, 8, 9, 70, 90, 'cold', 'Start indoors early. Needs warm soil and long season.'),
    ('eggplant-temperate', 'Eggplant', 'vegetable', 2, 3, NULL, NULL, 5, 6, 7, 10, 65, 85, 'temperate', 'Start indoors 8-10 weeks before transplanting. Loves heat.'),
    ('eggplant-warm', 'Eggplant', 'vegetable', 1, 2, NULL, NULL, 2, 3, 5, 11, 60, 80, 'warm', 'Thrives in warm climates. Can produce for many months.'),

    -- Celery
    ('celery-cold', 'Celery', 'vegetable', 2, 3, NULL, NULL, 5, 6, 8, 9, 100, 130, 'cold', 'Start indoors very early. Needs consistently moist soil.'),
    ('celery-temperate', 'Celery', 'vegetable', 1, 2, NULL, NULL, 4, 5, 7, 9, 85, 120, 'temperate', 'Long growing season. Blanch stalks for milder flavor.'),
    ('celery-warm', 'Celery', 'vegetable', 8, 9, NULL, NULL, 10, 11, 1, 3, 85, 120, 'warm', 'Grow as a fall/winter crop. Needs cool temps and ample water.'),

    -- Asparagus
    ('asparagus-cold', 'Asparagus', 'vegetable', NULL, NULL, 5, 5, NULL, NULL, 5, 6, 730, 1095, 'cold', 'Plant crowns in spring. Perennial - do not harvest first 2-3 years.'),
    ('asparagus-temperate', 'Asparagus', 'vegetable', NULL, NULL, 3, 4, NULL, NULL, 4, 6, 730, 1095, 'temperate', 'Perennial. Well-drained soil essential. Produces for 15-20 years.'),
    ('asparagus-warm', 'Asparagus', 'vegetable', NULL, NULL, 1, 2, NULL, NULL, 2, 4, 730, 1095, 'warm', 'Needs some winter chill. UC varieties bred for mild winters.'),

    -- Potato
    ('potato-cold', 'Potato', 'vegetable', NULL, NULL, 5, 6, NULL, NULL, 8, 9, 70, 120, 'cold', 'Plant seed potatoes after last frost. Hill soil as plants grow.'),
    ('potato-temperate', 'Potato', 'vegetable', NULL, NULL, 3, 4, NULL, NULL, 6, 8, 70, 110, 'temperate', 'Plant 2-4 weeks before last frost. Keep tubers covered from light.'),
    ('potato-warm', 'Potato', 'vegetable', NULL, NULL, 1, 2, NULL, NULL, 4, 6, 70, 100, 'warm', 'Plant in late winter. Can get a fall crop too with Aug/Sep planting.'),

    -- ==============
    -- HERBS (15)
    -- ==============

    -- Basil
    ('basil-cold', 'Basil', 'herb', 4, 5, NULL, NULL, 6, 6, 7, 9, 50, 75, 'cold', 'Very frost-sensitive. Start indoors and transplant after last frost.'),
    ('basil-temperate', 'Basil', 'herb', 3, 4, NULL, NULL, 5, 6, 6, 10, 50, 70, 'temperate', 'Pinch flowers to encourage bushy growth. Harvest regularly.'),
    ('basil-warm', 'Basil', 'herb', 2, 3, 3, 4, 3, 4, 4, 11, 45, 65, 'warm', 'Thrives in heat. Can grow most of the year.'),

    -- Cilantro
    ('cilantro-cold', 'Cilantro', 'herb', NULL, NULL, 5, 6, NULL, NULL, 6, 8, 30, 45, 'cold', 'Direct sow after last frost. Bolts in heat - succession plant.'),
    ('cilantro-temperate', 'Cilantro', 'herb', NULL, NULL, 3, 4, NULL, NULL, 4, 6, 30, 45, 'temperate', 'Bolts quickly in warmth. Best in spring and fall.'),
    ('cilantro-warm', 'Cilantro', 'herb', NULL, NULL, 10, 1, NULL, NULL, 11, 3, 25, 40, 'warm', 'Cool season only. Let some bolt to harvest coriander seeds.'),

    -- Dill
    ('dill-cold', 'Dill', 'herb', NULL, NULL, 5, 6, NULL, NULL, 7, 9, 40, 60, 'cold', 'Direct sow after frost. Attracts beneficial insects.'),
    ('dill-temperate', 'Dill', 'herb', NULL, NULL, 3, 5, NULL, NULL, 5, 8, 40, 55, 'temperate', 'Self-seeds readily. Harvest leaves before flowering for best flavor.'),
    ('dill-warm', 'Dill', 'herb', NULL, NULL, 10, 2, NULL, NULL, 12, 4, 35, 50, 'warm', 'Grow in cool months. Bolts quickly in heat.'),

    -- Parsley
    ('parsley-cold', 'Parsley', 'herb', 3, 4, NULL, NULL, 5, 6, 7, 10, 70, 90, 'cold', 'Slow to germinate. Soak seeds before planting. Biennial.'),
    ('parsley-temperate', 'Parsley', 'herb', 2, 3, 3, 4, 4, 5, 5, 11, 70, 80, 'temperate', 'Biennial herb. Harvest outer stems first.'),
    ('parsley-warm', 'Parsley', 'herb', 9, 10, 9, 10, 10, 11, 11, 4, 65, 80, 'warm', 'Fall/winter crop in warm zones. Can overwinter easily.'),

    -- Mint
    ('mint-cold', 'Mint', 'herb', 3, 4, NULL, NULL, 5, 6, 6, 9, 60, 90, 'cold', 'Very invasive - grow in containers. Extremely cold-hardy perennial.'),
    ('mint-temperate', 'Mint', 'herb', 2, 3, NULL, NULL, 4, 5, 5, 10, 60, 90, 'temperate', 'Spreads aggressively. Best in pots. Cut back in fall.'),
    ('mint-warm', 'Mint', 'herb', 1, 2, NULL, NULL, 2, 3, 3, 12, 60, 90, 'warm', 'Nearly year-round in warm climates. Contain in pots.'),

    -- Rosemary
    ('rosemary-cold', 'Rosemary', 'herb', 2, 3, NULL, NULL, 5, 6, 7, 10, 90, 180, 'cold', 'Tender perennial. Bring indoors for winter in cold zones.'),
    ('rosemary-temperate', 'Rosemary', 'herb', 2, 3, NULL, NULL, 4, 5, 6, 11, 80, 150, 'temperate', 'Perennial in most temperate zones. Needs good drainage.'),
    ('rosemary-warm', 'Rosemary', 'herb', NULL, NULL, NULL, NULL, 1, 3, 3, 12, 80, 150, 'warm', 'Evergreen perennial. Drought-tolerant once established.'),

    -- Thyme
    ('thyme-cold', 'Thyme', 'herb', 2, 3, NULL, NULL, 5, 6, 6, 10, 70, 90, 'cold', 'Start indoors from seed or buy transplants. Hardy perennial.'),
    ('thyme-temperate', 'Thyme', 'herb', 2, 3, NULL, NULL, 4, 5, 5, 11, 70, 90, 'temperate', 'Hardy perennial herb. Excellent drainage required.'),
    ('thyme-warm', 'Thyme', 'herb', NULL, NULL, NULL, NULL, 1, 3, 3, 12, 70, 90, 'warm', 'Evergreen perennial. May struggle in humid heat.'),

    -- Oregano
    ('oregano-cold', 'Oregano', 'herb', 2, 3, NULL, NULL, 5, 6, 7, 10, 70, 90, 'cold', 'Hardy perennial. Start indoors from seed. Mulch for winter.'),
    ('oregano-temperate', 'Oregano', 'herb', 2, 3, NULL, NULL, 4, 5, 5, 11, 65, 90, 'temperate', 'Perennial. Cut back in spring for fresh growth.'),
    ('oregano-warm', 'Oregano', 'herb', NULL, NULL, NULL, NULL, 1, 3, 3, 12, 65, 90, 'warm', 'Evergreen in warm zones. Harvest before flowers for best flavor.'),

    -- Sage
    ('sage-cold', 'Sage', 'herb', 2, 3, NULL, NULL, 5, 6, 7, 10, 75, 100, 'cold', 'Hardy perennial. Protect from extreme cold with mulch.'),
    ('sage-temperate', 'Sage', 'herb', 2, 3, NULL, NULL, 4, 5, 5, 11, 70, 90, 'temperate', 'Woody perennial. Prune in spring to prevent legginess.'),
    ('sage-warm', 'Sage', 'herb', NULL, NULL, NULL, NULL, 1, 3, 3, 12, 70, 90, 'warm', 'Evergreen perennial. Needs good drainage and air circulation.'),

    -- Chive
    ('chive-cold', 'Chive', 'herb', 2, 3, NULL, NULL, 5, 6, 6, 10, 60, 90, 'cold', 'Very hardy perennial. Divide clumps every 3-4 years.'),
    ('chive-temperate', 'Chive', 'herb', 2, 3, 3, 4, 4, 5, 5, 11, 60, 80, 'temperate', 'Perennial. Edible flowers. Easy to grow from seed or division.'),
    ('chive-warm', 'Chive', 'herb', NULL, NULL, 10, 11, NULL, NULL, 12, 5, 60, 80, 'warm', 'Plant in fall. May go dormant in hottest summer months.'),

    -- Lavender
    ('lavender-cold', 'Lavender', 'herb', 1, 2, NULL, NULL, 5, 6, 7, 9, 90, 200, 'cold', 'English lavender hardiest. Needs excellent drainage and full sun.'),
    ('lavender-temperate', 'Lavender', 'herb', 1, 2, NULL, NULL, 4, 5, 6, 9, 90, 180, 'temperate', 'Perennial. Do not overwater. Prune after flowering.'),
    ('lavender-warm', 'Lavender', 'herb', NULL, NULL, NULL, NULL, 1, 3, 4, 10, 90, 180, 'warm', 'Spanish and French types do best. Needs dry conditions.'),

    -- Lemongrass
    ('lemongrass-cold', 'Lemongrass', 'herb', 3, 4, NULL, NULL, 6, 6, 7, 9, 75, 100, 'cold', 'Tropical plant. Grow as annual or bring indoors for winter.'),
    ('lemongrass-temperate', 'Lemongrass', 'herb', 2, 3, NULL, NULL, 5, 6, 6, 10, 75, 100, 'temperate', 'Start indoors early. Can overwinter with heavy mulch in zone 7.'),
    ('lemongrass-warm', 'Lemongrass', 'herb', NULL, NULL, NULL, NULL, 2, 4, 4, 12, 60, 90, 'warm', 'Perennial in warm zones. Divide clumps every few years.'),

    -- Fennel
    ('fennel-cold', 'Fennel', 'herb', 3, 4, NULL, NULL, 5, 6, 7, 9, 65, 90, 'cold', 'Start indoors. Does not transplant well - use peat pots.'),
    ('fennel-temperate', 'Fennel', 'herb', NULL, NULL, 4, 5, NULL, NULL, 6, 9, 60, 80, 'temperate', 'Direct sow or transplant carefully. Keep away from dill to avoid crossing.'),
    ('fennel-warm', 'Fennel', 'herb', NULL, NULL, 9, 11, NULL, NULL, 11, 2, 60, 80, 'warm', 'Fall/winter crop in warm areas. Bolts in spring heat.'),

    -- Tarragon
    ('tarragon-cold', 'Tarragon', 'herb', 3, 4, NULL, NULL, 5, 6, 7, 9, 60, 90, 'cold', 'French tarragon cannot be grown from seed - use divisions or cuttings.'),
    ('tarragon-temperate', 'Tarragon', 'herb', 2, 3, NULL, NULL, 4, 5, 5, 10, 60, 90, 'temperate', 'Perennial. French tarragon preferred. Divide every 3 years.'),
    ('tarragon-warm', 'Tarragon', 'herb', NULL, NULL, NULL, NULL, 1, 3, 3, 6, 60, 90, 'warm', 'May struggle in extreme heat. Mexican tarragon is a warm-climate substitute.'),

    -- Chamomile
    ('chamomile-cold', 'Chamomile', 'herb', 3, 4, 5, 5, 5, 6, 7, 9, 60, 80, 'cold', 'German chamomile is annual. Direct sow or transplant.'),
    ('chamomile-temperate', 'Chamomile', 'herb', NULL, NULL, 3, 4, NULL, NULL, 5, 8, 55, 75, 'temperate', 'Self-seeds freely. Harvest flowers when petals fold back.'),
    ('chamomile-warm', 'Chamomile', 'herb', NULL, NULL, 10, 11, NULL, NULL, 12, 3, 55, 75, 'warm', 'Plant in fall for winter/spring blooms. Prefers cool weather.'),

    -- ==============
    -- FRUITS (12)
    -- ==============

    -- Strawberry
    ('strawberry-cold', 'Strawberry', 'fruit', NULL, NULL, NULL, NULL, 5, 6, 6, 8, 90, 120, 'cold', 'June-bearing or everbearing. Mulch heavily for winter protection.'),
    ('strawberry-temperate', 'Strawberry', 'fruit', NULL, NULL, NULL, NULL, 3, 4, 5, 10, 90, 120, 'temperate', 'Plant in early spring. Remove runners to increase fruit size.'),
    ('strawberry-warm', 'Strawberry', 'fruit', NULL, NULL, NULL, NULL, 10, 11, 12, 5, 90, 120, 'warm', 'Plant in fall for spring harvest. Day-neutral varieties produce longest.'),

    -- Watermelon
    ('watermelon-cold', 'Watermelon', 'fruit', 4, 5, NULL, NULL, 6, 6, 8, 9, 75, 100, 'cold', 'Start indoors. Choose small, early varieties. Use black plastic mulch.'),
    ('watermelon-temperate', 'Watermelon', 'fruit', 3, 4, 5, 5, 5, 6, 7, 9, 70, 90, 'temperate', 'Needs warm soil. Plant in hills with plenty of space.'),
    ('watermelon-warm', 'Watermelon', 'fruit', NULL, NULL, 3, 4, NULL, NULL, 6, 9, 65, 85, 'warm', 'Direct sow when soil is warm. Consistent watering until fruit sets.'),

    -- Cantaloupe
    ('cantaloupe-cold', 'Cantaloupe', 'fruit', 4, 5, NULL, NULL, 6, 6, 8, 9, 75, 95, 'cold', 'Start indoors. Needs long warm season. Use row covers.'),
    ('cantaloupe-temperate', 'Cantaloupe', 'fruit', 3, 4, 5, 5, 5, 6, 7, 9, 70, 90, 'temperate', 'Fruit is ripe when it slips easily from the vine.'),
    ('cantaloupe-warm', 'Cantaloupe', 'fruit', NULL, NULL, 3, 4, NULL, NULL, 6, 9, 65, 85, 'warm', 'Direct sow in warm soil. Reduce water as fruit ripens.'),

    -- Blueberry
    ('blueberry-cold', 'Blueberry', 'fruit', NULL, NULL, NULL, NULL, 5, 5, 7, 8, 730, 1095, 'cold', 'Plant bare-root in spring. Needs acidic soil pH 4.5-5.5. Highbush varieties.'),
    ('blueberry-temperate', 'Blueberry', 'fruit', NULL, NULL, NULL, NULL, 3, 4, 6, 8, 730, 1095, 'temperate', 'Acidic soil essential. Mulch with pine needles. Takes 2-3 years to produce.'),
    ('blueberry-warm', 'Blueberry', 'fruit', NULL, NULL, NULL, NULL, 12, 2, 4, 6, 730, 1095, 'warm', 'Southern highbush and rabbiteye varieties for warm climates.'),

    -- Raspberry
    ('raspberry-cold', 'Raspberry', 'fruit', NULL, NULL, NULL, NULL, 5, 5, 7, 9, 365, 730, 'cold', 'Plant bare-root canes in spring. Everbearing types fruit on first-year canes.'),
    ('raspberry-temperate', 'Raspberry', 'fruit', NULL, NULL, NULL, NULL, 3, 4, 6, 10, 365, 730, 'temperate', 'Prune fruited canes after harvest. Trellis for support.'),
    ('raspberry-warm', 'Raspberry', 'fruit', NULL, NULL, NULL, NULL, 12, 1, 4, 6, 365, 730, 'warm', 'Choose low-chill varieties. Afternoon shade helps in heat.'),

    -- Blackberry
    ('blackberry-cold', 'Blackberry', 'fruit', NULL, NULL, NULL, NULL, 5, 5, 7, 8, 365, 730, 'cold', 'Choose hardy thornless varieties. Trellis for easier harvest.'),
    ('blackberry-temperate', 'Blackberry', 'fruit', NULL, NULL, NULL, NULL, 3, 4, 6, 9, 365, 730, 'temperate', 'Vigorous grower. Prune and trellis for best production.'),
    ('blackberry-warm', 'Blackberry', 'fruit', NULL, NULL, NULL, NULL, 12, 2, 5, 7, 365, 730, 'warm', 'Grows vigorously. Choose low-chill varieties.'),

    -- Grape
    ('grape-cold', 'Grape', 'fruit', NULL, NULL, NULL, NULL, 5, 5, 8, 9, 730, 1095, 'cold', 'Choose cold-hardy varieties like Concord. Prune heavily in late winter.'),
    ('grape-temperate', 'Grape', 'fruit', NULL, NULL, NULL, NULL, 3, 4, 8, 10, 730, 1095, 'temperate', 'Train on trellis or arbor. Prune in late winter for best yields.'),
    ('grape-warm', 'Grape', 'fruit', NULL, NULL, NULL, NULL, 1, 2, 6, 9, 730, 1095, 'warm', 'Muscadine grapes ideal for warm, humid climates.'),

    -- Fig
    ('fig-cold', 'Fig', 'fruit', NULL, NULL, NULL, NULL, 5, 5, 8, 9, 730, 1095, 'cold', 'Marginal in cold zones. Grow in containers or wrap for winter.'),
    ('fig-temperate', 'Fig', 'fruit', NULL, NULL, NULL, NULL, 3, 4, 7, 10, 730, 1095, 'temperate', 'Plant against south-facing wall for warmth. Prune minimally.'),
    ('fig-warm', 'Fig', 'fruit', NULL, NULL, NULL, NULL, 1, 2, 6, 11, 730, 1095, 'warm', 'Thrives in warm climates. Can produce two crops per year.'),

    -- Rhubarb
    ('rhubarb-cold', 'Rhubarb', 'fruit', NULL, NULL, NULL, NULL, 5, 5, 6, 8, 365, 730, 'cold', 'Perennial. Plant crowns in spring. Do not harvest first year.'),
    ('rhubarb-temperate', 'Rhubarb', 'fruit', NULL, NULL, NULL, NULL, 3, 4, 4, 6, 365, 730, 'temperate', 'Needs winter chill. Divide every 4-5 years. Leaves are toxic.'),
    ('rhubarb-warm', 'Rhubarb', 'fruit', NULL, NULL, NULL, NULL, 11, 12, 2, 4, 365, 730, 'warm', 'Difficult in warm zones. Treat as annual or choose heat-tolerant varieties.'),

    -- Gooseberry
    ('gooseberry-cold', 'Gooseberry', 'fruit', NULL, NULL, NULL, NULL, 5, 5, 7, 8, 365, 730, 'cold', 'Very cold-hardy. Thorny bushes. Excellent for preserves.'),
    ('gooseberry-temperate', 'Gooseberry', 'fruit', NULL, NULL, NULL, NULL, 3, 4, 6, 7, 365, 730, 'temperate', 'Plant in partial shade in warmer areas. Prune to open center.'),
    ('gooseberry-warm', 'Gooseberry', 'fruit', NULL, NULL, NULL, NULL, 11, 12, 3, 5, 365, 730, 'warm', 'Challenging in warm zones. Needs winter chill.'),

    -- Tomatillo
    ('tomatillo-cold', 'Tomatillo', 'fruit', 3, 4, NULL, NULL, 6, 6, 8, 9, 60, 80, 'cold', 'Start indoors. Plant at least two for cross-pollination.'),
    ('tomatillo-temperate', 'Tomatillo', 'fruit', 2, 3, NULL, NULL, 5, 6, 7, 10, 60, 75, 'temperate', 'Easy to grow. Needs two plants minimum for fruit set.'),
    ('tomatillo-warm', 'Tomatillo', 'fruit', 1, 2, NULL, NULL, 2, 3, 5, 11, 55, 75, 'warm', 'Thrives in heat. Self-seeds readily. Very productive.'),

    -- Ground Cherry
    ('ground-cherry-cold', 'Ground Cherry', 'fruit', 3, 4, NULL, NULL, 6, 6, 8, 9, 65, 80, 'cold', 'Start indoors. Fruits drop when ripe - use mulch for clean harvest.'),
    ('ground-cherry-temperate', 'Ground Cherry', 'fruit', 2, 3, NULL, NULL, 5, 6, 7, 10, 60, 75, 'temperate', 'Related to tomatillo. Fruits encased in papery husk.'),
    ('ground-cherry-warm', 'Ground Cherry', 'fruit', 1, 2, NULL, NULL, 2, 3, 5, 11, 55, 70, 'warm', 'Self-seeds prolifically. Harvest when husks turn brown.'),

    -- ==============
    -- FLOWERS (8)
    -- ==============

    -- Sunflower
    ('sunflower-cold', 'Sunflower', 'flower', NULL, NULL, 5, 6, NULL, NULL, 7, 9, 55, 75, 'cold', 'Direct sow after last frost. Choose shorter varieties for windy areas.'),
    ('sunflower-temperate', 'Sunflower', 'flower', NULL, NULL, 4, 6, NULL, NULL, 6, 9, 55, 70, 'temperate', 'Easy to grow. Succession plant for continuous blooms.'),
    ('sunflower-warm', 'Sunflower', 'flower', NULL, NULL, 3, 5, NULL, NULL, 5, 8, 50, 65, 'warm', 'Plant in spring for summer blooms. Full sun essential.'),

    -- Marigold
    ('marigold-cold', 'Marigold', 'flower', 4, 5, NULL, NULL, 6, 6, 7, 9, 45, 65, 'cold', 'Start indoors or direct sow after frost. Great companion plant.'),
    ('marigold-temperate', 'Marigold', 'flower', 3, 4, 4, 5, 5, 5, 6, 10, 45, 60, 'temperate', 'Deters many pests. Deadhead for continuous blooms.'),
    ('marigold-warm', 'Marigold', 'flower', NULL, NULL, 2, 4, NULL, NULL, 4, 11, 40, 55, 'warm', 'Nearly year-round in warmest areas. Excellent companion plant.'),

    -- Zinnia
    ('zinnia-cold', 'Zinnia', 'flower', 4, 5, 6, 6, 6, 6, 7, 9, 60, 75, 'cold', 'Direct sow after frost or start indoors. Attracts butterflies.'),
    ('zinnia-temperate', 'Zinnia', 'flower', NULL, NULL, 4, 6, NULL, NULL, 6, 10, 55, 70, 'temperate', 'Direct sow for best results. Cut flowers to encourage more blooms.'),
    ('zinnia-warm', 'Zinnia', 'flower', NULL, NULL, 3, 5, NULL, NULL, 5, 11, 50, 65, 'warm', 'Easy annual. Good air circulation prevents powdery mildew.'),

    -- Cosmos
    ('cosmos-cold', 'Cosmos', 'flower', 4, 5, NULL, NULL, 6, 6, 7, 9, 50, 70, 'cold', 'Start indoors or direct sow after frost. Thrives in poor soil.'),
    ('cosmos-temperate', 'Cosmos', 'flower', NULL, NULL, 4, 5, NULL, NULL, 6, 10, 50, 60, 'temperate', 'Direct sow. Do not over-fertilize or you get leaves, not flowers.'),
    ('cosmos-warm', 'Cosmos', 'flower', NULL, NULL, 3, 4, NULL, NULL, 5, 11, 45, 60, 'warm', 'Self-seeds readily. Drought-tolerant once established.'),

    -- Nasturtium
    ('nasturtium-cold', 'Nasturtium', 'flower', NULL, NULL, 5, 6, NULL, NULL, 7, 9, 45, 65, 'cold', 'Direct sow after frost. Edible flowers and leaves. Poor soil is fine.'),
    ('nasturtium-temperate', 'Nasturtium', 'flower', NULL, NULL, 4, 5, NULL, NULL, 6, 10, 40, 60, 'temperate', 'Edible flowers. Trap crop for aphids. Easy from seed.'),
    ('nasturtium-warm', 'Nasturtium', 'flower', NULL, NULL, 2, 3, NULL, NULL, 4, 6, 40, 55, 'warm', 'Cool-season annual in warm zones. Fades in summer heat.'),

    -- Petunia
    ('petunia-cold', 'Petunia', 'flower', 2, 3, NULL, NULL, 6, 6, 7, 9, 60, 75, 'cold', 'Start indoors early. Tiny seeds need light to germinate.'),
    ('petunia-temperate', 'Petunia', 'flower', 2, 3, NULL, NULL, 4, 5, 5, 10, 55, 70, 'temperate', 'Popular bedding plant. Deadhead and fertilize regularly.'),
    ('petunia-warm', 'Petunia', 'flower', 1, 2, NULL, NULL, 2, 3, 3, 6, 55, 70, 'warm', 'Plant in fall or early spring. Struggles in extreme summer heat.'),

    -- Snapdragon
    ('snapdragon-cold', 'Snapdragon', 'flower', 2, 3, NULL, NULL, 5, 6, 7, 9, 65, 80, 'cold', 'Start indoors. Cool-season flower that tolerates light frost.'),
    ('snapdragon-temperate', 'Snapdragon', 'flower', 1, 2, NULL, NULL, 3, 4, 5, 7, 60, 75, 'temperate', 'Cool-season bloomer. May rebloom in fall.'),
    ('snapdragon-warm', 'Snapdragon', 'flower', 9, 10, NULL, NULL, 10, 11, 11, 3, 60, 75, 'warm', 'Fall/winter annual in warm climates. Outstanding cool-weather color.'),

    -- Sweet Pea
    ('sweet-pea-cold', 'Sweet Pea', 'flower', 3, 4, 5, 5, 5, 5, 7, 8, 50, 70, 'cold', 'Soak seeds before planting. Provide trellis. Prefers cool weather.'),
    ('sweet-pea-temperate', 'Sweet Pea', 'flower', NULL, NULL, 2, 3, NULL, NULL, 5, 7, 50, 65, 'temperate', 'Plant early in spring. Fragrant blooms fade in summer heat.'),
    ('sweet-pea-warm', 'Sweet Pea', 'flower', NULL, NULL, 10, 11, NULL, NULL, 1, 4, 50, 65, 'warm', 'Fall-planted for winter/spring blooms. Heat ends flowering.');
  `);
};
