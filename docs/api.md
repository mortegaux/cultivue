# CultiVue API Reference

Base URL: `http://localhost:3000/api`

All API routes return JSON. Authentication is session-cookie based for the web UI and API-key based for sensor ingestion.

## Authentication

### POST /auth/setup
Create initial admin account (only works when no users exist).

**Body:** `{ username, display_name, password }`
**Response:** `201 { user: { id, username, display_name, is_admin } }`

### POST /auth/login
**Body:** `{ username, password }`
**Response:** `200 { user }` — Sets `session` cookie.

### POST /auth/logout
Destroys session. **Response:** `200 { success: true }`

### GET /auth/me
Returns current user. **Response:** `200 { user }`

### POST /auth/change-password
**Body:** `{ current_password, new_password }`
**Response:** `200 { success: true }`

## Setup

### GET /setup/status
**Response:** `{ needs_setup: bool, setup_completed: bool }`

### POST /setup/wizard
Multi-step OOBE wizard.
**Body:** `{ admin: { username, display_name, password }, settings: { app_name, default_units, timezone }, garden_types: ["hydro-dwc", ...] }`
**Response:** `201 { user }`

## Settings (Admin)

### GET /settings
**Response:** `{ app_name, default_units, timezone, ... }`

### PUT /settings/:key
**Body:** `{ value, type }` (type: string|boolean|number|json)
**Response:** `200 { success: true }`

## Garden Types

### GET /garden-types
**Response:** `[{ id, category, subcategory, display_name, is_enabled, sort_order }]`

### PUT /garden-types/:id (admin)
**Body:** `{ is_enabled }`
**Response:** `200 { success: true }`

### PUT /garden-types/category/:category (admin)
**Body:** `{ is_enabled }`
**Response:** `200 { success: true, count }`

### GET /garden-types/:id/metrics
**Response:** `[{ id, name, unit_metric, unit_imperial, data_type, min_value, max_value, ideal_min, ideal_max, decimal_places, is_required }]`

## Metrics

### GET /metrics
**Response:** `[{ id, name, ... }]`

## Locations

### GET /locations
**Response:** `[{ id, name, description, sort_order, created_at, updated_at, garden_count }]`

### POST /locations
**Body:** `{ name, description?, sort_order? }`
**Response:** `201 { id, name, description, sort_order, created_at, updated_at, garden_count }`

### PUT /locations/:id
**Body:** `{ name, description?, sort_order? }`
**Response:** `200 { success: true }`

### DELETE /locations/:id
**Response:** `200 { success: true }`

### GET /locations/:id/gardens
**Response:** `[{ id, name, ... }]` — Gardens at this location.

## Seeds

### GET /seeds
**Response:** `[{ id, name, variety, supplier, ..., plant_count, failure_count }]`

### GET /seeds/:id
**Response:** `{ id, name, variety, supplier, purchase_date, purchase_price, quantity, quantity_unit, expected_germination_rate, days_to_germination, notes, created_at, updated_at }`

### POST /seeds
**Body:** `{ name, variety?, supplier?, purchase_date?, purchase_price?, quantity?, quantity_unit?, expected_germination_rate?, days_to_germination?, notes? }`
**Response:** `201 { id, name, ... }`

### PUT /seeds/:id
**Body:** Same as POST.
**Response:** `200 { success: true }`

### DELETE /seeds/:id
**Response:** `200 { success: true }`

### GET /seeds/:id/metrics
**Response:** `{ total_plants, past_germination, germination_rate, total_failures, failures: [{ failure_stage, failure_reason, count }] }`

## Gardens

### GET /gardens
**Response:** `[{ id, name, system_type, plant_types, start_date, is_active, garden_type_id }]`

### POST /gardens
**Body:** `{ name, garden_type_id, plant_types, start_date }`
**Response:** `201 { id, name, ... }`

### PUT /gardens/:id
**Body:** `{ name, garden_type_id, plant_types, is_active }`

### DELETE /gardens/:id

## Log Entries

### GET /gardens/:gardenId/logs?limit=100
**Response:** `[{ id, garden_id, timestamp, ph, ppm, water_temp, nutrients, notes, metric_data }]`

### POST /gardens/:gardenId/logs
**Body:** `{ metric_data: { ph: 6.0, ppm: 1000, ... }, notes }`

### PUT /logs/:id
**Body:** Same as POST.

### DELETE /logs/:id

## Tasks

### GET /gardens/:gardenId/tasks
### GET /tasks?status=active|completed|disabled&priority=high&limit=50
Cross-garden task listing with filtering.

### POST /tasks
### POST /gardens/:gardenId/tasks
**Body:** `{ title, description, due_date, due_time, priority, is_recurring, recurring_days, recurrence_type, days_of_week, times_of_day, end_type, end_date, end_occurrences, end_condition }`

