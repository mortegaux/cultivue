<div align="center">

# 🌱 CultiVue

**A powerful, self-hosted garden and hydroponics management platform.**

[![Node.js Version](https://img.shields.io/badge/node-%3E%3D20.0.0-brightgreen.svg?style=flat-square)](https://nodejs.org/)
[![Database](https://img.shields.io/badge/database-SQLite_(better--sqlite3)-003B57.svg?style=flat-square)](https://sqlite.org/)
[![Docker](https://img.shields.io/badge/docker-ready-2496ED.svg?style=flat-square)](https://www.docker.com/)
[![Accessibility](https://img.shields.io/badge/accessibility-WCAG_2.1_AA-blue.svg?style=flat-square)](https://www.w3.org/WAI/standards-guidelines/wcag/)
[![License](https://img.shields.io/badge/license-MIT-green.svg?style=flat-square)](LICENSE)

*Track hydroponics, aquaponics, soil beds, containers, and houseplants in one centralized, responsive, privacy-respecting dashboard.*

---

![CultiVue Dashboard](docs/screenshots/01-dashboard.png)

</div>

## 📖 Table of Contents

- [Overview](#-overview)
- [Key Features](#-key-features)
- [Visual Tour](#-visual-tour)
- [Quick Start](#-quick-start)
  - [Docker Compose (Recommended)](#docker-compose-recommended)
  - [Bare Metal Installation](#bare-metal-installation)
- [Configuration](#-configuration)
- [Sensor & Device Integration](#-sensor--device-integration)
- [Webhook System](#-webhook-system)
- [Architecture & Tech Stack](#-architecture--tech-stack)
- [Testing](#-testing)
- [API Documentation](#-api-documentation)
- [License](#-license)

---

## 🌿 Overview

**CultiVue** is an open-source, self-hosted web application engineered for growers of all disciplines. Whether you run a Deep Water Culture (DWC) lettuce raft, an aquaponics setup with tilapia, raised backyard soil beds, or an indoor jungle of houseplants, CultiVue provides the specialized tracking, environmental metrics, and scheduling required to keep your plants thriving.

Built with a fast, zero-build vanilla JavaScript frontend and an efficient Node.js/SQLite backend, CultiVue runs seamlessly on lightweight hardware like Raspberry Pis, NAS units, home servers, and VPS instances.

---

## ✨ Key Features

### 🪴 Multi-Method Garden Management
- **15+ Specialized Garden Subtypes** grouped across 4 primary categories:
  - **Hydroponics:** Deep Water Culture (DWC), Nutrient Film Technique (NFT), Kratky, Ebb & Flow, Aeroponics, Drip Systems.
  - **Aquaponics:** Media Bed, Deep Water Culture, Nutrient Film Technique with aquatic biological tracking.
  - **Soil & Outdoor:** In-ground beds, raised garden beds, hügelkultur, square-foot gardens.
  - **Indoor & Container:** Container pots, grow tents, green walls, and windowsill gardens.
- **Dynamic Metrics per Garden:** Track relevant environmental telemetry—pH, EC/PPM, water temperature, dissolved oxygen, ammonia ($NH_3$), nitrite ($NO_2$), nitrate ($NO_3$), soil moisture, and humidity.
- **Collapsible Category Accordions:** Organize dozens of active gardens with bulk category controls.

### 🍅 Adaptive Plant Lifecycle Tracking
- **Growth Stage Pipelines:** Monitor plants from seed to harvest (Germination → Seedling → Vegetative → Flowering → Fruiting → Harvested).
- **Dedicated Houseplant Mode:** Seamless lifecycle pipeline (`Acquired` → `Acclimating` → `Established` → `Thriving`) that adapts forms to hide unnecessary agricultural, sensor, and seed fields.
- **Harvest Logging:** Record yield weights, counts, quality ratings, and historical notes.
- **Seed Vault Inventory:** Track seed varieties, seed company, lot numbers, harvest days, germination rates, and seed age.

### 📅 Smart Planting Calendar
- **USDA Hardiness Zones:** Dynamic indoor sowing, outdoor sowing, transplanting, and harvest schedules tailored to your climate.
- **One-Click Plant Sowing:** Convert any calendar recommendation into an active plant entry with pre-populated stage dates with a single click.

### ⏰ Advanced Task Automation & Recurrence
- **Flexible Recurring Schedules:** Fixed intervals (e.g., every 3 days), specific days of the week, or multiple times per day (e.g., morning and evening nutrient checks).
- **Automated Termination Conditions:** Automatically complete or disable recurring routines by date, target run count, or garden state (e.g., when a garden is emptied or completely harvested).
- **Cross-Garden Views:** Consolidated task lists with priority markers, overdue badges, and filtering.

### 📡 IoT Hardware, Sensors & Webhooks
- **Device Provisioning:** Register ESP32, Arduino, Raspberry Pi, or commercial microcontrollers with dedicated, revokeable HMAC API keys.
- **Direct Sensor Ingestion:** High-throughput JSON ingestion endpoints with configurable rate limits.
- **Webhook Dispatch:** Push real-time event notifications (sensor threshold alerts, tasks due, harvests logged) to Home Assistant, Discord, Telegram, or custom webhooks with HMAC-SHA256 signature verification.

### 🎨 Modern Responsive UI & Accessibility
- **Blazing Fast SPA:** Sub-second loads with vanilla JavaScript and CSS custom properties—zero heavy client-side frameworks.
- **Mobile-First Experience:** Bottom navigation bar, swipeable sheets, and adaptive drawers optimized for mobile phones and tablets.
- **Dark Mode & Accent Themes:** Accessible dark theme with custom accent choices (Emerald, Blue, Purple, Rose, Amber, Teal).
- **WCAG 2.1 AA Compliant:** Comprehensive keyboard navigation, focus trapping, screen-reader landmarks, and high contrast ratios.

### 🔒 Enterprise-Grade Security
- Multi-user authentication powered by **Better Auth** with secure password hashing and session management.
- Granular user administration, audit logging, and account lockout protections.
- Hardened with Helmet CSP headers, CSRF/secure cookie flags, and strict input validation.

---

## 📸 Visual Tour

<details>
<summary><strong>Click to expand screenshots</strong></summary>

<br />

| Dashboard Overview | Multi-Garden Management |
| :---: | :---: |
| ![Dashboard](docs/screenshots/01-dashboard.png)<br />*Garden health indicators, upcoming tasks & recent activity* | ![Gardens](docs/screenshots/02-gardens.png)<br />*Categorized garden view with accordion panels* |

| Detailed Hydroponics View | Active Plant Inventory |
| :---: | :---: |
| ![Garden Detail](docs/screenshots/03-garden-detail.png)<br />*DWC Lettuce Raft with telemetry, plants & tasks* | ![Plants](docs/screenshots/04-plants.png)<br />*Plant inventory grouped by active growth stages* |

| Houseplant Adaptive Profile | Task Management |
| :---: | :---: |
| ![Houseplant Detail](docs/screenshots/05-plant-detail.png)<br />*Monstera Deliciosa with custom acquired/established pipeline* | ![Tasks](docs/screenshots/06-tasks.png)<br />*Prioritized task queue with recurrence rules & overdue badges* |

| Mobile Navigation | Accessible Dark Mode |
| :---: | :---: |
| ![Mobile View](docs/screenshots/07-dashboard-mobile.png)<br />*Bottom navigation and bottom-sheet controls* | ![Dark Mode](docs/screenshots/08-dashboard-dark.png)<br />*Accessible dark theme with WCAG contrast* |

| Adaptive Plant Creation Form | |
| :---: | :---: |
| ![Houseplant Form](docs/screenshots/09-houseplant-form.png)<br />*Form automatically adapts inputs based on plant category* | |

</details>

---

## 🚀 Quick Start

### Docker Compose (Recommended)

The fastest and cleanest way to run CultiVue is using Docker:

1. Create a `docker-compose.yml` file:
   ```yaml
   services:
     cultivue:
       image: node:20-alpine
       container_name: cultivue
       restart: unless-stopped
       working_dir: /app
       volumes:
         - ./:/app
         - cultivue-data:/app/data
       ports:
         - "8778:3000"
       environment:
         - NODE_ENV=production
         - PORT=3000
         - DB_PATH=data/cultivue.db
       command: sh -c "npm install && npm start"

   volumes:
     cultivue-data:
   ```

2. Start the container:
   ```bash
   docker compose up -d
   ```

3. Open your browser and navigate to:
   ```
   http://localhost:8778
   ```
   The first-time Out-of-Box-Experience (OOBE) setup wizard will guide you through creating your initial administrator account.

---

### Bare Metal Installation

Requirements: **Node.js 20+** and **npm**.

1. **Clone the repository:**
   ```bash
   git clone https://github.com/mortegaux/cultivue.git
   cd cultivue
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Start the application:**
   ```bash
   npm start
   ```

4. Access CultiVue at `http://localhost:3000`.

---

## ⚙️ Configuration

CultiVue can be configured via environment variables or a `.env` file:

| Variable | Default | Description |
|---|---|---|
| `PORT` | `3000` | Port for the HTTP Express server. |
| `DB_PATH` | `data/cultivue.db` | Relative or absolute path to the SQLite database file. |
| `NODE_ENV` | `development` | Setting to `production` enables secure cookies, strict CSP, and optimized logging. |
| `BETTER_AUTH_SECRET` | *(auto-generated)* | Secret key used by Better Auth for signing sessions and tokens. |
| `BETTER_AUTH_URL` | `http://localhost:3000` | Base URL for Better Auth routing. |

---

## 📡 Sensor & Device Integration

CultiVue allows microcontrollers and environmental monitors (e.g., ESPHome, Tasmota, custom microcontrollers) to push sensor readings directly over HTTP.

### Ingestion Request Example

1. Generate an API Key under **Settings → Devices**.
2. Submit sensor readings via `POST /api/sensor/readings`:

```bash
curl -X POST http://localhost:8778/api/sensor/readings \
  -H "Content-Type: application/json" \
  -H "X-API-Key: cv_dev_your_api_key_here" \
  -d '{
    "readings": [
      { "metric_id": "ph", "value": 6.1 },
      { "metric_id": "ppm", "value": 1050 },
      { "metric_id": "water_temp", "value": 68.5 }
    ]
  }'
```

*Default rate limit:* **100 requests / minute** per device key.

---

## 🪝 Webhook System

CultiVue can broadcast real-time events to external endpoints (Home Assistant, Node-RED, alerting systems):

* **Event Types:**
  * `sensor.reading` — Triggered when a new sensor telemetry data point arrives.
  * `alert.threshold` — Fired when a metric breaches defined safety ranges (e.g., pH > 7.0 or water level low).
  * `task.due` — Dispatched when scheduled garden routines require attention.
  * `harvest.logged` — Emitted when a crop harvest is recorded.

Every webhook delivery includes an `X-CultiVue-Signature` header computed using HMAC-SHA256 with your webhook secret for cryptographic verification.

---

## 🏗️ Architecture & Tech Stack

```
cultivue/
├── public/                 # Client assets (Zero-build SPA)
│   ├── index.html          # SPA shell and modal/drawer overlays
│   ├── css/styles.css      # Custom property variables, responsive layouts, themes
│   ├── js/app.js           # Core state management and page renderers (~3800 LOC)
│   ├── js/api.js           # REST API client wrapper
│   └── fonts/              # Self-hosted Material Symbols font files
├── server/                 # Express backend
│   ├── index.js            # REST API endpoints & route handlers
│   ├── recurrence.js       # Advanced task recurrence computation engine
│   ├── settings.js         # Configuration and system settings helper
│   └── migrations/         # Automated sequential SQLite database migrations
├── docs/                   # Documentation & visual assets
│   ├── api.md              # Complete REST API reference
│   └── screenshots/        # High-resolution application screenshots
└── tests/                  # Automated integration and regression test suites
```

- **Backend:** Node.js, Express, SQLite via [`better-sqlite3`](https://github.com/WiseLibs/better-sqlite3) (synchronous execution, WAL mode).
- **Frontend:** Vanilla JavaScript, CSS Custom Properties, [Chart.js](https://www.chartjs.org/) for telemetry visualization.
- **Security:** [Better Auth](https://better-auth.com/) authentication, [Helmet](https://helmetjs.github.io/) CSP, password hashing, secure session cookies, HMAC token hashing, rate limiting.

---

## 🧪 Testing

The test suite exercises authentication, migrations, calendar sowing, task recurrence engines, and API endpoints:

```bash
# Run unit & integration test suites
npm test

# Run tests with test coverage reporting (c8)
npm run test:coverage
```

---

## 📚 API Documentation

For the full REST API specification (including authentication endpoints, garden schemas, task payload definitions, and migration schemas), see [docs/api.md](docs/api.md).

---

## 📄 License

This project is open-source software licensed under the [MIT License](LICENSE).

