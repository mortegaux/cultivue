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

### GET /garden-types/:id/metrics
**Response:** `[{ id, name, unit_metric, unit_imperial, data_type, min_value, max_value, ideal_min, ideal_max, decimal_places, is_required }]`

## Metrics

### GET /metrics
**Response:** `[{ id, name, ... }]`

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
### GET /tasks?status=active&priority=high&limit=50
Cross-garden task listing with filtering.

### POST /gardens/:gardenId/tasks
**Body:** `{ title, description, due_date, priority, is_recurring, recurring_days }`

### PUT /tasks/:id
### PATCH /tasks/:id/toggle
Toggles completion. Creates next recurring task if applicable.

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
