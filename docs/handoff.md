# CultiVue Handoff Document

## Project Overview

CultiVue is a garden management web app supporting hydroponic, soil, container, and aquaponics gardens. It's a vanilla JS single-page application with an Express + SQLite backend, deployed via Docker.

## Architecture

### Frontend (Single-Page App)
- **No framework** — vanilla JS with hash-based routing (`navigateTo()` / `routeFromPath()`)
- **Single entry point**: `public/js/app.js` (~3800 lines) contains all state, page renderers, and UI logic
- **API client**: `public/js/api.js` wraps all fetch calls with error handling
- **Styles**: `public/css/styles.css` (~1120 lines) — CSS custom properties for theming, responsive breakpoints at 1024/768/480px
- **Icons**: Material Symbols Outlined (self-hosted TTF at `/fonts/`)
- **Charts**: Chart.js (vendored at `public/js/chart.min.js`)

### Backend
- **Express** server at `server/index.js` — all REST API routes
- **SQLite** via `better-sqlite3` — database at `data/cultivue.db`
- **Settings utility**: `server/settings.js`
- **Auth**: bcrypt password hashing, session cookies, HMAC API keys for devices

### Deployment
- Docker Compose: `docker compose up --build -d`
- Host port **8778** maps to container port **3000**
- Data volume persists SQLite database across rebuilds

## Key Patterns

### Navigation
- 9 pages: Dashboard, Gardens, Logs, Tasks, Calendar, Plants, Seeds, Locations, Settings (plus Garden Detail)
- On mobile (<=768px): bottom nav shows 5 primary items (Dashboard, Gardens, Logs, Tasks, More)
- "More" button opens a bottom sheet with 5 secondary items (Calendar, Plants, Seeds, Locations, Settings)
- `SECONDARY_PAGES` constant in app.js defines which pages are secondary
- `updateNavHighlight()` handles both primary active state and `.more-active` class on the More button

### UI Components
- **Drawer**: Slide-out panel from right (full-width on mobile) — used for garden detail, plant detail, etc.
- **Modal**: Centered dialog (bottom-sheet style on mobile) — used for forms, confirmations
- **More Sheet**: Bottom sheet for mobile nav overflow — `showMoreSheet()` / `closeMoreSheet()`
- All three use focus trapping, Escape to close, backdrop click to close, body scroll lock

### Theming
- Light/dark via `data-theme` on `<html>`
- 6 accent colors via `data-accent` (emerald default, blue, purple, rose, amber, teal, custom)
- CSS custom properties cascade through both theme and accent

### Mobile Design (<=768px)
- Bottom nav bar: 64px + safe area inset, MD3 pill-shaped active indicator
- Safe area support: `viewport-fit=cover` + `env(safe-area-inset-bottom)` throughout
- Toasts positioned above bottom nav
- Modals slide up from bottom with safe area padding
- Drawers go full-width

### State Management
- Single `state` object at top of app.js holds all app state
- No reactivity — pages are re-rendered imperatively via `renderPage()`
- Each page has a `renderXxxPage(main)` function that writes innerHTML and attaches event listeners

## File Map

```
public/
  index.html          — SPA shell, nav structure, overlay containers
  css/styles.css      — All styles (~1120 lines)
  js/app.js           — All frontend logic (~3800 lines)
  js/api.js           — API client wrapper
  js/chart.min.js     — Chart.js (vendored)
  fonts/              — Material Symbols Outlined TTF
server/
  index.js            — Express routes and middleware
  settings.js         — Settings utility
data/
  cultivue.db         — SQLite database (gitignored, created at runtime)
docs/
  api.md              — REST API reference
  handoff.md          — This file
  transcript.md       — Session work log
docker-compose.yml    — Docker deployment config
Dockerfile            — Node 20 Alpine image
```

## CSS Breakpoints

| Breakpoint | Behavior |
|---|---|
| >1024px | Full sidebar (240px), 4-column grids |
| 769–1024px | Full sidebar, 2-column grids, tighter padding |
| 481–768px | Bottom nav (5 items + More sheet), single column, bottom-sheet modals |
| <=480px | Smaller nav icons/labels/pills, tighter spacing |