### PUT /tasks/:id
**Body:** Same as POST, plus `is_completed`, `is_disabled`, `disabled_reason`.

### PATCH /tasks/:id/toggle
Toggles completion. Evaluates termination conditions and advances to next recurring task if applicable. If a termination condition is met (end date exceeded, max occurrences reached, all plants harvested/transplanted, or garden empty), sets `is_disabled: true` with reason and does not spawn a new task.

### PATCH /tasks/:id/re-enable
Re-enables a disabled recurring task schedule.

### PATCH /tasks/:id/disable
Disables/pauses a recurring task schedule.
**Body:** `{ reason }`

### DELETE /tasks/:id

## Plants

### GET /gardens/:gardenId/plants
### POST /gardens/:gardenId/plants
**Body:** `{ name, plant_type, species, seeded_date, current_stage, notes }`

### PUT /plants/:id
### DELETE /plants/:id

## Stats

### GET /gardens/:gardenId/stats
**Response:** `{ active_plants, active_tasks, total_logs, latest_log }`

### GET /dashboard/stats
**Response:** `{ total_plants, total_active_tasks, total_logs, total_gardens, upcoming_tasks, recent_activity }`

## Devices (Admin)

### GET /devices
### POST /devices
**Body:** `{ name, device_type, garden_id, description }`

### GET /devices/:id
### PUT /devices/:id
### DELETE /devices/:id

### GET /devices/:id/keys
### POST /devices/:id/keys
**Body:** `{ label }`
**Response:** `201 { id, key_prefix, label, raw_key }` — `raw_key` is shown only once.

### DELETE /devices/:id/keys/:keyId

## Sensor Readings

### POST /sensor/readings
API-key authenticated. Set `X-API-Key` header.

**Body (single):** `{ metric_id, value, recorded_at? }`
**Body (batch):** `{ readings: [{ metric_id, value, recorded_at? }, ...] }` (max 100)

**Response:** `201 { accepted, readings }`

Rate limit: 100 requests/minute per API key.

### GET /sensor/readings/:deviceId?limit=100&offset=0&metric_id=ph
Session authenticated.

## Webhooks (Admin)

### GET /webhooks
### POST /webhooks
**Body:** `{ name, url, secret?, events: ["sensor_reading", ...], retry_count? }`

Events: `sensor_reading`, `metric_alert`, `task_due`, `harvest`

### PUT /webhooks/:id
### DELETE /webhooks/:id

### GET /webhooks/:id/logs
### POST /webhooks/:id/test

Webhook payloads include:
- `X-Webhook-Event` header
- `X-Webhook-Signature: sha256=<hmac>` header (if secret configured)

## Planting Calendar

### GET /planting-calendar?zone=7
**Response:** `{ zone, zone_group, crops: [{ name, category, zones: { cold: {...}, temperate: {...}, warm: {...} } }] }`

### GET /planting-calendar/search?q=tomato
Search local planting index by name.
**Response:** `{ results: [{ name, category, zones: { ... } }] }`

### GET /planting-calendar/lookup?q=tomato
Proxy search to Perenual API.
**Response:** `{ results: [{ id, common_name, scientific_name, cycle, watering, sunlight, hardiness_min, hardiness_max }] }`

### GET /planting-calendar/lookup/:id
Proxy detail from Perenual API.
**Response:** `{ common_name, scientific_name, cycle, growth_rate, care_level, harvest_season, ... }`

### GET /planting-calendar/crop/:name
**Response:** `{ name, category, zones: { cold: {...}, temperate: {...}, warm: {...} } }`

### POST /planting-calendar
**Body:** `{ name, category, zone_group, sow_indoor_start?, sow_indoor_end?, sow_outdoor_start?, sow_outdoor_end?, transplant_start?, transplant_end?, harvest_start?, harvest_end?, days_to_maturity_min?, days_to_maturity_max?, notes? }`
Or batch: `{ all_zones: [{ name, category, zone_group, ... }, ...] }`
**Response:** `201 { success: true, crops: [{ id, name, category, zone_group }] }`

### PUT /planting-calendar/:id
**Body:** `{ name, category, sow_indoor_start?, ... }` (same fields as POST, minus zone_group)
**Response:** `200 { success: true }`

### DELETE /planting-calendar/:id?all=true
Delete single zone row, or all zones for the crop if `all=true`.
**Response:** `200 { success: true }`

## Audit Log

### GET /audit?limit=50&offset=0

## CSV Export

### GET /export/logs/:gardenId
### GET /export/plants/:gardenId

## Admin: User Management

### GET /admin/users
### POST /admin/users
**Body:** `{ username, display_name, password, is_admin }`

### PATCH /admin/users/:id/active
**Body:** `{ is_active }`

### POST /admin/users/:id/reset-password
**Body:** `{ password }`