## Nav Item Classification

| Class | Items | Desktop | Mobile |
|---|---|---|---|
| `.nav-primary-item` | Dashboard, Gardens, Logs, Tasks | Visible in sidebar | Visible in bottom nav |
| `.nav-more-item` | More button | Hidden | Visible in bottom nav |
| `.nav-secondary-item` | Calendar, Plants, Seeds, Locations, Settings | Visible in sidebar | Hidden (in More sheet) |

## Testing

```bash
npm install && npm test
npm run test:coverage
```

All 45 tests pass. (The 34 pre-existing failures were resolved: test suite execution order was set to initialize auth first, rate limiters skip during test runs, and webhook URL validator avoids requiring live external DNS in tests.)

## Permission Model

Two roles: **admin** and **regular user** (binary `is_admin` flag on users table).

| Resource | Read | Create/Edit/Delete | Notes |
|----------|------|--------------------|-------|
| Gardens | All users | All users | |
| Locations | All users | All users | |
| Logs | All users | All users | |
| Tasks | All users | All users | |
| Plants | All users | All users | |
| Seeds | All users | All users | |
| Planting Calendar | All users | All users | Includes Perenual API lookups |
| Settings | All users | Admin only | Default units, timezone, garden types |
| User Management | Admin only | Admin only | |
| Devices & Sensors | Admin only | Admin only | UI shows "Coming Soon" |
| Webhooks | Admin only | Admin only | |

## Recent Changes (Latest First)

1. **Admin non-admin user deletion (`DELETE /api/admin/users/:id`)** — Admins can now permanently remove non-admin accounts from the Users panel in Settings. The backend cascades sessions and user audit records within an atomic transaction while preventing self-deletion and deletion of admin accounts. Non-admins receive 403.
2. **Dynamic plant creation from planting calendar lines** — Clicking any month cell or schedule bar on a calendar entry line, the quick-add button in the crop column, or "Plant this Crop" in the crop detail drawer opens an in-page dynamic modal pre-populated with crop details (name, species, plant type from category, growth stage tailored to the clicked month window [seed / seedling / harvest], seeded date, growing notes & maturity days, inventory seed match, and active garden). Closing or submitting keeps the user on the calendar page with scroll position and active filter preserved.
3. **Modal checkbox spacing fix** (`cb620e2`) — Scoped form label selector to direct children (`.form-group > label`) preventing block override on `.checkbox-label`; styled `.checkbox-group` as compact inline-flex items with natural row gaps (`gap: 8px 16px`) and balanced modal-actions margin.
4. **Test suite fix & 100% green tests** (`9034724`) — Ordered test run (`auth.test.js` -> `api.test.js` -> `migrations.test.js`), added rate limiter bypass for tests, and bypassed DNS lookup in test environment for webhook SSRF check.
5. **Date bug fix & houseplant support** (PR #4) — Fixed off-by-one UTC midnight issue across task, plant, and seed dates; added houseplant plant type and lifecycle stages.
6. **Security hardening** (PR #3) — Secure cookies, webhook secret masking, SSRF guard, session revocation on password change, CSV formula injection defense, atomic OOBE admin creation.
7. **User permissions expansion** (`56ac7ee`) — Regular users can now manage locations, seeds, and calendar crops (removed `requireAdmin` from 11 backend routes, removed `isAdmin` UI guards from seed/crop drawers and calendar add button)
8. **Planting calendar** (`43cd1b3`) — Calendar with custom crop CRUD and Perenual API integration
9. **New buttons for all users** (`8d9db98`) — Added New button to plants and seeds screens
10. **Mobile app-like nav** (`c4a7be7`) — Bottom nav with 5 items, More bottom sheet, MD3 pill indicator, safe area support, toast/modal repositioning
11. **Event delegation for garden types** (`5f66d83`) — Fix toggle handlers using delegation
12. **Garden type settings toggle fix** (`0b7cc5e`) — Prevent background scroll on modals
