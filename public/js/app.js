// === State ===
let state = {
  user: null,
  gardens: [],
  gardenTypes: [],
  metrics: [],
  locations: [],
  seeds: [],
  settings: {},
  selectedGardenId: null,
  currentPage: 'dashboard',
  theme: localStorage.getItem('theme') || 'light',
  logsChart: null,
};

// === Screen reader announcer ===
function announce(msg) {
  const el = document.getElementById('sr-announcer');
  if (el) { el.textContent = ''; requestAnimationFrame(() => { el.textContent = msg; }); }
}

// === Toast notification ===
function toast(message, type = 'success') {
  const container = document.getElementById('toastContainer');
  if (!container) return;
  const t = document.createElement('div');
  t.className = `toast toast-${type}`;
  t.setAttribute('role', 'alert');
  t.textContent = message;
  container.appendChild(t);
  requestAnimationFrame(() => t.classList.add('show'));
  setTimeout(() => { t.classList.remove('show'); setTimeout(() => t.remove(), 300); }, 3000);
}

// === Init ===
document.addEventListener('DOMContentLoaded', async () => {
  applyTheme(state.theme);
  await checkAuth();
});

async function checkAuth() {
  try {
    const setupStatus = await API.setupStatus();
    if (setupStatus.needs_setup) {
      showSetupWizard();
      return;
    }
    const result = await API.me();
    if (result.user) {
      state.user = result.user;
      if (state.user.must_change_password) {
        showChangePassword(true);
        return;
      }
      await enterApp();
    } else {
      showAuth();
    }
  } catch {
    showAuth();
  }
}

async function enterApp() {
  document.getElementById('authScreen').hidden = true;
  document.getElementById('appLayout').hidden = false;
  setupNav();
  renderUserBadge();
  try {
    const [gardens, types, metrics, locations, seeds] = await Promise.all([
      API.getGardens().catch(() => []),
      API.getGardenTypes().catch(() => []),
      API.getMetrics().catch(() => []),
      API.getLocations().catch(() => []),
      API.getSeeds().catch(() => []),
    ]);
    state.gardens = gardens;
    state.gardenTypes = types;
    state.metrics = metrics;
    state.locations = locations;
    state.seeds = seeds;
    if (state.gardens.length && !state.selectedGardenId) {
      state.selectedGardenId = state.gardens[0].id;
    }
  } catch { /* continue with empty data */ }
  window.addEventListener('hashchange', routeFromHash);
  if (location.hash && location.hash !== '#/') {
    routeFromHash();
  } else {
    location.hash = '#/dashboard';
  }
}

// ============================================
// === AUTH SCREENS
// ============================================
function showAuth() {
  state.user = null;
  document.getElementById('appLayout').hidden = true;
  const screen = document.getElementById('authScreen');
  screen.hidden = false;
  screen.innerHTML = `
    <div class="auth-card">
      <div class="brand">
        <span class="material-symbols-outlined" aria-hidden="true">eco</span>
        <span>CultiVue</span>
      </div>
      <h1 class="auth-heading">Sign in to your account</h1>
      <div class="auth-error" id="authError" role="alert"></div>
      <form id="loginForm">
        <div class="form-group">
          <label for="login-username">Username</label>
          <input class="form-input" id="login-username" name="username" autocomplete="username" required aria-required="true">
        </div>
        <div class="form-group">
          <label for="login-password">Password</label>
          <input class="form-input" id="login-password" name="password" type="password" autocomplete="current-password" required aria-required="true">
        </div>
        <button class="btn btn-primary btn-full" type="submit">Sign In</button>
      </form>
    </div>
  `;
  document.getElementById('login-username').focus();
  document.getElementById('loginForm').addEventListener('submit', async e => {
    e.preventDefault();
    const fd = new FormData(e.target);
    try {
      const result = await API.login(fd.get('username'), fd.get('password'));
      if (result.error) { showAuthError(result.error); return; }
      state.user = result.user;
      if (state.user.must_change_password) { showChangePassword(true); }
      else { await enterApp(); }
    } catch (err) { showAuthError('Login failed'); }
  });
}

function showSetupWizard() {
  document.getElementById('appLayout').hidden = true;
  const screen = document.getElementById('authScreen');
  screen.hidden = false;
  let wizardStep = 1;
  const wizardData = { admin: {}, settings: { default_units: 'metric', timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC' }, garden_types: [] };

  function renderWizardStep() {
    const totalSteps = 3;
    const progressPct = (wizardStep / totalSteps) * 100;

    let stepContent = '';
    if (wizardStep === 1) {
      stepContent = `
        <h2>Step 1: Create Admin Account</h2>
        <p class="wizard-desc">Set up the administrator account for your CultiVue instance.</p>
        <div class="form-group">
          <label for="wiz-username">Username <span class="required" aria-hidden="true">*</span></label>
          <input class="form-input" id="wiz-username" name="username" required aria-required="true" minlength="3" maxlength="30" pattern="[a-zA-Z0-9_.-]+" value="${esc(wizardData.admin.username || '')}">
        </div>
        <div class="form-group">
          <label for="wiz-display">Display Name <span class="required" aria-hidden="true">*</span></label>
          <input class="form-input" id="wiz-display" name="display_name" required aria-required="true" maxlength="50" value="${esc(wizardData.admin.display_name || '')}">
        </div>
        <div class="form-group">
          <label for="wiz-password">Password <span class="required" aria-hidden="true">*</span></label>
          <input class="form-input" id="wiz-password" name="password" type="password" autocomplete="new-password" required aria-required="true" minlength="8">
          <div class="form-hint">Min 8 characters, at least 1 letter and 1 number</div>
        </div>
        <div class="form-group">
          <label for="wiz-confirm">Confirm Password <span class="required" aria-hidden="true">*</span></label>
          <input class="form-input" id="wiz-confirm" name="confirm" type="password" autocomplete="new-password" required aria-required="true">
        </div>`;
    } else if (wizardStep === 2) {
      stepContent = `
        <h2>Step 2: Preferences</h2>
        <p class="wizard-desc">Configure your CultiVue preferences.</p>
        <div class="form-group">
          <label for="wiz-units">Default Units</label>
          <select class="form-input" id="wiz-units" name="default_units">
            <option value="metric" ${wizardData.settings.default_units === 'metric' ? 'selected' : ''}>Metric (°C, cm)</option>
            <option value="imperial" ${wizardData.settings.default_units === 'imperial' ? 'selected' : ''}>Imperial (°F, in)</option>
          </select>
        </div>
        <div class="form-group">
          <label for="wiz-tz">Timezone</label>
          <input class="form-input" id="wiz-tz" name="timezone" value="${esc(wizardData.settings.timezone)}">
        </div>`;
    } else if (wizardStep === 3) {
      stepContent = `
        <h2>Step 3: Garden Types</h2>
        <p class="wizard-desc">Choose which garden categories to enable. You can change this later in Settings.</p>
        <div id="wizGardenTypes">Loading...</div>`;
    }

    screen.innerHTML = `
      <div class="auth-card auth-card-wide">
        <div class="brand">
          <span class="material-symbols-outlined" aria-hidden="true">eco</span>
          <span>CultiVue Setup</span>
        </div>
        <div class="wizard-progress" role="progressbar" aria-valuenow="${wizardStep}" aria-valuemin="1" aria-valuemax="${totalSteps}" aria-label="Setup progress">
          <div class="wizard-progress-bar" style="width:${progressPct}%"></div>
        </div>
        <div class="wizard-step-indicator">Step ${wizardStep} of ${totalSteps}</div>
        <div class="auth-error" id="authError" role="alert"></div>
        <form id="wizardForm" novalidate>
          ${stepContent}
          <div class="wizard-actions">
            ${wizardStep > 1 ? '<button type="button" class="btn btn-secondary" id="wizBack">Back</button>' : '<div></div>'}
            ${wizardStep < totalSteps ? '<button type="button" class="btn btn-primary" id="wizNext">Next</button>' : '<button type="submit" class="btn btn-primary">Complete Setup</button>'}
          </div>
        </form>
      </div>
    `;

    // Load garden types for step 3
    if (wizardStep === 3) {
      loadWizardGardenTypes();
    }

    const backBtn = document.getElementById('wizBack');
    const nextBtn = document.getElementById('wizNext');
    if (backBtn) backBtn.addEventListener('click', () => { saveCurrentStep(); wizardStep--; renderWizardStep(); });
    if (nextBtn) nextBtn.addEventListener('click', () => { if (validateCurrentStep()) { saveCurrentStep(); wizardStep++; renderWizardStep(); } });

    document.getElementById('wizardForm').addEventListener('submit', async e => {
      e.preventDefault();
      saveCurrentStep();
      try {
        const result = await API.setupWizard(wizardData);
        if (result.error) { showAuthError(result.error); return; }
        state.user = result.user;
        toast('Setup completed successfully!');
        await enterApp();
      } catch (err) { showAuthError('Setup failed. Please try again.'); }
    });

    announce(`Setup wizard step ${wizardStep} of ${totalSteps}`);
  }

  async function loadWizardGardenTypes() {
    try {
      const types = await API.request('GET', '/api/garden-types');
      const categories = {};
      for (const t of types) {
        if (!categories[t.category]) categories[t.category] = [];
        categories[t.category].push(t);
      }
      const el = document.getElementById('wizGardenTypes');
      if (!el) return;
      const catNames = { hydroponic: 'Hydroponic', soil: 'Soil', container: 'Container', aquaponics: 'Aquaponics' };
      // If no selections yet, default to all enabled
      if (!wizardData.garden_types.length) {
        wizardData.garden_types = types.filter(t => t.is_enabled).map(t => t.id);
      }
      el.innerHTML = Object.entries(categories).map(([cat, items]) => `
        <fieldset class="wizard-category">
          <legend>${catNames[cat] || cat}</legend>
          <div class="wizard-type-grid">
            ${items.map(t => `
              <label class="wizard-type-option">
                <input type="checkbox" name="garden_type" value="${t.id}" ${wizardData.garden_types.includes(t.id) ? 'checked' : ''}>
                <span>${esc(t.display_name)}</span>
              </label>
            `).join('')}
          </div>
        </fieldset>
      `).join('');
    } catch {
      const el = document.getElementById('wizGardenTypes');
      if (el) el.innerHTML = '<p>Could not load garden types. They can be configured later in Settings.</p>';
    }
  }

  function saveCurrentStep() {
    if (wizardStep === 1) {
      const form = document.getElementById('wizardForm');
      wizardData.admin.username = form.querySelector('[name="username"]')?.value || '';
      wizardData.admin.display_name = form.querySelector('[name="display_name"]')?.value || '';
      wizardData.admin.password = form.querySelector('[name="password"]')?.value || '';
    } else if (wizardStep === 2) {
      const form = document.getElementById('wizardForm');
      wizardData.settings.default_units = form.querySelector('[name="default_units"]')?.value || 'metric';
      wizardData.settings.timezone = form.querySelector('[name="timezone"]')?.value || 'UTC';
    } else if (wizardStep === 3) {
      wizardData.garden_types = [...document.querySelectorAll('[name="garden_type"]:checked')].map(el => el.value);
    }
  }

  function validateCurrentStep() {
    if (wizardStep === 1) {
      const form = document.getElementById('wizardForm');
      const u = form.querySelector('[name="username"]')?.value?.trim();
      const d = form.querySelector('[name="display_name"]')?.value?.trim();
      const p = form.querySelector('[name="password"]')?.value;
      const c = form.querySelector('[name="confirm"]')?.value;
      if (!u || u.length < 3) { showAuthError('Username must be at least 3 characters'); return false; }
      if (!d) { showAuthError('Display name is required'); return false; }
      if (!p || p.length < 8) { showAuthError('Password must be at least 8 characters'); return false; }
      if (!/[a-zA-Z]/.test(p) || !/[0-9]/.test(p)) { showAuthError('Password must contain at least 1 letter and 1 number'); return false; }
      if (p !== c) { showAuthError('Passwords do not match'); return false; }
    }
    return true;
  }

  renderWizardStep();
}

function showChangePassword(forced) {
  document.getElementById('appLayout').hidden = true;
  const screen = document.getElementById('authScreen');
  screen.hidden = false;
  screen.innerHTML = `
    <div class="auth-card">
      <div class="brand">
        <span class="material-symbols-outlined" aria-hidden="true">eco</span>
        <span>CultiVue</span>
      </div>
      <h1 class="auth-heading">${forced ? 'Password Change Required' : 'Change Password'}</h1>
      ${forced ? '<p class="wizard-desc">Your administrator has set a temporary password. Please choose a new password.</p>' : ''}
      <div class="auth-error" id="authError" role="alert"></div>
      <form id="changePasswordForm">
        <div class="form-group">
          <label for="cp-current">${forced ? 'Temporary Password' : 'Current Password'}</label>
          <input class="form-input" id="cp-current" name="current_password" type="password" required aria-required="true">
        </div>
        <div class="form-group">
          <label for="cp-new">New Password</label>
          <input class="form-input" id="cp-new" name="new_password" type="password" autocomplete="new-password" required aria-required="true" minlength="8">
          <div class="form-hint">Min 8 characters, at least 1 letter and 1 number</div>
        </div>
        <div class="form-group">
          <label for="cp-confirm">Confirm New Password</label>
          <input class="form-input" id="cp-confirm" name="confirm" type="password" autocomplete="new-password" required aria-required="true">
        </div>
        <button class="btn btn-primary btn-full" type="submit">Set New Password</button>
      </form>
      ${!forced ? '<div class="auth-toggle"><button type="button" class="link-btn" id="cpCancel">Cancel</button></div>' : ''}
    </div>
  `;
  const cancelBtn = document.getElementById('cpCancel');
  if (cancelBtn) cancelBtn.addEventListener('click', () => enterApp());
  document.getElementById('changePasswordForm').addEventListener('submit', async e => {
    e.preventDefault();
    const fd = new FormData(e.target);
    if (fd.get('new_password') !== fd.get('confirm')) { showAuthError('Passwords do not match'); return; }
    try {
      const result = await API.changePassword(fd.get('current_password'), fd.get('new_password'));
      if (result.error) { showAuthError(result.error); return; }
      state.user.must_change_password = false;
      toast('Password changed successfully');
      await enterApp();
    } catch (err) { showAuthError('Password change failed'); }
  });
}

function showAuthError(msg) {
  const el = document.getElementById('authError');
  if (el) { el.textContent = msg; el.classList.add('visible'); announce(msg); }
}

// ============================================
// === APP CORE
// ============================================
function applyTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme);
  state.theme = theme;
  localStorage.setItem('theme', theme);
}

function setupNav() {
  document.querySelectorAll('.nav-link').forEach(link => {
    link.addEventListener('click', e => {
      e.preventDefault();
      navigateTo(link.dataset.page);
    });
  });
}

function navigateTo(page, data) {
  state.currentPage = page;
  if (data) Object.assign(state, data);
  // Build hash URL
  let hash = '#/' + page;
  if (page === 'garden-detail' && state.selectedGardenId) hash += '/' + state.selectedGardenId;
  if (location.hash !== hash) history.pushState(null, '', hash);
  updateNavHighlight(page);
  renderPage();
  announce(`Navigated to ${page.replace('-', ' ')}`);
}

function updateNavHighlight(page) {
  document.querySelectorAll('.nav-link').forEach(l => {
    const isActive = l.dataset.page === page || (page === 'garden-detail' && l.dataset.page === 'gardens');
    l.classList.toggle('active', isActive);
    if (isActive) l.setAttribute('aria-current', 'page');
    else l.removeAttribute('aria-current');
  });
}

function routeFromHash() {
  const hash = location.hash || '#/dashboard';
  const parts = hash.replace('#/', '').split('/');
  const page = parts[0] || 'dashboard';
  const id = parts[1] || null;
  if (page === 'garden-detail' && id) state.selectedGardenId = id;
  state.currentPage = page;
  updateNavHighlight(page);
  renderPage();
}

function renderUserBadge() {
  const el = document.getElementById('userBadge');
  if (!el || !state.user) return;
  const initials = (state.user.display_name || state.user.username).slice(0, 2).toUpperCase();
  el.innerHTML = `
    <div class="user-badge">
      <div class="user-avatar" aria-hidden="true">${esc(initials)}</div>
      <span class="user-badge-name">${esc(state.user.display_name)}</span>
      <button class="btn-icon user-logout-btn" type="button" id="sidebarLogout" title="Sign out" aria-label="Sign out"><span class="material-symbols-outlined">logout</span></button>
    </div>
  `;
  document.getElementById('sidebarLogout').addEventListener('click', doLogout);
}

async function loadGardens() {
  state.gardens = await API.getGardens();
  if (state.gardens.length && !state.selectedGardenId) {
    state.selectedGardenId = state.gardens[0].id;
  }
}

function getSelectedGarden() { return state.gardens.find(g => g.id === state.selectedGardenId); }

function getGardenType(id) { return state.gardenTypes.find(t => t.id === id); }

function getGardenTypeDisplay(garden) {
  if (garden.garden_type_id) {
    const gt = getGardenType(garden.garden_type_id);
    return gt ? gt.display_name : garden.garden_type_id;
  }
  return SYSTEM_TYPES[garden.system_type] || garden.system_type || 'Unknown';
}

function getGardenCategory(garden) {
  if (garden.garden_type_id) {
    const gt = getGardenType(garden.garden_type_id);
    return gt ? gt.category : 'hydroponic';
  }
  return 'hydroponic';
}

const CATEGORY_ICONS = { hydroponic: 'water_drop', soil: 'public', container: 'potted_plant', aquaponics: 'phishing' };
const CATEGORY_COLORS = { hydroponic: 'blue', soil: 'green', container: 'amber', aquaponics: 'purple' };

function renderPage() {
  const main = document.getElementById('main-content');
  switch (state.currentPage) {
    case 'dashboard': renderDashboard(main); break;
    case 'gardens': renderGardensPage(main); break;
    case 'locations': renderLocationsPage(main); break;
    case 'logs': renderLogs(main); break;
    case 'tasks': renderTasks(main); break;
    case 'plants': renderPlants(main); break;
    case 'seeds': renderSeeds(main); break;
    case 'settings': renderSettings(main); break;
    case 'garden-detail': {
      const garden = getSelectedGarden();
      if (garden) renderGardenDetailPage(main, garden);
      else { state.currentPage = 'dashboard'; renderDashboard(main); }
      break;
    }
  }
}

// === Utility ===
function esc(str) {
  if (!str) return '';
  const d = document.createElement('div');
  d.textContent = str;
  return d.innerHTML;
}

function formatDate(iso) {
  if (!iso) return '--';
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function formatDateTime(iso) {
  if (!iso) return '--';
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' });
}

function timeGreeting() {
  const h = new Date().getHours();
  return h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening';
}

function daysAgo(iso) { return Math.floor((Date.now() - new Date(iso).getTime()) / 86400000); }

const SYSTEM_TYPES = {
  dwc: 'Deep Water Culture (DWC)', kratky: 'Kratky', nft: 'NFT (Nutrient Film Technique)',
  ebbAndFlow: 'Ebb & Flow', aeroponics: 'Aeroponics', drip: 'Drip System'
};

const PLANT_TYPES = ['vegetables', 'fruits', 'herbs', 'cannabis', 'flowers', 'other'];
const GROWTH_STAGES = ['seed', 'germination', 'seedling', 'vegetative', 'flowering', 'fruiting', 'harvest'];
const STAGE_COLORS = { seed: 'gray', germination: 'purple', seedling: 'blue', vegetative: 'green', flowering: 'amber', fruiting: 'red', harvest: 'green' };
const PLANT_ICONS = { vegetables: 'nutrition', fruits: 'local_florist', herbs: 'spa', cannabis: 'grass', flowers: 'filter_vintage', other: 'eco' };

// === Tag Select Component ===
function initTagSelect(containerId, items, opts = {}) {
  const container = document.getElementById(containerId);
  if (!container) return { getSelected: () => [] };
  const selected = new Set(opts.selected || []);
  const placeholder = opts.placeholder || 'Type to search...';
  const labelKey = opts.labelKey || 'name';
  const idKey = opts.idKey || 'id';
  const disabledIds = new Set(opts.disabledIds || []);

  function render() {
    const tags = items.filter(it => selected.has(it[idKey]));
    container.innerHTML = `
      <div class="tag-select-tags" id="${containerId}-tags">
        ${tags.map(it => `<span class="tag-select-tag">${esc(it[labelKey])}<button type="button" data-remove="${it[idKey]}" aria-label="Remove ${esc(it[labelKey])}">&times;</button></span>`).join('')}
        <input class="tag-select-input" id="${containerId}-input" placeholder="${selected.size ? '' : esc(placeholder)}" autocomplete="off">
      </div>
      <div class="tag-select-dropdown" id="${containerId}-dropdown" hidden></div>`;

    const input = document.getElementById(`${containerId}-input`);
    const dropdown = document.getElementById(`${containerId}-dropdown`);
    let highlightIdx = -1;

    container.querySelector(`#${containerId}-tags`).addEventListener('click', e => {
      if (e.target.tagName !== 'BUTTON') input.focus();
    });

    container.querySelectorAll('[data-remove]').forEach(btn => {
      btn.addEventListener('click', e => {
        e.stopPropagation();
        selected.delete(btn.dataset.remove);
        render();
      });
    });

    function showDropdown(filter) {
      const available = items.filter(it => !selected.has(it[idKey]) && !disabledIds.has(it[idKey]));
      const filtered = filter ? available.filter(it => it[labelKey].toLowerCase().includes(filter.toLowerCase())) : available;
      if (!filtered.length) {
        dropdown.innerHTML = `<div class="tag-select-empty">${filter ? 'No matches' : 'No items available'}</div>`;
      } else {
        dropdown.innerHTML = filtered.map((it, i) =>
          `<div class="tag-select-option ${i === highlightIdx ? 'highlighted' : ''}" data-id="${it[idKey]}">${esc(it[labelKey])}</div>`
        ).join('');
        dropdown.querySelectorAll('.tag-select-option').forEach(opt => {
          opt.addEventListener('mousedown', e => {
            e.preventDefault();
            selected.add(opt.dataset.id);
            render();
          });
        });
      }
      dropdown.hidden = false;
    }

    input.addEventListener('focus', () => { highlightIdx = -1; showDropdown(input.value); });
    input.addEventListener('input', () => { highlightIdx = -1; showDropdown(input.value); });
    input.addEventListener('blur', () => { setTimeout(() => { dropdown.hidden = true; }, 150); });
    input.addEventListener('keydown', e => {
      const opts = dropdown.querySelectorAll('.tag-select-option');
      if (e.key === 'ArrowDown') { e.preventDefault(); highlightIdx = Math.min(highlightIdx + 1, opts.length - 1); updateHighlight(opts); }
      else if (e.key === 'ArrowUp') { e.preventDefault(); highlightIdx = Math.max(highlightIdx - 1, 0); updateHighlight(opts); }
      else if (e.key === 'Enter' && highlightIdx >= 0 && opts[highlightIdx]) { e.preventDefault(); selected.add(opts[highlightIdx].dataset.id); render(); }
      else if (e.key === 'Backspace' && !input.value && selected.size) { const last = [...selected].pop(); selected.delete(last); render(); }
    });

    function updateHighlight(opts) {
      opts.forEach((o, i) => o.classList.toggle('highlighted', i === highlightIdx));
      if (opts[highlightIdx]) opts[highlightIdx].scrollIntoView({ block: 'nearest' });
    }
  }

  render();
  return { getSelected: () => [...selected] };
}

// === Modal with focus trap ===
let _modalPreviousFocus = null;

function showModal(html) {
  _modalPreviousFocus = document.activeElement;
  const backdrop = document.getElementById('modalBackdrop');
  const modal = document.getElementById('modal');
  modal.innerHTML = html;
  backdrop.hidden = false;

  // Focus trap
  const focusable = modal.querySelectorAll('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])');
  if (focusable.length) focusable[0].focus();

  function trapFocus(e) {
    if (e.key === 'Escape') { closeModal(); return; }
    if (e.key !== 'Tab') return;
    const first = focusable[0], last = focusable[focusable.length - 1];
    if (e.shiftKey) { if (document.activeElement === first) { e.preventDefault(); last.focus(); } }
    else { if (document.activeElement === last) { e.preventDefault(); first.focus(); } }
  }

  modal._trapFocus = trapFocus;
  modal.addEventListener('keydown', trapFocus);
  backdrop.addEventListener('click', e => { if (e.target === backdrop) closeModal(); });
}

function closeModal() {
  const backdrop = document.getElementById('modalBackdrop');
  const modal = document.getElementById('modal');
  backdrop.hidden = true;
  if (modal._trapFocus) { modal.removeEventListener('keydown', modal._trapFocus); delete modal._trapFocus; }
  if (_modalPreviousFocus) { _modalPreviousFocus.focus(); _modalPreviousFocus = null; }
}

// === Drawer (slide-out panel) with focus trap ===
let _drawerPreviousFocus = null;

function showDrawer(html) {
  _drawerPreviousFocus = document.activeElement;
  const backdrop = document.getElementById('drawerBackdrop');
  const drawer = document.getElementById('drawer');
  drawer.innerHTML = html;
  backdrop.hidden = false;
  backdrop.classList.remove('closing');

  // Trigger slide-in on next frame
  requestAnimationFrame(() => { drawer.classList.add('open'); });

  // Focus trap
  const focusable = drawer.querySelectorAll('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])');
  if (focusable.length) focusable[0].focus();

  function trapFocus(e) {
    if (e.key === 'Escape') { closeDrawer(); return; }
    if (e.key !== 'Tab') return;
    const els = drawer.querySelectorAll('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])');
    const first = els[0], last = els[els.length - 1];
    if (e.shiftKey) { if (document.activeElement === first) { e.preventDefault(); last.focus(); } }
    else { if (document.activeElement === last) { e.preventDefault(); first.focus(); } }
  }

  drawer._trapFocus = trapFocus;
  drawer.addEventListener('keydown', trapFocus);

  function onBackdropClick(e) { if (e.target === backdrop) closeDrawer(); }
  backdrop._backdropClick = onBackdropClick;
  backdrop.addEventListener('click', onBackdropClick);
}

function closeDrawer() {
  const backdrop = document.getElementById('drawerBackdrop');
  const drawer = document.getElementById('drawer');

  drawer.classList.remove('open');
  backdrop.classList.add('closing');

  function onDone() {
    drawer.removeEventListener('transitionend', onDone);
    clearTimeout(fallback);
    backdrop.hidden = true;
    backdrop.classList.remove('closing');
    drawer.innerHTML = '';
    if (drawer._trapFocus) { drawer.removeEventListener('keydown', drawer._trapFocus); delete drawer._trapFocus; }
    if (backdrop._backdropClick) { backdrop.removeEventListener('click', backdrop._backdropClick); delete backdrop._backdropClick; }
    if (_drawerPreviousFocus) { _drawerPreviousFocus.focus(); _drawerPreviousFocus = null; }
  }

  drawer.addEventListener('transitionend', onDone, { once: true });
  const fallback = setTimeout(onDone, 350);
}

// ============================================
// === DASHBOARD
// ============================================
async function renderDashboard(main) {
  main.innerHTML = `
    <header class="page-header">
      <div><p class="subtitle">${timeGreeting()}, ${esc(state.user?.display_name || '')}!</p><h1>Dashboard</h1></div>
      <div class="quick-add-wrap">
        <button class="btn btn-primary" type="button" id="dashQuickAdd">+ New <span class="material-symbols-outlined" style="font-size:18px;vertical-align:-3px">expand_more</span></button>
        <div class="quick-add-menu" id="dashQuickAddMenu" hidden>
          <button type="button" data-action="log"><span class="material-symbols-outlined">monitoring</span> Log Entry</button>
          <button type="button" data-action="plant"><span class="material-symbols-outlined">potted_plant</span> Plant</button>
          <button type="button" data-action="garden"><span class="material-symbols-outlined">yard</span> Garden</button>
          <button type="button" data-action="seed"><span class="material-symbols-outlined">grass</span> Seed</button>
          <button type="button" data-action="location"><span class="material-symbols-outlined">location_on</span> Location</button>
        </div>
      </div>
    </header>
    <div id="dashboardContent"><p class="loading-text">Loading...</p></div>
  `;

  // Quick-add dropdown
  const qaBtn = document.getElementById('dashQuickAdd');
  const qaMenu = document.getElementById('dashQuickAddMenu');
  qaBtn.addEventListener('click', () => { qaMenu.hidden = !qaMenu.hidden; });
  document.addEventListener('click', e => { if (!qaBtn.contains(e.target) && !qaMenu.contains(e.target)) qaMenu.hidden = true; }, { once: false });
  qaMenu.addEventListener('click', e => {
    const action = e.target.closest('[data-action]')?.dataset.action;
    if (!action) return;
    qaMenu.hidden = true;
    if (action === 'log') showAddLogModalGlobal();
    else if (action === 'plant') showAddPlantModal();
    else if (action === 'garden') showCreateGardenModal();
    else if (action === 'seed') showAddSeedModal();
    else if (action === 'location') showCreateLocationModal();
  });

  try {
    const [dashStats] = await Promise.all([API.getDashboardStats(), loadGardens()]);
    const container = document.getElementById('dashboardContent');
    if (!container) return;

    // Overview stats
    container.innerHTML = `
      <section aria-label="Overview statistics">
        <div class="grid-4 dash-stats">
          <div class="card stat-card" data-nav="gardens" style="cursor:pointer"><div class="metric-icon green" aria-hidden="true"><span class="material-symbols-outlined">yard</span></div><div><div class="metric-value">${dashStats.total_gardens}</div><div class="metric-label">Gardens</div></div></div>
          <div class="card stat-card" data-nav="plants" style="cursor:pointer"><div class="metric-icon blue" aria-hidden="true"><span class="material-symbols-outlined">potted_plant</span></div><div><div class="metric-value">${dashStats.total_plants}</div><div class="metric-label">Plants</div></div></div>
          <div class="card stat-card" data-nav="tasks" style="cursor:pointer"><div class="metric-icon amber" aria-hidden="true"><span class="material-symbols-outlined">checklist</span></div><div><div class="metric-value">${dashStats.total_active_tasks}</div><div class="metric-label">Active Tasks</div></div></div>
          <div class="card stat-card" data-nav="logs" style="cursor:pointer"><div class="metric-icon blue" aria-hidden="true"><span class="material-symbols-outlined">monitoring</span></div><div><div class="metric-value">${dashStats.total_logs}</div><div class="metric-label">Log Entries</div></div></div>
        </div>
      </section>

      <section aria-label="Gardens" style="margin-top:24px">
        <div class="section-header"><h2 class="section-heading" style="margin:0">My Gardens</h2><a class="link-btn" href="#/gardens">View all</a></div>
        <div id="dashGardenGrid"></div>
      </section>

      <div class="content-split" style="margin-top:24px">
        <section aria-label="Upcoming tasks">
          <h2 class="section-heading">Upcoming Tasks</h2>
          <div id="dashUpcomingTasks"></div>
        </section>
        <section aria-label="Recent activity">
          <h2 class="section-heading">Recent Activity</h2>
          <div id="dashRecentActivity"></div>
        </section>
      </div>
    `;

    // Stat card navigation
    main.querySelectorAll('.stat-card[data-nav]').forEach(card => {
      card.addEventListener('click', () => navigateTo(card.dataset.nav));
    });

    // Garden grid
    const grid = document.getElementById('dashGardenGrid');
    if (!state.gardens.length) {
      grid.innerHTML = `<div class="empty-state"><h3>No gardens yet</h3><p>Create your first garden to start tracking.</p>
        <button class="btn btn-primary" type="button" style="margin-top:16px" id="emptyNewGarden">Create Garden</button></div>`;
      document.getElementById('emptyNewGarden')?.addEventListener('click', showCreateGardenModal);
    } else {
      const displayGardens = state.gardens.slice(0, 6);
      const allStats = await Promise.all(displayGardens.map(g => API.getStats(g.id)));
      grid.innerHTML = `<div class="card" style="padding:0"><table class="dash-garden-table"><tbody>${displayGardens.map((garden, i) => {
        const stats = allStats[i];
        const category = getGardenCategory(garden);
        const catColor = CATEGORY_COLORS[category] || 'green';
        const catIcon = CATEGORY_ICONS[category] || 'eco';
        const iconColor = catColor === 'green' ? 'primary' : catColor === 'blue' ? 'secondary' : catColor === 'orange' ? 'warning' : 'primary';
        return `<tr class="dash-garden-row" data-garden-id="${garden.id}">
          <td class="dgr-name"><span class="material-symbols-outlined" style="color:var(--${iconColor});font-size:20px;vertical-align:middle">${catIcon}</span> ${esc(garden.name)}</td>
          <td class="dgr-badges"><span class="badge badge-${catColor}">${esc(getGardenTypeDisplay(garden))}</span>${garden.location_name ? ` <span class="badge badge-purple">${esc(garden.location_name)}</span>` : ''}</td>
          <td class="dgr-stat">${stats.active_plants} <span class="dgr-label">plants</span></td>
          <td class="dgr-stat">${stats.total_logs} <span class="dgr-label">logs</span></td>
          <td class="dgr-stat">${stats.active_tasks} <span class="dgr-label">tasks</span></td>
        </tr>`;
      }).join('')}</tbody></table></div>`;
      grid.querySelectorAll('.dash-garden-row').forEach(row => {
        row.addEventListener('click', () => viewGardenDetail(row.dataset.gardenId));
      });
    }

    // Upcoming tasks
    const tasksEl = document.getElementById('dashUpcomingTasks');
    if (!dashStats.upcoming_tasks.length) {
      tasksEl.innerHTML = '<p class="empty-text">No upcoming tasks</p>';
    } else {
      tasksEl.innerHTML = `<div class="card" style="padding:0"><div class="task-list-compact">${dashStats.upcoming_tasks.map(t => {
        const isOverdue = new Date(t.due_date) < new Date();
        return `<div class="task-item-compact" data-task-id="${t.id}">
          <span class="priority-dot priority-${t.priority}" aria-label="${t.priority} priority"></span>
          <span class="task-item-title">${esc(t.title)}</span>
          <span class="task-item-garden">${esc(t.garden_name)}</span>
          <span class="task-item-date ${isOverdue ? 'overdue' : ''}">${formatDate(t.due_date)}</span>
        </div>`;
      }).join('')}</div></div>`;
      tasksEl.querySelectorAll('.task-item-compact[data-task-id]').forEach(el => {
        el.addEventListener('click', () => {
          const task = dashStats.upcoming_tasks.find(t => t.id === el.dataset.taskId);
          if (task) showTaskDetailModal(task);
        });
      });
    }

    // Recent activity
    const actEl = document.getElementById('dashRecentActivity');
    if (!dashStats.recent_activity.length) {
      actEl.innerHTML = '<p class="empty-text">No recent activity</p>';
    } else {
      actEl.innerHTML = `<div class="card" style="padding:0"><div class="activity-list">${dashStats.recent_activity.map(a => `
        <div class="activity-item">
          <span class="audit-action audit-action-${a.action}">${esc(a.action)}</span>
          <span class="activity-detail">${esc(a.details || a.entity_type)}</span>
          <span class="activity-time">${formatDateTime(a.created_at)}</span>
        </div>
      `).join('')}</div></div>`;
    }
  } catch (err) {
    const container = document.getElementById('dashboardContent');
    if (container) container.innerHTML = '<p class="empty-text">Failed to load dashboard data.</p>';
  }
}


// ============================================
// === GARDENS PAGE
// ============================================
async function renderGardensPage(main) {
  main.innerHTML = `
    <header class="page-header"><div><h1>Gardens</h1></div>
      <button class="btn btn-primary" type="button" id="gardensNewBtn">+ New Garden</button>
    </header>
    <div id="gardensList"><p class="loading-text">Loading...</p></div>
  `;
  document.getElementById('gardensNewBtn').addEventListener('click', showCreateGardenModal);
  await loadGardens();
  const el = document.getElementById('gardensList');
  if (!state.gardens.length) {
    el.innerHTML = `<div class="empty-state"><h3>No gardens yet</h3><p>Create your first garden to start tracking.</p></div>`;
    return;
  }
  const allStats = await Promise.all(state.gardens.map(g => API.getStats(g.id)));
  el.innerHTML = `<div class="card" style="padding:0">${state.gardens.map((garden, i) => {
    const stats = allStats[i];
    const category = getGardenCategory(garden);
    const catColor = CATEGORY_COLORS[category] || 'green';
    const catIcon = CATEGORY_ICONS[category] || 'eco';
    return `<button class="garden-row" type="button" data-garden-id="${garden.id}">
      <span class="material-symbols-outlined garden-row-icon" style="color:var(--${catColor === 'green' ? 'primary' : catColor === 'blue' ? 'secondary' : catColor === 'orange' ? 'warning' : 'primary'})">${catIcon}</span>
      <span class="garden-row-name">${esc(garden.name)}</span>
      <span class="garden-row-badges">
        <span class="badge badge-${catColor}">${esc(getGardenTypeDisplay(garden))}</span>
        ${garden.location_name ? `<span class="badge badge-purple">${esc(garden.location_name)}</span>` : ''}
      </span>
      <span class="garden-row-metrics">
        <span>${stats.active_plants} Plants</span>
        <span>${stats.total_logs} Logs</span>
        <span>${stats.active_tasks} Tasks</span>
        <span>${daysAgo(garden.start_date)}d</span>
      </span>
    </button>`;
  }).join('')}</div>`;
  el.querySelectorAll('.garden-row').forEach(card => {
    card.addEventListener('click', () => viewGardenDetail(card.dataset.gardenId));
  });
}

function viewGardenDetail(id) {
  state.selectedGardenId = id;
  state._gardenDetailTab = 'plants';
  navigateTo('garden-detail');
}

async function renderGardenDetailPage(main, garden) {
  const tab = state._gardenDetailTab || 'plants';
  const stats = await API.getStats(garden.id);
  const category = getGardenCategory(garden);
  const catColor = CATEGORY_COLORS[category] || 'green';
  const catIcon = CATEGORY_ICONS[category] || 'eco';

  // Build latest reading strip if available
  let latestReadingHtml = '';
  if (stats.latest_log && stats.latest_log.metric_data) {
    const md = stats.latest_log.metric_data;
    const availMetrics = await getAvailableMetrics(garden);
    const pills = availMetrics.map(m => {
      const val = md[m.id] ?? null;
      if (val == null) return '';
      const formatted = typeof val === 'number' && m.decimal_places != null ? val.toFixed(m.decimal_places) : val;
      const inRange = m.ideal_min != null && m.ideal_max != null
        ? (val >= m.ideal_min && val <= m.ideal_max ? 'good' : val >= m.ideal_min * 0.8 && val <= m.ideal_max * 1.2 ? 'warn' : 'bad')
        : '';
      return `<div class="reading-pill"><span class="health-dot ${inRange ? 'health-' + inRange : ''}"></span><span class="reading-val">${formatted}</span>${m.unit_metric ? `<span class="reading-unit">${esc(m.unit_metric)}</span>` : ''}<span class="reading-name">${esc(m.name)}</span></div>`;
    }).filter(Boolean).join('');
    if (pills) {
      latestReadingHtml = `<div class="garden-latest-reading">
        <span class="reading-label">Latest Reading</span>
        <div class="reading-pills">${pills}</div>
        <span class="reading-time">${formatDateTime(stats.latest_log.timestamp)}</span>
      </div>`;
    }
  }

  main.innerHTML = `
    <p class="subtitle" style="margin-bottom:8px"><button class="link-btn" type="button" id="backToGardens">Gardens</button> / ${esc(garden.name)}</p>
    <div class="card garden-hero border-${catColor}">
      <div class="garden-hero-icon metric-icon ${catColor}"><span class="material-symbols-outlined">${catIcon}</span></div>
      <div class="garden-hero-info">
        <h1>${esc(garden.name)}</h1>
        <div class="garden-hero-badges">
          <span class="badge badge-${catColor}"><span class="material-symbols-outlined badge-icon">${catIcon}</span> ${esc(getGardenTypeDisplay(garden))}</span>
          ${garden.location_name ? `<span class="badge badge-purple">${esc(garden.location_name)}</span>` : ''}
        </div>
        <div class="garden-hero-subtitle">
          <span>Started ${formatDate(garden.start_date)}</span>
          ${garden.location_name ? `<span><span class="material-symbols-outlined" style="font-size:14px;vertical-align:-2px">location_on</span> ${esc(garden.location_name)}</span>` : ''}
        </div>
      </div>
      <div class="garden-hero-actions">
        <button class="btn btn-secondary btn-sm" type="button" id="editGardenBtn" aria-label="Edit garden">Edit</button>
        <button class="btn btn-danger btn-sm" type="button" id="deleteGardenBtn" aria-label="Delete garden">Delete</button>
      </div>
    </div>
    <div class="garden-stat-strip">
      <div class="garden-stat-card"><div class="metric-icon green"><span class="material-symbols-outlined">potted_plant</span></div><div><div class="metric-value">${stats.active_plants}</div><div class="metric-label">Plants</div></div></div>
      <div class="garden-stat-card"><div class="metric-icon blue"><span class="material-symbols-outlined">monitoring</span></div><div><div class="metric-value">${stats.total_logs}</div><div class="metric-label">Logs</div></div></div>
      <div class="garden-stat-card"><div class="metric-icon amber"><span class="material-symbols-outlined">checklist</span></div><div><div class="metric-value">${stats.active_tasks}</div><div class="metric-label">Tasks</div></div></div>
      <div class="garden-stat-card"><div class="metric-icon green"><span class="material-symbols-outlined">calendar_today</span></div><div><div class="metric-value">${daysAgo(garden.start_date)}d</div><div class="metric-label">Age</div></div></div>
    </div>
    ${latestReadingHtml}
    <div class="tabs" style="max-width:400px" role="tablist">
      <button class="tab ${tab === 'plants' ? 'active' : ''}" role="tab" aria-selected="${tab === 'plants'}" data-tab="plants" type="button">Plants</button>
      <button class="tab ${tab === 'logs' ? 'active' : ''}" role="tab" aria-selected="${tab === 'logs'}" data-tab="logs" type="button">Logs</button>
      <button class="tab ${tab === 'tasks' ? 'active' : ''}" role="tab" aria-selected="${tab === 'tasks'}" data-tab="tasks" type="button">Tasks</button>
    </div>
    <div id="gardenDetailContent" role="tabpanel"></div>
  `;

  document.getElementById('backToGardens').addEventListener('click', () => navigateTo('gardens'));
  document.getElementById('editGardenBtn').addEventListener('click', () => showEditGardenModal(garden));
  document.getElementById('deleteGardenBtn').addEventListener('click', () => deleteGarden(garden.id));

  main.querySelectorAll('.tabs .tab').forEach(tabBtn => {
    tabBtn.addEventListener('click', () => {
      state._gardenDetailTab = tabBtn.dataset.tab;
      main.querySelectorAll('.tabs .tab').forEach(t => { t.classList.remove('active'); t.setAttribute('aria-selected', 'false'); });
      tabBtn.classList.add('active');
      tabBtn.setAttribute('aria-selected', 'true');
      renderGardenDetailTab(garden, tabBtn.dataset.tab);
    });
  });

  await renderGardenDetailTab(garden, tab);
}

async function renderGardenDetailTab(garden, tab) {
  const container = document.getElementById('gardenDetailContent');
  if (!container) return;

  if (tab === 'plants') {
    const plants = await API.getPlants(garden.id);
    window._plants = plants;
    const active = plants.filter(p => p.is_active);
    container.innerHTML = `
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px">
        <span class="secondary-text">${active.length} active plant${active.length !== 1 ? 's' : ''}</span>
        <button class="btn btn-primary" type="button" id="addPlantBtn">+ Add Plant</button>
      </div>
      <div id="gardenPlantsList"></div>
    `;
    document.getElementById('addPlantBtn').addEventListener('click', () => showAddPlantModal(garden.id));
    renderPlantsGrid(active, document.getElementById('gardenPlantsList'));
  } else if (tab === 'logs') {
    container.innerHTML = `
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;flex-wrap:wrap;gap:8px">
        <div></div>
        <div style="display:flex;gap:8px">
          <button class="btn btn-secondary btn-sm" type="button" id="exportLogsBtn">Export CSV</button>
          <button class="btn btn-primary" type="button" id="addLogBtn">+ Add Log</button>
        </div>
      </div>
      <div class="content-split"><div>
        <div class="metric-tabs" role="tablist" aria-label="Metric selector" id="metricTabs"></div>
        <div class="card"><div class="chart-container"><canvas id="logsChart"></canvas></div></div></div>
        <div><div class="card" style="padding:0">
          <div style="padding:16px 20px;border-bottom:1px solid var(--border);display:flex;justify-content:space-between;align-items:center"><h3>Recent Logs</h3><span id="logCount" class="secondary-text"></span></div>
          <div id="logsList" style="padding:0 20px;max-height:400px;overflow-y:auto"></div></div></div></div>`;

    document.getElementById('addLogBtn').addEventListener('click', () => showAddLogModal(garden));
    document.getElementById('exportLogsBtn').addEventListener('click', () => API.exportLogs(garden.id));

    const logs = await API.getLogs(garden.id);
    document.getElementById('logCount').textContent = `${logs.length} entries`;

    // Build metric tabs from garden type
    const availableMetrics = await getAvailableMetrics(garden);
    const tabsEl = document.getElementById('metricTabs');
    const defaultMetric = availableMetrics[0]?.id || 'ph';
    tabsEl.innerHTML = availableMetrics.slice(0, 6).map((m, i) => `<button class="metric-tab ${i === 0 ? 'active' : ''}" role="tab" data-metric="${m.id}" type="button">${esc(m.name)}</button>`).join('');
    tabsEl.querySelectorAll('.metric-tab').forEach(btn => {
      btn.addEventListener('click', () => {
        tabsEl.querySelectorAll('.metric-tab').forEach(t => t.classList.remove('active'));
        btn.classList.add('active');
        renderLogsChart(logs, btn.dataset.metric, availableMetrics);
      });
    });

    renderLogsChart(logs, defaultMetric, availableMetrics);
    renderLogsList(logs, availableMetrics);
  } else if (tab === 'tasks') {
    container.innerHTML = `
      <div style="display:flex;justify-content:flex-end;margin-bottom:16px">
        <button class="btn btn-primary" type="button" id="addTaskBtn">+ Add Task</button>
      </div>
      <div class="tabs" style="max-width:300px" role="tablist">
        <button class="tab active" role="tab" data-tab="active" type="button">Active</button>
        <button class="tab" role="tab" data-tab="completed" type="button">Completed</button>
      </div>
      <div id="tasksList"></div>`;
    document.getElementById('addTaskBtn').addEventListener('click', () => showAddTaskModal(garden.id));
    container.querySelectorAll('.tabs .tab').forEach(btn => {
      btn.addEventListener('click', () => {
        container.querySelectorAll('.tabs .tab').forEach(t => t.classList.remove('active'));
        btn.classList.add('active');
        renderTasksList(window._tasks, btn.dataset.tab);
      });
    });
    const tasks = await API.getTasks(garden.id);
    window._tasks = tasks;
    renderTasksList(tasks, 'active');
  }
}

async function getAvailableMetrics(garden) {
  if (garden.garden_type_id) {
    try {
      return await API.getGardenTypeMetrics(garden.garden_type_id);
    } catch { /* fall through */ }
  }
  // Default hydroponic metrics
  return [
    { id: 'ph', name: 'pH', unit_metric: '', unit_imperial: '', ideal_min: 5.5, ideal_max: 6.5 },
    { id: 'ppm', name: 'PPM', unit_metric: 'ppm', unit_imperial: 'ppm', ideal_min: 800, ideal_max: 1500 },
    { id: 'water_temp', name: 'Water Temp', unit_metric: '°C', unit_imperial: '°F', ideal_min: 18, ideal_max: 24 },
  ];
}

function renderLocationField(selectedId) {
  return `<div class="form-group"><label for="gf-location">Location</label>
    <div style="display:flex;gap:8px;align-items:start">
      <select class="form-input" id="gf-location" name="location_id" style="flex:1">
        <option value="">None</option>
        ${state.locations.map(l => `<option value="${l.id}" ${selectedId === l.id ? 'selected' : ''}>${esc(l.name)}</option>`).join('')}
        <option value="__new__">+ Create New Location</option>
      </select>
    </div>
    <div id="newLocationInline" hidden style="margin-top:8px">
      <div style="display:flex;gap:8px;align-items:center">
        <input class="form-input" id="newLocName" placeholder="Location name" style="flex:1">
        <button type="button" class="btn btn-primary btn-sm" id="createLocInlineBtn">Add</button>
        <button type="button" class="btn btn-secondary btn-sm" id="cancelLocInlineBtn">Cancel</button>
      </div>
    </div>
  </div>`;
}

function setupLocationField() {
  const select = document.getElementById('gf-location');
  const inline = document.getElementById('newLocationInline');
  if (!select || !inline) return;

  select.addEventListener('change', () => {
    if (select.value === '__new__') {
      inline.hidden = false;
      document.getElementById('newLocName').focus();
    } else {
      inline.hidden = true;
    }
  });

  document.getElementById('cancelLocInlineBtn').addEventListener('click', () => {
    inline.hidden = true;
    select.value = '';
  });

  document.getElementById('createLocInlineBtn').addEventListener('click', async () => {
    const name = document.getElementById('newLocName').value.trim();
    if (!name) { document.getElementById('newLocName').focus(); return; }
    try {
      const result = await API.createLocation({ name, description: null, sort_order: 0 });
      state.locations = await API.getLocations().catch(() => state.locations);
      // Add new option and select it
      const opt = document.createElement('option');
      opt.value = result.id;
      opt.textContent = name;
      select.insertBefore(opt, select.querySelector('[value="__new__"]'));
      select.value = result.id;
      inline.hidden = true;
      document.getElementById('newLocName').value = '';
      toast('Location created');
    } catch {
      toast('Failed to create location', 'error');
    }
  });
}

function showCreateGardenModal() {
  const enabledTypes = state.gardenTypes.filter(t => t.is_enabled);
  const categories = {};
  for (const t of enabledTypes) {
    if (!categories[t.category]) categories[t.category] = [];
    categories[t.category].push(t);
  }
  const catNames = { hydroponic: 'Hydroponic', soil: 'Soil', container: 'Container', aquaponics: 'Aquaponics' };

  showModal(`
    <h2 id="modalTitle">Create New Garden</h2>
    <form id="gardenForm">
      <div class="form-group"><label for="gf-name">Garden Name <span class="required" aria-hidden="true">*</span></label>
        <input class="form-input" id="gf-name" name="name" placeholder="My Garden" required aria-required="true"></div>
      <div class="form-group"><label for="gf-type">Garden Type <span class="required" aria-hidden="true">*</span></label>
        <select class="form-input" id="gf-type" name="garden_type_id" required aria-required="true">
          ${Object.entries(categories).map(([cat, items]) => `
            <optgroup label="${catNames[cat] || cat}">
              ${items.map(t => `<option value="${t.id}">${esc(t.display_name)}</option>`).join('')}
            </optgroup>
          `).join('')}
          ${!enabledTypes.length ? Object.entries(SYSTEM_TYPES).map(([k, v]) => `<option value="${k}">${v}</option>`).join('') : ''}
        </select></div>
      ${renderLocationField(null)}
      <div class="form-group"><label>Plant Types</label>
        <div class="checkbox-group">${PLANT_TYPES.map(t => `<label class="checkbox-label"><input type="checkbox" name="plant_types" value="${t}"> ${t.charAt(0).toUpperCase() + t.slice(1)}</label>`).join('')}</div></div>
      <div class="modal-actions">
        <button type="button" class="btn btn-secondary" id="cancelGarden">Cancel</button>
        <button type="submit" class="btn btn-primary">Create</button></div>
    </form>
  `);
  setupLocationField();
  document.getElementById('cancelGarden').addEventListener('click', closeModal);
  document.getElementById('gardenForm').addEventListener('submit', async e => {
    e.preventDefault();
    const fd = new FormData(e.target);
    const plant_types = fd.getAll('plant_types');
    if (!plant_types.length) plant_types.push('other');
    const gardenTypeId = fd.get('garden_type_id');
    const locationId = fd.get('location_id');
    await API.createGarden({ name: fd.get('name'), garden_type_id: gardenTypeId, system_type: gardenTypeId, plant_types, start_date: new Date().toISOString(), location_id: locationId && locationId !== '__new__' ? locationId : null });
    closeModal();
    toast('Garden created');
    await loadGardens();
    renderPage();
  });
}

function showEditGardenModal(garden) {
  const enabledTypes = state.gardenTypes.filter(t => t.is_enabled);
  const categories = {};
  for (const t of enabledTypes) {
    if (!categories[t.category]) categories[t.category] = [];
    categories[t.category].push(t);
  }
  const catNames = { hydroponic: 'Hydroponic', soil: 'Soil', container: 'Container', aquaponics: 'Aquaponics' };
  const plantTypes = garden.plant_types || [];

  showModal(`
    <h2 id="modalTitle">Edit Garden</h2>
    <form id="gardenForm">
      <div class="form-group"><label for="gf-name">Garden Name <span class="required" aria-hidden="true">*</span></label>
        <input class="form-input" id="gf-name" name="name" value="${esc(garden.name)}" required aria-required="true"></div>
      <div class="form-group"><label for="gf-type">Garden Type</label>
        <select class="form-input" id="gf-type" name="garden_type_id">
          ${Object.entries(categories).map(([cat, items]) => `
            <optgroup label="${catNames[cat] || cat}">
              ${items.map(t => `<option value="${t.id}" ${garden.garden_type_id === t.id ? 'selected' : ''}>${esc(t.display_name)}</option>`).join('')}
            </optgroup>
          `).join('')}
        </select></div>
      ${renderLocationField(garden.location_id)}
      <div class="form-group"><label>Plant Types</label>
        <div class="checkbox-group">${PLANT_TYPES.map(t => `<label class="checkbox-label"><input type="checkbox" name="plant_types" value="${t}" ${plantTypes.includes(t) ? 'checked' : ''}> ${t.charAt(0).toUpperCase() + t.slice(1)}</label>`).join('')}</div></div>
      <div class="form-group"><label class="checkbox-label"><input type="checkbox" name="is_active" ${garden.is_active ? 'checked' : ''}> Active</label></div>
      <div class="modal-actions">
        <button type="button" class="btn btn-secondary" id="cancelEdit">Cancel</button>
        <button type="submit" class="btn btn-primary">Save Changes</button></div>
    </form>
  `);
  setupLocationField();
  document.getElementById('cancelEdit').addEventListener('click', closeModal);
  document.getElementById('gardenForm').addEventListener('submit', async e => {
    e.preventDefault();
    const fd = new FormData(e.target);
    const plant_types = fd.getAll('plant_types');
    if (!plant_types.length) plant_types.push('other');
    const locationId = fd.get('location_id');
    await API.updateGarden(garden.id, {
      name: fd.get('name'),
      garden_type_id: fd.get('garden_type_id'),
      system_type: fd.get('garden_type_id') || garden.system_type,
      plant_types,
      is_active: !!fd.get('is_active'),
      location_id: locationId && locationId !== '__new__' ? locationId : null,
    });
    closeModal();
    toast('Garden updated');
    await loadGardens();
    renderPage();
  });
}

async function deleteGarden(id) {
  // Get impact count
  const stats = await API.getStats(id);
  const msg = `Delete this garden? This will also delete ${stats.active_plants} plant(s), ${stats.total_logs} log(s), and ${stats.active_tasks} task(s). This cannot be undone.`;
  if (!confirm(msg)) return;
  await API.deleteGarden(id);
  if (state.selectedGardenId === id) state.selectedGardenId = null;
  toast('Garden deleted');
  await loadGardens();
  renderPage();
}

// ============================================
// === LOCATIONS
// ============================================
async function renderLocationsPage(main) {
  main.innerHTML = `
    <header class="page-header"><div><h1>Locations</h1></div>
      <button class="btn btn-primary" type="button" id="addLocationBtn">+ Add Location</button>
    </header>
    <div id="locationsList"><p class="loading-text">Loading...</p></div>
  `;
  document.getElementById('addLocationBtn').addEventListener('click', () => showCreateLocationModal(true));
  try {
    state.locations = await API.getLocations();
  } catch { /* use cached */ }
  const el = document.getElementById('locationsList');
  if (!state.locations.length) {
    el.innerHTML = `<div class="empty-state"><h3>No locations yet</h3><p>Add a location to organize your gardens.</p></div>`;
    return;
  }
  el.innerHTML = `<div class="card" style="padding:0">${state.locations.map(loc => `
    <button class="garden-row" type="button" data-location-id="${loc.id}">
      <span class="material-symbols-outlined garden-row-icon" style="color:var(--secondary)">location_on</span>
      <span class="garden-row-name">${esc(loc.name)}</span>
      <span class="garden-row-badges">
        <span class="badge badge-blue">${loc.garden_count} garden${loc.garden_count !== 1 ? 's' : ''}</span>
      </span>
      <span class="garden-row-metrics">
        ${loc.description ? `<span>${esc(loc.description)}</span>` : ''}
      </span>
    </button>
  `).join('')}</div>`;
  el.querySelectorAll('[data-location-id]').forEach(card => {
    card.addEventListener('click', () => showLocationDetail(card.dataset.locationId));
  });
}

async function showLocationDetail(locationId) {
  const loc = state.locations.find(l => l.id === locationId);
  if (!loc) return;

  showDrawer(`
    <div class="drawer-header">
      <h2 id="drawerTitle">${esc(loc.name)}</h2>
      <button class="drawer-close" id="closeDrawerBtn" type="button" aria-label="Close"><span class="material-symbols-outlined" aria-hidden="true">close</span></button>
    </div>
    <div class="drawer-body">
      ${loc.description ? `<p class="secondary-text" style="margin-bottom:16px">${esc(loc.description)}</p>` : ''}
      <div class="detail-grid" style="margin-bottom:20px">
        <div><div class="detail-label">Gardens</div><div class="detail-value">${loc.garden_count}</div></div>
        <div><div class="detail-label">Sort Order</div><div class="detail-value">${loc.sort_order || 0}</div></div>
      </div>
      <h3 class="section-heading" style="margin-top:0">Gardens at this location</h3>
      <div id="drawerLocationGardens"><p class="loading-text">Loading...</p></div>
    </div>
    <div class="drawer-actions">
      <button class="btn btn-danger btn-sm" type="button" id="deleteLocationBtn">Delete</button>
      <button class="btn btn-secondary" type="button" id="editLocationBtn">Edit</button>
    </div>`);

  document.getElementById('closeDrawerBtn').addEventListener('click', closeDrawer);
  document.getElementById('deleteLocationBtn').addEventListener('click', async () => {
    if (!confirm('Delete this location? Gardens at this location will keep their data but lose the location assignment.')) return;
    await API.deleteLocation(loc.id);
    closeDrawer();
    toast('Location deleted');
    state.locations = await API.getLocations().catch(() => state.locations);
    renderPage();
  });
  document.getElementById('editLocationBtn').addEventListener('click', () => {
    closeDrawer();
    showEditLocationModal(loc);
  });

  // Load gardens asynchronously into the drawer
  try {
    const gardens = await API.getLocationGardens(locationId);
    const el = document.getElementById('drawerLocationGardens');
    if (!el) return; // drawer was closed
    if (!gardens.length) {
      el.innerHTML = '<p class="empty-text">No gardens at this location.</p>';
      return;
    }
    const allStats = await Promise.all(gardens.map(g => API.getStats(g.id)));
    el.innerHTML = `<div style="display:flex;flex-direction:column;gap:12px">${gardens.map((garden, i) => {
      const stats = allStats[i];
      const category = getGardenCategory(garden);
      const catColor = CATEGORY_COLORS[category] || 'green';
      const catIcon = CATEGORY_ICONS[category] || 'eco';
      return `<button class="card garden-card" type="button" data-garden-id="${garden.id}" style="padding:16px">
        <div class="garden-card-header">
          <h3>${esc(garden.name)}</h3>
          <span class="badge badge-${catColor}"><span class="material-symbols-outlined badge-icon">${catIcon}</span> ${esc(getGardenTypeDisplay(garden))}</span>
        </div>
        <div class="grid-4">
          <div class="metric-card"><div class="metric-value">${stats.active_plants}</div><div class="metric-label">Plants</div></div>
          <div class="metric-card"><div class="metric-value">${stats.total_logs}</div><div class="metric-label">Logs</div></div>
          <div class="metric-card"><div class="metric-value">${stats.active_tasks}</div><div class="metric-label">Tasks</div></div>
          <div class="metric-card"><div class="metric-value">${daysAgo(garden.start_date)}d</div><div class="metric-label">Age</div></div>
        </div>
      </button>`;
    }).join('')}</div>`;
    el.querySelectorAll('.garden-card').forEach(card => {
      card.addEventListener('click', () => { closeDrawer(); viewGardenDetail(card.dataset.gardenId); });
    });
  } catch {
    const el = document.getElementById('drawerLocationGardens');
    if (el) el.innerHTML = '<p class="empty-text">Failed to load gardens.</p>';
  }
}

// ============================================
// === LOGS
// ============================================
async function renderLogs(main) {
  if (!state.gardens.length) {
    main.innerHTML = '<div class="empty-state"><h3>No gardens yet</h3><p>Create a garden from the Dashboard first.</p></div>';
    return;
  }
  const selectedId = state.selectedGardenId || state.gardens[0].id;
  const garden = state.gardens.find(g => g.id === selectedId) || state.gardens[0];
  const category = getGardenCategory(garden);
  const catColor = CATEGORY_COLORS[category] || 'green';
  const catIcon = CATEGORY_ICONS[category] || 'eco';
  const iconColor = catColor === 'green' ? 'primary' : catColor === 'blue' ? 'secondary' : catColor === 'orange' ? 'warning' : 'primary';

  // Default date range: last 30 days
  const today = new Date().toISOString().split('T')[0];
  const thirtyAgo = new Date(Date.now() - 30 * 86400000).toISOString().split('T')[0];
  const dateFrom = state._logsDateFrom || thirtyAgo;
  const dateTo = state._logsDateTo || today;

  main.innerHTML = `
    <header class="page-header">
      <div><h1>Logs</h1></div>
      <div style="display:flex;gap:8px;align-items:center">
        <button class="btn btn-secondary btn-sm" type="button" id="exportLogsBtn">Export CSV</button>
        <button class="btn btn-primary" type="button" id="addLogBtn">+ Add Log</button>
      </div>
    </header>

    <div class="card logs-garden-header">
      <div class="logs-garden-info">
        <span class="material-symbols-outlined" style="font-size:28px;color:var(--${iconColor})">${catIcon}</span>
        <div>
          <select class="logs-garden-select" id="logsGardenSelect" aria-label="Select garden">
            ${state.gardens.map(g => `<option value="${g.id}" ${g.id === garden.id ? 'selected' : ''}>${esc(g.name)}</option>`).join('')}
          </select>
          <div class="logs-garden-meta">
            <span class="badge badge-${catColor}">${esc(getGardenTypeDisplay(garden))}</span>
            ${garden.location_name ? `<span class="badge badge-purple">${esc(garden.location_name)}</span>` : ''}
            <span class="secondary-text">${daysAgo(garden.start_date)} days old</span>
          </div>
        </div>
      </div>
      <div class="logs-date-range">
        <label class="logs-date-label">From</label>
        <input type="date" class="form-input" id="logsDateFrom" value="${dateFrom}" style="width:auto">
        <label class="logs-date-label">To</label>
        <input type="date" class="form-input" id="logsDateTo" value="${dateTo}" style="width:auto">
        <div class="logs-range-presets">
          <button class="btn btn-secondary btn-sm" type="button" data-range="7">7d</button>
          <button class="btn btn-secondary btn-sm" type="button" data-range="30">30d</button>
          <button class="btn btn-secondary btn-sm" type="button" data-range="90">90d</button>
          <button class="btn btn-secondary btn-sm" type="button" data-range="all">All</button>
        </div>
      </div>
    </div>

    <div id="logsContent"><p class="loading-text">Loading...</p></div>
  `;

  document.getElementById('logsGardenSelect').addEventListener('change', e => {
    state.selectedGardenId = e.target.value;
    state._logsDateFrom = document.getElementById('logsDateFrom').value;
    state._logsDateTo = document.getElementById('logsDateTo').value;
    renderLogs(main);
  });

  function reloadWithDates() {
    state._logsDateFrom = document.getElementById('logsDateFrom').value;
    state._logsDateTo = document.getElementById('logsDateTo').value;
    loadLogsForGarden(garden);
  }
  document.getElementById('logsDateFrom').addEventListener('change', reloadWithDates);
  document.getElementById('logsDateTo').addEventListener('change', reloadWithDates);

  document.querySelectorAll('[data-range]').forEach(btn => {
    btn.addEventListener('click', () => {
      const range = btn.dataset.range;
      const toDate = new Date().toISOString().split('T')[0];
      let fromDate;
      if (range === 'all') { fromDate = garden.start_date.split('T')[0]; }
      else { fromDate = new Date(Date.now() - parseInt(range) * 86400000).toISOString().split('T')[0]; }
      document.getElementById('logsDateFrom').value = fromDate;
      document.getElementById('logsDateTo').value = toDate;
      reloadWithDates();
    });
  });

  async function loadLogsForGarden(g) {
    document.getElementById('addLogBtn').addEventListener('click', () => showAddLogModal(g));
    document.getElementById('exportLogsBtn').addEventListener('click', () => API.exportLogs(g.id));

    const container = document.getElementById('logsContent');
    const from = document.getElementById('logsDateFrom').value;
    const to = document.getElementById('logsDateTo').value;
    const logs = await API.getLogs(g.id, { from, to });
    const availableMetrics = await getAvailableMetrics(g);

    container.innerHTML = `
      <div class="metric-tabs" role="tablist" aria-label="Metric selector" id="metricTabs"></div>
      <div class="card" style="margin-bottom:24px"><div class="chart-container"><canvas id="logsChart"></canvas></div></div>
      <div class="card" style="padding:0">
        <div style="padding:16px 20px;border-bottom:1px solid var(--border);display:flex;justify-content:space-between;align-items:center"><h3>Log Entries</h3><span id="logCount" class="secondary-text">${logs.length} entries</span></div>
        <div id="logsList" style="padding:0 20px;max-height:500px;overflow-y:auto"></div>
      </div>`;

    const tabsEl = document.getElementById('metricTabs');
    const defaultMetric = availableMetrics[0]?.id || 'ph';
    tabsEl.innerHTML = availableMetrics.slice(0, 6).map((m, i) => `<button class="metric-tab ${i === 0 ? 'active' : ''}" role="tab" data-metric="${m.id}" type="button">${esc(m.name)}</button>`).join('');
    tabsEl.querySelectorAll('.metric-tab').forEach(btn => {
      btn.addEventListener('click', () => {
        tabsEl.querySelectorAll('.metric-tab').forEach(t => t.classList.remove('active'));
        btn.classList.add('active');
        renderLogsChart(logs, btn.dataset.metric, availableMetrics);
      });
    });

    renderLogsChart(logs, defaultMetric, availableMetrics);
    renderLogsList(logs, availableMetrics);
  }

  try { await loadLogsForGarden(garden); } catch {
    const c = document.getElementById('logsContent');
    if (c) c.innerHTML = '<p class="empty-text">Failed to load logs.</p>';
  }
}

function renderLogsChart(logs, metric, availableMetrics) {
  const canvas = document.getElementById('logsChart');
  if (!canvas) return;
  if (state.logsChart) { state.logsChart.destroy(); state.logsChart = null; }

  const metricDef = availableMetrics?.find(m => m.id === metric);
  const valid = logs.filter(l => {
    const md = l.metric_data || {};
    return md[metric] != null || (metric === 'ph' && l.ph != null) || (metric === 'ppm' && l.ppm != null) || (metric === 'water_temp' && l.water_temp != null);
  }).reverse();

  const getData = l => {
    const md = l.metric_data || {};
    if (md[metric] != null) return md[metric];
    if (metric === 'ph') return l.ph;
    if (metric === 'ppm') return l.ppm;
    if (metric === 'water_temp') return l.water_temp;
    return null;
  };

  const colors = { ph: '#0ea5e9', ppm: '#10b981', water_temp: '#f59e0b' };
  const color = colors[metric] || '#8b5cf6';

  const datasets = [{ label: metricDef?.name || metric, data: valid.map(getData), borderColor: color, backgroundColor: color + '18', fill: true, tension: 0.3, pointRadius: 4, pointBackgroundColor: color }];

  // Add ideal range band if available
  const annotations = {};
  if (metricDef?.ideal_min != null && metricDef?.ideal_max != null) {
    annotations.idealRange = {
      type: 'box', yMin: metricDef.ideal_min, yMax: metricDef.ideal_max,
      backgroundColor: 'rgba(16, 185, 129, 0.08)', borderColor: 'rgba(16, 185, 129, 0.3)', borderWidth: 1
    };
  }

  state.logsChart = new Chart(canvas, {
    type: 'line',
    data: { labels: valid.map(l => new Date(l.timestamp).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })), datasets },
    options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } },
      scales: { x: { grid: { display: false } }, y: { grid: { color: 'rgba(0,0,0,0.05)' } } } }
  });
}

function renderLogsList(logs, availableMetrics) {
  const el = document.getElementById('logsList');
  if (!logs.length) { el.innerHTML = '<div class="empty-state" style="padding:40px"><h3>No logs yet</h3><p>Add your first log entry.</p></div>'; return; }

  const displayMetrics = (availableMetrics || []).slice(0, 3);
  el.innerHTML = logs.slice(0, 30).map(log => {
    const md = log.metric_data || {};
    const metricValues = displayMetrics.map(m => {
      const val = md[m.id] ?? (m.id === 'ph' ? log.ph : m.id === 'ppm' ? log.ppm : m.id === 'water_temp' ? log.water_temp : null);
      const formatted = val != null ? (typeof val === 'number' && m.decimal_places != null ? val.toFixed(m.decimal_places) : val) : '--';
      const inRange = val != null && m.ideal_min != null && m.ideal_max != null ? (val >= m.ideal_min && val <= m.ideal_max ? 'good' : val >= m.ideal_min * 0.8 && val <= m.ideal_max * 1.2 ? 'warn' : 'bad') : '';
      return `<div class="log-item-value ${inRange ? 'health-' + inRange : ''}"><div class="val">${formatted}${m.unit_metric && val != null ? m.unit_metric : ''}</div><div class="label">${esc(m.name)}</div></div>`;
    }).join('');
    return `<div class="log-item">
      <div class="log-item-date">${formatDateTime(log.timestamp)}</div>
      ${metricValues}
      <button class="btn-icon btn-sm" type="button" data-log-id="${log.id}" aria-label="Delete log entry" title="Delete">&#x1F5D1;</button>
    </div>`;
  }).join('');

  el.querySelectorAll('[data-log-id]').forEach(btn => {
    btn.addEventListener('click', async () => {
      if (!confirm('Delete this log entry?')) return;
      await API.deleteLog(btn.dataset.logId);
      toast('Log entry deleted');
      renderPage();
    });
  });
}

function showAddLogModalGlobal() {
  if (!state.gardens.length) { toast('Create a garden first', 'error'); return; }
  if (state.gardens.length === 1) { showAddLogModal(state.gardens[0]); return; }
  showModal(`<h2 id="modalTitle">Select Garden</h2>
    <div class="form-group"><label for="logGardenPicker">Which garden is this log for?</label>
      <select class="form-input" id="logGardenPicker">${state.gardens.map(g => `<option value="${g.id}">${esc(g.name)}</option>`).join('')}</select>
    </div>
    <div class="modal-actions"><button type="button" class="btn btn-secondary" id="cancelLogPicker">Cancel</button><button type="button" class="btn btn-primary" id="confirmLogPicker">Continue</button></div>`);
  document.getElementById('cancelLogPicker').addEventListener('click', closeModal);
  document.getElementById('confirmLogPicker').addEventListener('click', () => {
    const garden = state.gardens.find(g => g.id === document.getElementById('logGardenPicker').value);
    closeModal();
    if (garden) showAddLogModal(garden);
  });
}

async function showAddLogModal(garden) {
  if (!garden) garden = getSelectedGarden();
  if (!garden) return;
  const availableMetrics = await getAvailableMetrics(garden);

  const fieldsHtml = availableMetrics.map(m => {
    const hint = m.ideal_min != null && m.ideal_max != null ? `Ideal: ${m.ideal_min}-${m.ideal_max}${m.unit_metric ? ' ' + m.unit_metric : ''}` : '';
    if (m.data_type === 'text') {
      return `<div class="form-group"><label for="log-${m.id}">${esc(m.name)}${m.is_required ? ' <span class="required" aria-hidden="true">*</span>' : ''}</label>
        <input class="form-input" id="log-${m.id}" name="${m.id}" placeholder="${esc(m.name)}" ${m.is_required ? 'required aria-required="true"' : ''}>
        ${hint ? `<div class="form-hint">${hint}</div>` : ''}</div>`;
    }
    return `<div class="form-group"><label for="log-${m.id}">${esc(m.name)}${m.is_required ? ' <span class="required" aria-hidden="true">*</span>' : ''}</label>
      <input class="form-input" id="log-${m.id}" name="${m.id}" type="number" step="${m.decimal_places > 0 ? '0.' + '0'.repeat(m.decimal_places - 1) + '1' : '1'}" ${m.min_value != null ? `min="${m.min_value}"` : ''} ${m.max_value != null ? `max="${m.max_value}"` : ''} ${m.is_required ? 'required aria-required="true"' : ''}>
      ${hint ? `<div class="form-hint">${hint}</div>` : ''}</div>`;
  });

  // Show 2 columns for fields
  const half = Math.ceil(fieldsHtml.length / 2);
  const col1 = fieldsHtml.slice(0, half).join('');
  const col2 = fieldsHtml.slice(half).join('');

  showModal(`<h2 id="modalTitle">Add Log Entry</h2><form id="logForm">
    <div class="form-row">${col1 ? `<div>${col1}</div>` : ''}${col2 ? `<div>${col2}</div>` : ''}</div>
    <div class="form-group"><label for="log-nutrients">Nutrients</label><input class="form-input" id="log-nutrients" name="nutrients" placeholder="e.g., General Hydroponics Flora series"></div>
    <div class="form-group"><label for="log-notes">Notes</label><textarea class="form-input" id="log-notes" name="notes" rows="2" placeholder="Any observations..."></textarea></div>
    <div class="modal-actions"><button type="button" class="btn btn-secondary" id="cancelLog">Cancel</button><button type="submit" class="btn btn-primary">Save Log</button></div></form>`);
  document.getElementById('cancelLog').addEventListener('click', closeModal);
  document.getElementById('logForm').addEventListener('submit', async e => {
    e.preventDefault();
    const fd = new FormData(e.target);
    const metricData = {};
    for (const m of availableMetrics) {
      const val = fd.get(m.id);
      if (val !== null && val !== '') {
        metricData[m.id] = m.data_type === 'text' ? val : parseFloat(val);
      }
    }
    await API.createLog(garden.id, {
      ph: metricData.ph ?? null, ppm: metricData.ppm != null ? Math.round(metricData.ppm) : null,
      water_temp: metricData.water_temp ?? null, nutrients: fd.get('nutrients') || null,
      notes: fd.get('notes') || null, metric_data: metricData
    });
    closeModal();
    toast('Log entry added');
    renderPage();
  });
}

// ============================================
// === TASKS
// ============================================
async function renderTasks(main) {
  main.innerHTML = `
    <header class="page-header">
      <div><h1>Tasks</h1></div>
      <button class="btn btn-primary" type="button" id="addTaskBtnGlobal">+ New Task</button>
    </header>
    <div style="display:flex;gap:12px;align-items:center;margin-bottom:16px;flex-wrap:wrap">
      <select class="form-input" id="tasksGardenFilter" style="width:auto" aria-label="Filter by garden">
        <option value="">All</option>
        <option value="__general__">General (no garden)</option>
        ${state.gardens.map(g => `<option value="${g.id}">${esc(g.name)}</option>`).join('')}
      </select>
      <div class="tabs" style="max-width:300px" role="tablist">
        <button class="tab active" role="tab" data-tab="active" type="button">Active</button>
        <button class="tab" role="tab" data-tab="completed" type="button">Completed</button>
      </div>
    </div>
    <div id="globalTasksList"><p class="loading-text">Loading...</p></div>
  `;

  document.getElementById('addTaskBtnGlobal').addEventListener('click', () => {
    showAddTaskModalGlobal();
  });

  let allTasks = [];
  let currentTab = 'active';
  let gardenFilter = '';

  function renderFilteredTasks() {
    let filtered = allTasks.filter(t => currentTab === 'active' ? !t.is_completed : t.is_completed);
    if (gardenFilter === '__general__') filtered = filtered.filter(t => !t.garden_id);
    else if (gardenFilter) filtered = filtered.filter(t => t.garden_id === gardenFilter);

    const el = document.getElementById('globalTasksList');
    if (!filtered.length) { el.innerHTML = `<div class="empty-state"><h3>${currentTab === 'active' ? 'No active tasks' : 'No completed tasks'}</h3></div>`; return; }

    el.innerHTML = `<div class="card" style="padding:0">${filtered.map(task => {
      const isOverdue = !task.is_completed && new Date(task.due_date) < new Date();
      return `<div class="task-item">
        <button class="task-checkbox ${task.is_completed ? 'checked' : ''}" type="button" data-toggle-id="${task.id}" aria-label="${task.is_completed ? 'Mark incomplete' : 'Mark complete'}" role="checkbox" aria-checked="${task.is_completed}"></button>
        <div class="task-content">
          <div class="task-title ${task.is_completed ? 'completed' : ''}">${esc(task.title)}</div>
          <div class="task-meta">
            <span><span class="priority-dot priority-${task.priority}" aria-hidden="true"></span>${task.priority}</span>
            <span class="${isOverdue ? 'overdue' : ''}">${isOverdue ? 'Overdue: ' : ''}${formatDate(task.due_date)}</span>
            ${task.is_recurring ? '<span>Recurring</span>' : ''}
            ${task.garden_name ? `<span class="badge badge-blue">${esc(task.garden_name)}</span>` : '<span class="badge badge-gray">General</span>'}
            ${task.plant_name ? `<span class="badge badge-green">${esc(task.plant_name)}</span>` : ''}
          </div>
        </div>
        <div class="task-actions">
          <button class="btn btn-secondary btn-sm" type="button" data-edit-task="${task.id}" aria-label="Edit task">Edit</button>
          <button class="btn-icon btn-sm" type="button" data-delete-task="${task.id}" aria-label="Delete task" title="Delete">&#x1F5D1;</button>
        </div>
      </div>`;
    }).join('')}</div>`;

    el.querySelectorAll('[data-toggle-id]').forEach(btn => {
      btn.addEventListener('click', async () => {
        await API.toggleTask(btn.dataset.toggleId);
        toast(btn.classList.contains('checked') ? 'Task reopened' : 'Task completed');
        allTasks = await API.getAllTasks();
        renderFilteredTasks();
      });
    });
    el.querySelectorAll('[data-delete-task]').forEach(btn => {
      btn.addEventListener('click', async () => {
        if (!confirm('Delete this task?')) return;
        await API.deleteTask(btn.dataset.deleteTask);
        toast('Task deleted');
        allTasks = await API.getAllTasks();
        renderFilteredTasks();
      });
    });
    el.querySelectorAll('[data-edit-task]').forEach(btn => {
      btn.addEventListener('click', () => {
        const task = allTasks.find(t => t.id === btn.dataset.editTask);
        if (task) showEditTaskModal(task);
      });
    });
  }

  main.querySelectorAll('.tabs .tab').forEach(btn => {
    btn.addEventListener('click', () => {
      main.querySelectorAll('.tabs .tab').forEach(t => t.classList.remove('active'));
      btn.classList.add('active');
      currentTab = btn.dataset.tab;
      renderFilteredTasks();
    });
  });

  document.getElementById('tasksGardenFilter').addEventListener('change', e => {
    gardenFilter = e.target.value;
    renderFilteredTasks();
  });

  try {
    allTasks = await API.getAllTasks();
    renderFilteredTasks();
  } catch {
    document.getElementById('globalTasksList').innerHTML = '<p class="empty-text">Failed to load tasks.</p>';
  }
}

function renderTasksList(tasks, tab) {
  const filtered = tasks.filter(t => tab === 'active' ? !t.is_completed : t.is_completed);
  const el = document.getElementById('tasksList');
  if (!filtered.length) { el.innerHTML = `<div class="empty-state"><h3>${tab === 'active' ? 'No active tasks' : 'No completed tasks'}</h3></div>`; return; }

  el.innerHTML = filtered.map(task => {
    const isOverdue = !task.is_completed && new Date(task.due_date) < new Date();
    return `<div class="task-item">
      <button class="task-checkbox ${task.is_completed ? 'checked' : ''}" type="button" data-toggle-id="${task.id}" aria-label="${task.is_completed ? 'Mark incomplete' : 'Mark complete'}" role="checkbox" aria-checked="${task.is_completed}"></button>
      <div class="task-content">
        <div class="task-title ${task.is_completed ? 'completed' : ''}">${esc(task.title)}</div>
        <div class="task-meta">
          <span><span class="priority-dot priority-${task.priority}" aria-hidden="true"></span>${task.priority}</span>
          <span class="${isOverdue ? 'overdue' : ''}">${isOverdue ? 'Overdue: ' : ''}${formatDate(task.due_date)}</span>
          ${task.is_recurring ? '<span>Recurring</span>' : ''}
        </div>
      </div>
      <div class="task-actions">
        <button class="btn btn-secondary btn-sm" type="button" data-edit-task="${task.id}" aria-label="Edit task">Edit</button>
        <button class="btn-icon btn-sm" type="button" data-delete-task="${task.id}" aria-label="Delete task" title="Delete">&#x1F5D1;</button>
      </div>
    </div>`;
  }).join('');

  el.querySelectorAll('[data-toggle-id]').forEach(btn => {
    btn.addEventListener('click', async () => {
      await API.toggleTask(btn.dataset.toggleId);
      toast(btn.classList.contains('checked') ? 'Task reopened' : 'Task completed');
      renderPage();
    });
  });
  el.querySelectorAll('[data-delete-task]').forEach(btn => {
    btn.addEventListener('click', async () => {
      if (!confirm('Delete this task?')) return;
      await API.deleteTask(btn.dataset.deleteTask);
      toast('Task deleted');
      renderPage();
    });
  });
  el.querySelectorAll('[data-edit-task]').forEach(btn => {
    btn.addEventListener('click', () => {
      const task = (window._tasks || []).find(t => t.id === btn.dataset.editTask);
      if (task) showEditTaskModal(task);
    });
  });
}

function showAddTaskModal(gardenId) {
  if (!gardenId) gardenId = state.selectedGardenId;
  const today = new Date().toISOString().split('T')[0];
  showModal(`<h2 id="modalTitle">Add New Task</h2><form id="taskForm">
    <div class="form-group"><label for="tf-title">Title <span class="required" aria-hidden="true">*</span></label><input class="form-input" id="tf-title" name="title" placeholder="e.g., Water change" required aria-required="true"></div>
    <div class="form-group"><label for="tf-desc">Description</label><textarea class="form-input" id="tf-desc" name="description" rows="2" placeholder="Details..."></textarea></div>
    <div class="form-row">
      <div class="form-group"><label for="tf-due">Due Date <span class="required" aria-hidden="true">*</span></label><input class="form-input" id="tf-due" name="due_date" type="date" value="${today}" required aria-required="true"></div>
      <div class="form-group"><label for="tf-priority">Priority</label><select class="form-input" id="tf-priority" name="priority"><option value="low">Low</option><option value="medium" selected>Medium</option><option value="high">High</option></select></div>
    </div>
    <div class="form-group"><label class="checkbox-label"><input type="checkbox" id="tf-recurring" name="is_recurring"> Recurring task</label></div>
    <div class="form-group" id="recurringDaysGroup" hidden><label for="tf-days">Repeat every (days)</label><input class="form-input" id="tf-days" name="recurring_days" type="number" min="1" value="7"></div>
    <div class="modal-actions"><button type="button" class="btn btn-secondary" id="cancelTask">Cancel</button><button type="submit" class="btn btn-primary">Add Task</button></div></form>`);
  document.getElementById('cancelTask').addEventListener('click', closeModal);
  document.getElementById('tf-recurring').addEventListener('change', e => {
    document.getElementById('recurringDaysGroup').hidden = !e.target.checked;
  });
  document.getElementById('taskForm').addEventListener('submit', async e => {
    e.preventDefault();
    const fd = new FormData(e.target);
    const isRecurring = !!fd.get('is_recurring');
    await API.createTask(gardenId, {
      title: fd.get('title'), description: fd.get('description') || null,
      due_date: new Date(fd.get('due_date')).toISOString(), priority: fd.get('priority'),
      is_recurring: isRecurring, recurring_days: isRecurring ? parseInt(fd.get('recurring_days')) || 7 : null
    });
    closeModal();
    toast('Task created');
    renderPage();
  });
}

function showAddTaskModalGlobal() {
  const today = new Date().toISOString().split('T')[0];
  // Collect all plants across all gardens
  const allPlants = [];
  const gardenPlantPromises = state.gardens.map(g => API.getPlants(g.id).then(plants => {
    plants.forEach(p => allPlants.push({ ...p, _gardenName: g.name }));
  }));

  showModal(`<h2 id="modalTitle">Add New Task</h2><form id="taskForm">
    <div class="form-group"><label for="tf-scope">Scope</label>
      <select class="form-input" id="tf-scope">
        <option value="general">General (no garden)</option>
        ${state.gardens.map(g => `<option value="garden:${g.id}">${esc(g.name)}</option>`).join('')}
      </select>
    </div>
    <div class="form-group" id="tf-plant-group" hidden><label for="tf-plant">Plant (optional)</label>
      <select class="form-input" id="tf-plant"><option value="">None</option></select>
    </div>
    <div class="form-group"><label for="tf-title">Title <span class="required" aria-hidden="true">*</span></label><input class="form-input" id="tf-title" name="title" placeholder="e.g., Water change" required aria-required="true"></div>
    <div class="form-group"><label for="tf-desc">Description</label><textarea class="form-input" id="tf-desc" name="description" rows="2" placeholder="Details..."></textarea></div>
    <div class="form-row">
      <div class="form-group"><label for="tf-due">Due Date <span class="required" aria-hidden="true">*</span></label><input class="form-input" id="tf-due" name="due_date" type="date" value="${today}" required aria-required="true"></div>
      <div class="form-group"><label for="tf-priority">Priority</label><select class="form-input" id="tf-priority" name="priority"><option value="low">Low</option><option value="medium" selected>Medium</option><option value="high">High</option></select></div>
    </div>
    <div class="form-group"><label class="checkbox-label"><input type="checkbox" id="tf-recurring" name="is_recurring"> Recurring task</label></div>
    <div class="form-group" id="recurringDaysGroup" hidden><label for="tf-days">Repeat every (days)</label><input class="form-input" id="tf-days" name="recurring_days" type="number" min="1" value="7"></div>
    <div class="modal-actions"><button type="button" class="btn btn-secondary" id="cancelTask">Cancel</button><button type="submit" class="btn btn-primary">Add Task</button></div></form>`);

  document.getElementById('cancelTask').addEventListener('click', closeModal);
  document.getElementById('tf-recurring').addEventListener('change', e => {
    document.getElementById('recurringDaysGroup').hidden = !e.target.checked;
  });

  const scopeEl = document.getElementById('tf-scope');
  const plantGroup = document.getElementById('tf-plant-group');
  const plantEl = document.getElementById('tf-plant');

  // Load plants when a garden is selected
  Promise.all(gardenPlantPromises).then(() => {
    scopeEl.addEventListener('change', () => {
      const val = scopeEl.value;
      if (val.startsWith('garden:')) {
        const gid = val.split(':')[1];
        const gardenPlants = allPlants.filter(p => p.garden_id === gid && p.is_active);
        plantEl.innerHTML = '<option value="">None</option>' + gardenPlants.map(p => `<option value="${p.id}">${esc(p.name)}</option>`).join('');
        plantGroup.hidden = false;
      } else {
        plantGroup.hidden = true;
        plantEl.value = '';
      }
    });
  });

  document.getElementById('taskForm').addEventListener('submit', async e => {
    e.preventDefault();
    const fd = new FormData(e.target);
    const isRecurring = !!fd.get('is_recurring');
    const scope = scopeEl.value;
    const data = {
      title: fd.get('title'), description: fd.get('description') || null,
      due_date: new Date(fd.get('due_date')).toISOString(), priority: fd.get('priority'),
      is_recurring: isRecurring, recurring_days: isRecurring ? parseInt(fd.get('recurring_days')) || 7 : null
    };
    if (scope.startsWith('garden:')) {
      data.garden_id = scope.split(':')[1];
      if (plantEl.value) data.plant_id = plantEl.value;
    }
    await API.createTaskGeneral(data);
    closeModal();
    toast('Task created');
    renderPage();
  });
}

function showTaskDetailModal(task) {
  const isOverdue = !task.is_completed && task.due_date && new Date(task.due_date) < new Date();
  const priorityLabels = { low: 'Low', medium: 'Medium', high: 'High' };
  showModal(`
    <h2 id="modalTitle">${esc(task.title)}</h2>
    <div style="display:flex;flex-direction:column;gap:12px">
      <div style="display:flex;gap:8px;flex-wrap:wrap">
        <span class="badge badge-${task.priority === 'high' ? 'red' : task.priority === 'medium' ? 'amber' : 'green'}">
          <span class="priority-dot priority-${task.priority}" style="margin-right:4px"></span>${priorityLabels[task.priority] || task.priority} priority
        </span>
        ${isOverdue ? '<span class="badge badge-red">Overdue</span>' : ''}
        ${task.is_recurring ? '<span class="badge badge-blue">Recurring</span>' : ''}
      </div>
      ${task.description ? `<div style="color:var(--text-secondary);font-size:0.9rem;line-height:1.5">${esc(task.description)}</div>` : ''}
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px 16px;font-size:0.85rem">
        <div><div class="detail-label">Due Date</div><div class="detail-value ${isOverdue ? 'overdue' : ''}">${formatDate(task.due_date)}</div></div>
        <div><div class="detail-label">Status</div><div class="detail-value">${task.is_completed ? 'Completed' : 'Open'}</div></div>
        ${task.garden_name ? `<div><div class="detail-label">Garden</div><div class="detail-value">${esc(task.garden_name)}</div></div>` : ''}
        ${task.plant_name ? `<div><div class="detail-label">Plant</div><div class="detail-value">${esc(task.plant_name)}</div></div>` : ''}
        ${task.is_recurring && task.recurring_days ? `<div><div class="detail-label">Repeats</div><div class="detail-value">Every ${task.recurring_days} day${task.recurring_days !== 1 ? 's' : ''}</div></div>` : ''}
        ${task.completed_at ? `<div><div class="detail-label">Completed</div><div class="detail-value">${formatDateTime(task.completed_at)}</div></div>` : ''}
      </div>
    </div>
    <div class="modal-actions">
      <button class="btn btn-danger btn-sm" type="button" id="taskDetailDeleteBtn">Delete</button>
      <div style="flex:1"></div>
      ${!task.is_completed ? '<button class="btn btn-primary" type="button" id="taskDetailCompleteBtn">Mark Complete</button>' : ''}
      <button class="btn btn-secondary" type="button" id="taskDetailCloseBtn">Close</button>
    </div>
  `);
  document.getElementById('taskDetailCloseBtn').addEventListener('click', closeModal);
  document.getElementById('taskDetailDeleteBtn').addEventListener('click', async () => {
    if (!confirm('Delete this task?')) return;
    try {
      await API.deleteTask(task.id);
      closeModal();
      renderPage();
    } catch (err) {
      showToast('Failed to delete task', 'error');
    }
  });
  const completeBtn = document.getElementById('taskDetailCompleteBtn');
  if (completeBtn) {
    completeBtn.addEventListener('click', async () => {
      completeBtn.disabled = true;
      completeBtn.textContent = 'Completing…';
      try {
        await API.toggleTask(task.id);
        closeModal();
        renderPage();
      } catch (err) {
        completeBtn.disabled = false;
        completeBtn.textContent = 'Mark Complete';
        showToast('Failed to complete task', 'error');
      }
    });
  }
}

function showEditTaskModal(task) {
  const dueDate = task.due_date ? new Date(task.due_date).toISOString().split('T')[0] : '';
  showModal(`<h2 id="modalTitle">Edit Task</h2><form id="taskForm">
    <div class="form-group"><label for="tf-title">Title <span class="required" aria-hidden="true">*</span></label><input class="form-input" id="tf-title" name="title" value="${esc(task.title)}" required aria-required="true"></div>
    <div class="form-group"><label for="tf-desc">Description</label><textarea class="form-input" id="tf-desc" name="description" rows="2">${esc(task.description || '')}</textarea></div>
    <div class="form-row">
      <div class="form-group"><label for="tf-due">Due Date</label><input class="form-input" id="tf-due" name="due_date" type="date" value="${dueDate}" required></div>
      <div class="form-group"><label for="tf-priority">Priority</label><select class="form-input" id="tf-priority" name="priority"><option value="low" ${task.priority === 'low' ? 'selected' : ''}>Low</option><option value="medium" ${task.priority === 'medium' ? 'selected' : ''}>Medium</option><option value="high" ${task.priority === 'high' ? 'selected' : ''}>High</option></select></div>
    </div>
    <div class="form-group"><label class="checkbox-label"><input type="checkbox" id="tf-recurring" name="is_recurring" ${task.is_recurring ? 'checked' : ''}> Recurring task</label></div>
    <div class="form-group" id="recurringDaysGroup" ${task.is_recurring ? '' : 'hidden'}><label for="tf-days">Repeat every (days)</label><input class="form-input" id="tf-days" name="recurring_days" type="number" min="1" value="${task.recurring_days || 7}"></div>
    <div class="modal-actions"><button type="button" class="btn btn-secondary" id="cancelTask">Cancel</button><button type="submit" class="btn btn-primary">Save Changes</button></div></form>`);
  document.getElementById('cancelTask').addEventListener('click', closeModal);
  document.getElementById('tf-recurring').addEventListener('change', e => {
    document.getElementById('recurringDaysGroup').hidden = !e.target.checked;
  });
  document.getElementById('taskForm').addEventListener('submit', async e => {
    e.preventDefault();
    const fd = new FormData(e.target);
    const isRecurring = !!fd.get('is_recurring');
    await API.updateTask(task.id, {
      title: fd.get('title'), description: fd.get('description') || null,
      due_date: new Date(fd.get('due_date')).toISOString(), priority: fd.get('priority'),
      is_completed: task.is_completed, is_recurring: isRecurring,
      recurring_days: isRecurring ? parseInt(fd.get('recurring_days')) || 7 : null
    });
    closeModal();
    toast('Task updated');
    renderPage();
  });
}

// ============================================
// === PLANTS
// ============================================
async function renderPlants(main) {
  main.innerHTML = `<header class="page-header"><div><h1>All Plants</h1></div>
    <div style="display:flex;gap:8px">
      <select class="form-input" id="stageFilter" style="width:auto" aria-label="Filter by growth stage"><option value="">All Stages</option>${GROWTH_STAGES.map(s => `<option value="${s}">${s.charAt(0).toUpperCase() + s.slice(1)}</option>`).join('')}</select>
      ${state.gardens.length ? '<button class="btn btn-primary" type="button" id="addPlantGlobalBtn">+ Add Plant</button>' : ''}
    </div></header>
    <div id="plantsList"><p class="loading-text">Loading...</p></div>`;

  if (state.gardens.length) {
    document.getElementById('addPlantGlobalBtn').addEventListener('click', () => showAddPlantModal(null));
  }

  if (!state.gardens.length) {
    document.getElementById('plantsList').innerHTML = '<div class="empty-state"><h3>No gardens yet</h3><p>Create a garden from the Dashboard first.</p></div>';
    return;
  }

  const allPlantArrays = await Promise.all(state.gardens.map(g => API.getPlants(g.id)));
  const allPlants = [];
  allPlantArrays.forEach((plants, i) => {
    plants.forEach(p => { p._gardenName = state.gardens[i].name; p._gardenId = state.gardens[i].id; allPlants.push(p); });
  });
  window._plants = allPlants;
  renderPlantsGrid(allPlants.filter(p => p.is_active), document.getElementById('plantsList'), true);

  document.getElementById('stageFilter').addEventListener('change', e => {
    const stage = e.target.value;
    const filtered = stage ? allPlants.filter(p => p.current_stage === stage && p.is_active) : allPlants.filter(p => p.is_active);
    renderPlantsGrid(filtered, document.getElementById('plantsList'), true);
  });
}

function renderPlantsGrid(plants, el, showGarden = false) {
  if (!plants.length) { el.innerHTML = '<div class="empty-state"><h3>No plants yet</h3><p>Add plants from within a garden.</p></div>'; return; }
  el.innerHTML = `<div class="card" style="padding:0">${plants.map(plant => {
    return `<button class="garden-row" type="button" data-plant-id="${plant.id}">
      <span class="material-symbols-outlined garden-row-icon">${PLANT_ICONS[plant.plant_type] || 'eco'}</span>
      <span class="garden-row-name">${esc(plant.name)}</span>
      <span class="garden-row-badges">
        <span class="badge badge-${STAGE_COLORS[plant.current_stage] || 'gray'}">${plant.current_stage}</span>
        ${showGarden && plant._gardenName ? `<span class="badge badge-blue">${esc(plant._gardenName)}</span>` : ''}
      </span>
    </button>`;
  }).join('')}</div>`;
  el.querySelectorAll('[data-plant-id]').forEach(card => {
    card.addEventListener('click', () => showPlantDetail(card.dataset.plantId));
  });
}

function showAddPlantModal(gardenId) {
  const showGardenPicker = !gardenId && state.gardens.length > 0;
  showModal(`<h2 id="modalTitle">Add New Plant</h2><form id="plantForm">
    ${showGardenPicker ? `<div class="form-group"><label for="pf-garden">Garden <span class="required" aria-hidden="true">*</span></label><select class="form-input" id="pf-garden" name="garden_id" required aria-required="true">${state.gardens.map(g => `<option value="${g.id}">${esc(g.name)}</option>`).join('')}</select></div>` : ''}
    <div class="form-row"><div class="form-group" style="flex:1"><label for="pf-name">Plant Name <span class="required" aria-hidden="true">*</span></label><input class="form-input" id="pf-name" name="name" placeholder="e.g., Cherry Tomato" required aria-required="true"></div>
      <div class="form-group" style="max-width:100px"><label for="pf-qty">Quantity</label><input class="form-input" id="pf-qty" name="quantity" type="number" min="1" max="100" value="1"></div></div>
    <div class="form-hint" id="qtyHint" hidden style="margin-top:-12px;margin-bottom:12px">Plants will be named "Name #1", "Name #2", etc.</div>
    <div class="form-row"><div class="form-group"><label for="pf-type">Plant Type <span class="required" aria-hidden="true">*</span></label><select class="form-input" id="pf-type" name="plant_type" required aria-required="true">${PLANT_TYPES.map(t => `<option value="${t}">${t.charAt(0).toUpperCase() + t.slice(1)}</option>`).join('')}</select></div>
      <div class="form-group"><label for="pf-species">Species <span class="required" aria-hidden="true">*</span></label><input class="form-input" id="pf-species" name="species" placeholder="e.g., Cherry Tomato" required aria-required="true"></div></div>
    <div class="form-row"><div class="form-group"><label for="pf-seeded">Seeded Date</label><input class="form-input" id="pf-seeded" name="seeded_date" type="date" value="${new Date().toISOString().split('T')[0]}"></div>
      <div class="form-group"><label for="pf-stage">Growth Stage</label><select class="form-input" id="pf-stage" name="current_stage">${GROWTH_STAGES.map(s => `<option value="${s}">${s.charAt(0).toUpperCase() + s.slice(1)}</option>`).join('')}</select></div></div>
    ${state.seeds.length ? `<div class="form-group"><label for="pf-seed">Seed Source</label><select class="form-input" id="pf-seed" name="seed_id"><option value="">None</option>${state.seeds.map(s => `<option value="${s.id}">${esc(s.name)}${s.variety ? ' — ' + esc(s.variety) : ''}</option>`).join('')}</select></div>` : ''}
    <div class="form-row"><div class="form-group"><label for="pf-ph">Initial pH</label><input class="form-input" id="pf-ph" name="initial_ph" type="number" step="0.1" placeholder="6.0"></div>
      <div class="form-group"><label for="pf-ppm">Initial PPM</label><input class="form-input" id="pf-ppm" name="initial_ppm" type="number" placeholder="800"></div></div>
    <div class="form-group"><label for="pf-notes">Notes</label><textarea class="form-input" id="pf-notes" name="notes" rows="2" placeholder="Any notes..."></textarea></div>
    <div class="modal-actions"><button type="button" class="btn btn-secondary" id="cancelPlant">Cancel</button><button type="submit" class="btn btn-primary">Add Plant</button></div></form>`);
  document.getElementById('cancelPlant').addEventListener('click', closeModal);
  document.getElementById('pf-qty').addEventListener('input', e => {
    document.getElementById('qtyHint').hidden = parseInt(e.target.value) <= 1;
  });
  document.getElementById('plantForm').addEventListener('submit', async e => {
    e.preventDefault();
    const fd = new FormData(e.target);
    const targetGardenId = gardenId || fd.get('garden_id');
    const qty = Math.min(Math.max(parseInt(fd.get('quantity')) || 1, 1), 100);
    const baseName = fd.get('name');
    const plantData = {
      plant_type: fd.get('plant_type'), species: fd.get('species'),
      seeded_date: fd.get('seeded_date') ? new Date(fd.get('seeded_date')).toISOString() : null,
      current_stage: fd.get('current_stage'), initial_ph: fd.get('initial_ph') ? parseFloat(fd.get('initial_ph')) : null,
      initial_ppm: fd.get('initial_ppm') ? parseInt(fd.get('initial_ppm')) : null, notes: fd.get('notes') || null,
      seed_id: fd.get('seed_id') || null
    };
    const promises = [];
    for (let i = 0; i < qty; i++) {
      const name = qty > 1 ? `${baseName} #${i + 1}` : baseName;
      promises.push(API.createPlant(targetGardenId, { ...plantData, name }));
    }
    await Promise.all(promises);
    closeModal();
    toast(qty > 1 ? `${qty} plants added` : 'Plant added');
    renderPage();
  });
}

function showPlantDetail(id) {
  const plant = (window._plants || []).find(p => p.id === id);
  if (!plant) return;

  const seedName = getSeedName(plant.seed_id);
  const canFail = plant.is_active && ['seed', 'germination', 'seedling'].includes(plant.current_stage);
  showDrawer(`
    <div class="drawer-header">
      <h2 id="drawerTitle">${esc(plant.name)}</h2>
      <button class="drawer-close" id="closeDrawerBtn" type="button" aria-label="Close"><span class="material-symbols-outlined" aria-hidden="true">close</span></button>
    </div>
    <div class="drawer-body">
      <div style="margin-bottom:16px;display:flex;gap:8px;flex-wrap:wrap">
        <span class="badge badge-${STAGE_COLORS[plant.current_stage] || 'gray'}">${plant.current_stage}</span>
        <span class="badge badge-gray">${esc(plant.plant_type)}</span>
        ${seedName ? `<span class="badge badge-green">Seed: ${esc(seedName)}</span>` : ''}
      </div>
      <div class="detail-grid">
        <div><div class="detail-label">Species</div><div class="detail-value">${esc(plant.species)}</div></div>
        <div><div class="detail-label">Seeded</div><div class="detail-value">${formatDate(plant.seeded_date)}</div></div>
        <div><div class="detail-label">Transplanted</div><div class="detail-value">${formatDate(plant.transplanted_date)}</div></div>
        <div><div class="detail-label">Initial pH</div><div class="detail-value">${plant.initial_ph ?? '--'}</div></div>
        <div><div class="detail-label">Initial PPM</div><div class="detail-value">${plant.initial_ppm ?? '--'}</div></div>
        <div><div class="detail-label">Harvest Date</div><div class="detail-value">${formatDate(plant.harvest_date)}</div></div>
        ${plant.yield_amount ? `<div><div class="detail-label">Yield</div><div class="detail-value">${plant.yield_amount}</div></div>` : ''}
      </div>
      ${plant.notes ? `<div class="detail-notes">${esc(plant.notes)}</div>` : ''}
    </div>
    <div class="drawer-actions">
      ${canFail ? '<button class="btn btn-danger btn-sm" type="button" id="failPlantBtn">Mark as Failed</button>' : ''}
      <button class="btn btn-danger btn-sm" type="button" id="deletePlantBtn">Delete</button>
      <button class="btn btn-secondary" type="button" id="editPlantBtn">Edit</button>
    </div>`);
  document.getElementById('closeDrawerBtn').addEventListener('click', closeDrawer);
  document.getElementById('deletePlantBtn').addEventListener('click', async () => {
    if (!confirm('Delete this plant?')) return;
    await API.deletePlant(plant.id);
    closeDrawer();
    toast('Plant deleted');
    renderPage();
  });
  document.getElementById('editPlantBtn').addEventListener('click', () => {
    closeDrawer();
    showEditPlantModal(plant);
  });
  if (canFail) {
    document.getElementById('failPlantBtn').addEventListener('click', () => {
      closeDrawer();
      showMarkPlantFailedModal(plant);
    });
  }
}

function showEditPlantModal(plant) {
  const seededDate = plant.seeded_date ? new Date(plant.seeded_date).toISOString().split('T')[0] : '';
  const transplantedDate = plant.transplanted_date ? new Date(plant.transplanted_date).toISOString().split('T')[0] : '';
  const harvestDate = plant.harvest_date ? new Date(plant.harvest_date).toISOString().split('T')[0] : '';

  showModal(`<h2 id="modalTitle">Edit Plant</h2><form id="plantForm">
    <div class="form-group"><label for="pf-name">Plant Name</label><input class="form-input" id="pf-name" name="name" value="${esc(plant.name)}" required></div>
    <div class="form-row"><div class="form-group"><label for="pf-type">Plant Type</label><select class="form-input" id="pf-type" name="plant_type" required>${PLANT_TYPES.map(t => `<option value="${t}" ${plant.plant_type === t ? 'selected' : ''}>${t.charAt(0).toUpperCase() + t.slice(1)}</option>`).join('')}</select></div>
      <div class="form-group"><label for="pf-species">Species</label><input class="form-input" id="pf-species" name="species" value="${esc(plant.species)}" required></div></div>
    <div class="form-row"><div class="form-group"><label for="pf-seeded">Seeded Date</label><input class="form-input" id="pf-seeded" name="seeded_date" type="date" value="${seededDate}"></div>
      <div class="form-group"><label for="pf-transplanted">Transplanted Date</label><input class="form-input" id="pf-transplanted" name="transplanted_date" type="date" value="${transplantedDate}"></div></div>
    <div class="form-row"><div class="form-group"><label for="pf-stage">Growth Stage</label><select class="form-input" id="pf-stage" name="current_stage">${GROWTH_STAGES.map(s => `<option value="${s}" ${plant.current_stage === s ? 'selected' : ''}>${s.charAt(0).toUpperCase() + s.slice(1)}</option>`).join('')}</select></div>
      <div class="form-group"><label for="pf-harvest">Harvest Date</label><input class="form-input" id="pf-harvest" name="harvest_date" type="date" value="${harvestDate}"></div></div>
    <div class="form-row"><div class="form-group"><label for="pf-yield">Yield Amount</label><input class="form-input" id="pf-yield" name="yield_amount" type="number" step="0.1" value="${plant.yield_amount || ''}"></div>
      <div class="form-group"><label class="checkbox-label" style="margin-top:28px"><input type="checkbox" name="is_active" ${plant.is_active ? 'checked' : ''}> Active</label></div></div>
    ${state.seeds.length ? `<div class="form-group"><label for="pf-seed">Seed Source</label><select class="form-input" id="pf-seed" name="seed_id"><option value="">None</option>${state.seeds.map(s => `<option value="${s.id}" ${plant.seed_id === s.id ? 'selected' : ''}>${esc(s.name)}${s.variety ? ' — ' + esc(s.variety) : ''}</option>`).join('')}</select></div>` : ''}
    <div class="form-row"><div class="form-group"><label for="pf-ph">Initial pH</label><input class="form-input" id="pf-ph" name="initial_ph" type="number" step="0.1" value="${plant.initial_ph || ''}"></div>
      <div class="form-group"><label for="pf-ppm">Initial PPM</label><input class="form-input" id="pf-ppm" name="initial_ppm" type="number" value="${plant.initial_ppm || ''}"></div></div>
    <div class="form-group"><label for="pf-notes">Notes</label><textarea class="form-input" id="pf-notes" name="notes" rows="2">${esc(plant.notes || '')}</textarea></div>
    <div class="modal-actions"><button type="button" class="btn btn-secondary" id="cancelPlant">Cancel</button><button type="submit" class="btn btn-primary">Save Changes</button></div></form>`);
  document.getElementById('cancelPlant').addEventListener('click', closeModal);
  document.getElementById('plantForm').addEventListener('submit', async e => {
    e.preventDefault();
    const fd = new FormData(e.target);
    await API.updatePlant(plant.id, {
      name: fd.get('name'), plant_type: fd.get('plant_type'), species: fd.get('species'),
      seeded_date: fd.get('seeded_date') ? new Date(fd.get('seeded_date')).toISOString() : null,
      transplanted_date: fd.get('transplanted_date') ? new Date(fd.get('transplanted_date')).toISOString() : null,
      current_stage: fd.get('current_stage'), harvest_date: fd.get('harvest_date') ? new Date(fd.get('harvest_date')).toISOString() : null,
      yield_amount: fd.get('yield_amount') ? parseFloat(fd.get('yield_amount')) : null,
      is_active: !!fd.get('is_active'), initial_ph: fd.get('initial_ph') ? parseFloat(fd.get('initial_ph')) : null,
      initial_ppm: fd.get('initial_ppm') ? parseInt(fd.get('initial_ppm')) : null, notes: fd.get('notes') || null,
      seed_id: fd.get('seed_id') || null
    });
    closeModal();
    toast('Plant updated');
    renderPage();
  });
}

function showMarkPlantFailedModal(plant) {
  showModal(`<h2 id="modalTitle">Mark Plant as Failed</h2>
    <p class="wizard-desc">This will mark <strong>${esc(plant.name)}</strong> as inactive and record the failure.</p>
    <form id="failForm">
      <div class="form-group"><label for="ff-stage">Failure Stage <span class="required" aria-hidden="true">*</span></label>
        <select class="form-input" id="ff-stage" name="failure_stage" required aria-required="true">
          <option value="seed" ${plant.current_stage === 'seed' ? 'selected' : ''}>Seed</option>
          <option value="germination" ${plant.current_stage === 'germination' ? 'selected' : ''}>Germination</option>
          <option value="seedling" ${plant.current_stage === 'seedling' ? 'selected' : ''}>Seedling</option>
        </select></div>
      <div class="form-group"><label for="ff-reason">Reason</label><textarea class="form-input" id="ff-reason" name="failure_reason" rows="3" placeholder="What went wrong?"></textarea></div>
      <div class="modal-actions"><button type="button" class="btn btn-secondary" id="cancelFail">Cancel</button><button type="submit" class="btn btn-danger">Mark as Failed</button></div>
    </form>`);
  document.getElementById('cancelFail').addEventListener('click', closeModal);
  document.getElementById('failForm').addEventListener('submit', async e => {
    e.preventDefault();
    const fd = new FormData(e.target);
    await API.markPlantFailed(plant.id, {
      failure_stage: fd.get('failure_stage'),
      failure_reason: fd.get('failure_reason') || null
    });
    closeModal();
    toast('Plant marked as failed');
    renderPage();
  });
}

// ============================================
// === SEEDS
// ============================================
async function renderSeeds(main) {
  const isAdmin = state.user?.is_admin;
  main.innerHTML = `
    <header class="page-header"><div><h1>Seed Inventory</h1></div>
      ${isAdmin ? '<button class="btn btn-primary" type="button" id="addSeedBtn">+ Add Seed</button>' : ''}
    </header>
    <div id="seedsList"><p class="loading-text">Loading...</p></div>
  `;
  if (isAdmin) document.getElementById('addSeedBtn').addEventListener('click', showAddSeedModal);

  try {
    state.seeds = await API.getSeeds();
    const el = document.getElementById('seedsList');
    if (!state.seeds.length) {
      el.innerHTML = '<div class="empty-state"><h3>No seeds yet</h3><p>Add seeds to track your inventory and performance.</p></div>';
      return;
    }
    el.innerHTML = `<div class="card" style="padding:0">${state.seeds.map(seed => {
      const rate = seed.plant_count > 0 ? Math.round(((seed.plant_count - seed.failure_count) / seed.plant_count) * 100) : null;
      return `<button class="garden-row" type="button" data-seed-id="${seed.id}">
        <span class="material-symbols-outlined garden-row-icon">grass</span>
        <span class="garden-row-name">${esc(seed.name)}</span>
        <span class="garden-row-badges">
          ${seed.variety ? `<span class="badge badge-green">${esc(seed.variety)}</span>` : ''}
          ${seed.supplier ? `<span class="badge badge-purple">${esc(seed.supplier)}</span>` : ''}
        </span>
        <span class="garden-row-metrics">
          <span>${seed.quantity} ${esc(seed.quantity_unit)}</span>
          <span>${seed.plant_count} Plants</span>
          <span>${rate != null ? rate + '% Success' : ''}</span>
          <span>${seed.days_to_germination != null ? seed.days_to_germination + 'd germ.' : ''}</span>
        </span>
      </button>`;
    }).join('')}</div>`;
    el.querySelectorAll('[data-seed-id]').forEach(card => {
      card.addEventListener('click', () => showSeedDetail(card.dataset.seedId));
    });
  } catch {
    document.getElementById('seedsList').innerHTML = '<p class="empty-text">Failed to load seeds.</p>';
  }
}

async function showSeedDetail(seedId) {
  if (!seedId) return;
  const isAdmin = state.user?.is_admin;

  showDrawer(`
    <div class="drawer-header">
      <h2 id="drawerTitle">Loading...</h2>
      <button class="drawer-close" id="closeDrawerBtn" type="button" aria-label="Close"><span class="material-symbols-outlined" aria-hidden="true">close</span></button>
    </div>
    <div class="drawer-body"><p class="loading-text">Loading...</p></div>`);
  document.getElementById('closeDrawerBtn').addEventListener('click', closeDrawer);

  try {
    const [seed, metrics] = await Promise.all([API.getSeed(seedId), API.getSeedMetrics(seedId)]);
    const drawer = document.getElementById('drawer');
    if (!drawer || !drawer.classList.contains('open')) return; // drawer was closed

    drawer.innerHTML = `
      <div class="drawer-header">
        <h2 id="drawerTitle">${esc(seed.name)}</h2>
        <button class="drawer-close" id="closeDrawerBtn" type="button" aria-label="Close"><span class="material-symbols-outlined" aria-hidden="true">close</span></button>
      </div>
      <div class="drawer-body">
        <div style="display:flex;gap:8px;margin-bottom:16px;flex-wrap:wrap">
          ${seed.variety ? `<span class="badge badge-green">${esc(seed.variety)}</span>` : ''}
          ${seed.supplier ? `<span class="badge badge-purple">${esc(seed.supplier)}</span>` : ''}
        </div>
        <h3 class="section-heading" style="margin-top:0">Inventory Details</h3>
        <div class="detail-grid">
          <div><div class="detail-label">Quantity</div><div class="detail-value">${seed.quantity} ${esc(seed.quantity_unit)}</div></div>
          <div><div class="detail-label">Supplier</div><div class="detail-value">${esc(seed.supplier) || '--'}</div></div>
          <div><div class="detail-label">Purchase Date</div><div class="detail-value">${formatDate(seed.purchase_date)}</div></div>
          <div><div class="detail-label">Purchase Price</div><div class="detail-value">${seed.purchase_price != null ? '$' + seed.purchase_price.toFixed(2) : '--'}</div></div>
          <div><div class="detail-label">Expected Germ. Rate</div><div class="detail-value">${seed.expected_germination_rate != null ? seed.expected_germination_rate + '%' : '--'}</div></div>
          <div><div class="detail-label">Days to Germination</div><div class="detail-value">${seed.days_to_germination ?? '--'}</div></div>
        </div>
        ${seed.notes ? `<div class="detail-notes">${esc(seed.notes)}</div>` : ''}
        <h3 class="section-heading">Performance Metrics</h3>
        <div class="grid-2" style="margin-bottom:16px">
          <div class="metric-card"><div class="metric-icon green" aria-hidden="true"><span class="material-symbols-outlined">potted_plant</span></div><div><div class="metric-value">${metrics.total_plants}</div><div class="metric-label">Total Plants</div></div></div>
          <div class="metric-card"><div class="metric-icon blue" aria-hidden="true"><span class="material-symbols-outlined">check_circle</span></div><div><div class="metric-value">${metrics.past_germination}</div><div class="metric-label">Past Germination</div></div></div>
          <div class="metric-card"><div class="metric-icon ${metrics.germination_rate != null && metrics.germination_rate >= 70 ? 'green' : metrics.germination_rate != null && metrics.germination_rate >= 40 ? 'amber' : 'red'}" aria-hidden="true"><span class="material-symbols-outlined">percent</span></div><div><div class="metric-value">${metrics.germination_rate != null ? metrics.germination_rate + '%' : '--'}</div><div class="metric-label">Germination Rate</div></div></div>
          <div class="metric-card"><div class="metric-icon red" aria-hidden="true"><span class="material-symbols-outlined">cancel</span></div><div><div class="metric-value">${metrics.total_failures}</div><div class="metric-label">Failures</div></div></div>
        </div>
        ${metrics.failures.length ? `
          <h3 style="font-size:0.9rem;color:var(--text-secondary);margin-bottom:8px">Failure Breakdown</h3>
          ${metrics.failures.map(f => `<div style="display:flex;justify-content:space-between;align-items:center;padding:8px 0;border-bottom:1px solid var(--border)">
            <span>${esc(f.failure_stage)}${f.failure_reason ? ': ' + esc(f.failure_reason) : ''}</span>
            <span class="badge badge-red">${f.count}</span>
          </div>`).join('')}
        ` : '<p class="empty-text">No failures recorded.</p>'}
      </div>
      ${isAdmin ? `<div class="drawer-actions">
        <button class="btn btn-danger btn-sm" type="button" id="deleteSeedBtn">Delete</button>
        <button class="btn btn-secondary" type="button" id="editSeedBtn">Edit</button>
      </div>` : ''}`;

    document.getElementById('closeDrawerBtn').addEventListener('click', closeDrawer);
    if (isAdmin) {
      document.getElementById('editSeedBtn').addEventListener('click', () => {
        closeDrawer();
        showEditSeedModal(seed);
      });
      document.getElementById('deleteSeedBtn').addEventListener('click', async () => {
        if (!confirm('Delete this seed? Plants will keep their data but lose the seed reference.')) return;
        await API.deleteSeed(seed.id);
        closeDrawer();
        toast('Seed deleted');
        renderPage();
      });
    }
  } catch {
    const drawer = document.getElementById('drawer');
    if (drawer && drawer.classList.contains('open')) {
      drawer.querySelector('.drawer-body').innerHTML = '<p class="empty-text">Failed to load seed details.</p>';
    }
  }
}

function getUniqueSuppliers() {
  const suppliers = new Set();
  for (const s of state.seeds) { if (s.supplier) suppliers.add(s.supplier); }
  return [...suppliers].sort();
}

function showAddSeedModal() {
  const suppliers = getUniqueSuppliers();
  showModal(`<h2 id="modalTitle">Add Seed</h2><form id="seedForm">
    <div class="form-group"><label for="sf-name">Name <span class="required" aria-hidden="true">*</span></label><input class="form-input" id="sf-name" name="name" required aria-required="true" placeholder="e.g., Cherry Tomato"></div>
    <div class="form-row">
      <div class="form-group"><label for="sf-variety">Variety</label><input class="form-input" id="sf-variety" name="variety" placeholder="e.g., Sweet Million"></div>
      <div class="form-group"><label for="sf-supplier">Supplier</label><input class="form-input" id="sf-supplier" name="supplier" list="supplierList" placeholder="e.g., Baker Creek" autocomplete="off"><datalist id="supplierList">${suppliers.map(s => `<option value="${esc(s)}">`).join('')}</datalist></div>
    </div>
    <div class="form-row">
      <div class="form-group"><label for="sf-quantity">Quantity</label><input class="form-input" id="sf-quantity" name="quantity" type="number" min="0" value="1"></div>
      <div class="form-group"><label for="sf-unit">Unit</label><select class="form-input" id="sf-unit" name="quantity_unit"><option value="packets">Packets</option><option value="seeds">Seeds</option><option value="grams">Grams</option></select></div>
    </div>
    <div class="form-row">
      <div class="form-group"><label for="sf-date">Purchase Date</label><input class="form-input" id="sf-date" name="purchase_date" type="date"></div>
      <div class="form-group"><label for="sf-price">Price</label><input class="form-input" id="sf-price" name="purchase_price" type="number" step="0.01" min="0" placeholder="0.00"></div>
    </div>
    <div class="form-row">
      <div class="form-group"><label for="sf-germ-rate">Expected Germ. Rate (%)</label><input class="form-input" id="sf-germ-rate" name="expected_germination_rate" type="number" min="0" max="100"></div>
      <div class="form-group"><label for="sf-germ-days">Days to Germination</label><input class="form-input" id="sf-germ-days" name="days_to_germination" type="number" min="0" max="365"></div>
    </div>
    <div class="form-group"><label for="sf-notes">Notes</label><textarea class="form-input" id="sf-notes" name="notes" rows="2"></textarea></div>
    <div class="modal-actions"><button type="button" class="btn btn-secondary" id="cancelSeed">Cancel</button><button type="submit" class="btn btn-primary">Add Seed</button></div></form>`);
  document.getElementById('cancelSeed').addEventListener('click', closeModal);
  document.getElementById('seedForm').addEventListener('submit', async e => {
    e.preventDefault();
    const fd = new FormData(e.target);
    await API.createSeed({
      name: fd.get('name'), variety: fd.get('variety') || null, supplier: fd.get('supplier') || null,
      purchase_date: fd.get('purchase_date') ? new Date(fd.get('purchase_date')).toISOString() : null,
      purchase_price: fd.get('purchase_price') ? parseFloat(fd.get('purchase_price')) : null,
      quantity: parseInt(fd.get('quantity')) || 1, quantity_unit: fd.get('quantity_unit'),
      expected_germination_rate: fd.get('expected_germination_rate') ? parseInt(fd.get('expected_germination_rate')) : null,
      days_to_germination: fd.get('days_to_germination') ? parseInt(fd.get('days_to_germination')) : null,
      notes: fd.get('notes') || null
    });
    closeModal();
    toast('Seed added');
    state.seeds = await API.getSeeds().catch(() => state.seeds);
    renderPage();
  });
}

function showEditSeedModal(seed) {
  const purchaseDate = seed.purchase_date ? new Date(seed.purchase_date).toISOString().split('T')[0] : '';
  const suppliers = getUniqueSuppliers();
  showModal(`<h2 id="modalTitle">Edit Seed</h2><form id="seedForm">
    <div class="form-group"><label for="sf-name">Name <span class="required" aria-hidden="true">*</span></label><input class="form-input" id="sf-name" name="name" value="${esc(seed.name)}" required aria-required="true"></div>
    <div class="form-row">
      <div class="form-group"><label for="sf-variety">Variety</label><input class="form-input" id="sf-variety" name="variety" value="${esc(seed.variety || '')}"></div>
      <div class="form-group"><label for="sf-supplier">Supplier</label><input class="form-input" id="sf-supplier" name="supplier" value="${esc(seed.supplier || '')}" list="supplierList" autocomplete="off"><datalist id="supplierList">${suppliers.map(s => `<option value="${esc(s)}">`).join('')}</datalist></div>
    </div>
    <div class="form-row">
      <div class="form-group"><label for="sf-quantity">Quantity</label><input class="form-input" id="sf-quantity" name="quantity" type="number" min="0" value="${seed.quantity}"></div>
      <div class="form-group"><label for="sf-unit">Unit</label><select class="form-input" id="sf-unit" name="quantity_unit"><option value="packets" ${seed.quantity_unit === 'packets' ? 'selected' : ''}>Packets</option><option value="seeds" ${seed.quantity_unit === 'seeds' ? 'selected' : ''}>Seeds</option><option value="grams" ${seed.quantity_unit === 'grams' ? 'selected' : ''}>Grams</option></select></div>
    </div>
    <div class="form-row">
      <div class="form-group"><label for="sf-date">Purchase Date</label><input class="form-input" id="sf-date" name="purchase_date" type="date" value="${purchaseDate}"></div>
      <div class="form-group"><label for="sf-price">Price</label><input class="form-input" id="sf-price" name="purchase_price" type="number" step="0.01" min="0" value="${seed.purchase_price ?? ''}"></div>
    </div>
    <div class="form-row">
      <div class="form-group"><label for="sf-germ-rate">Expected Germ. Rate (%)</label><input class="form-input" id="sf-germ-rate" name="expected_germination_rate" type="number" min="0" max="100" value="${seed.expected_germination_rate ?? ''}"></div>
      <div class="form-group"><label for="sf-germ-days">Days to Germination</label><input class="form-input" id="sf-germ-days" name="days_to_germination" type="number" min="0" max="365" value="${seed.days_to_germination ?? ''}"></div>
    </div>
    <div class="form-group"><label for="sf-notes">Notes</label><textarea class="form-input" id="sf-notes" name="notes" rows="2">${esc(seed.notes || '')}</textarea></div>
    <div class="modal-actions"><button type="button" class="btn btn-secondary" id="cancelSeed">Cancel</button><button type="submit" class="btn btn-primary">Save Changes</button></div></form>`);
  document.getElementById('cancelSeed').addEventListener('click', closeModal);
  document.getElementById('seedForm').addEventListener('submit', async e => {
    e.preventDefault();
    const fd = new FormData(e.target);
    await API.updateSeed(seed.id, {
      name: fd.get('name'), variety: fd.get('variety') || null, supplier: fd.get('supplier') || null,
      purchase_date: fd.get('purchase_date') ? new Date(fd.get('purchase_date')).toISOString() : null,
      purchase_price: fd.get('purchase_price') ? parseFloat(fd.get('purchase_price')) : null,
      quantity: parseInt(fd.get('quantity')) || 1, quantity_unit: fd.get('quantity_unit'),
      expected_germination_rate: fd.get('expected_germination_rate') ? parseInt(fd.get('expected_germination_rate')) : null,
      days_to_germination: fd.get('days_to_germination') ? parseInt(fd.get('days_to_germination')) : null,
      notes: fd.get('notes') || null
    });
    closeModal();
    toast('Seed updated');
    state.seeds = await API.getSeeds().catch(() => state.seeds);
    renderPage();
  });
}

function getSeedName(seedId) {
  if (!seedId) return null;
  const seed = state.seeds.find(s => s.id === seedId);
  return seed ? seed.name : null;
}

// ============================================
// === SETTINGS
// ============================================
async function renderSettings(main) {
  const isDark = state.theme === 'dark';
  const isAdmin = state.user?.is_admin;
  let settings = {};
  try { settings = await API.getSettings(); } catch { /* ok */ }

  main.innerHTML = `
    <header class="page-header"><div><h1>Settings</h1></div>
      <button class="btn btn-secondary" type="button" id="logoutBtn">Sign Out</button></header>
    <div style="max-width:800px">
      <section aria-label="Account settings">
        <h2 class="section-heading">Account</h2>
        <div class="settings-item">
          <div><div class="settings-item-label">${esc(state.user?.display_name)}</div>
            <div class="settings-item-desc">@${esc(state.user?.username)} ${isAdmin ? '(Admin)' : ''}</div></div>
          <button class="btn btn-secondary btn-sm" type="button" id="changePasswordBtn">Change Password</button>
        </div>
      </section>

      <section aria-label="Preferences">
        <h2 class="section-heading">Preferences</h2>
        <div class="settings-item">
          <div><div class="settings-item-label">Dark Mode</div><div class="settings-item-desc">Toggle between light and dark theme</div></div>
          <button class="toggle ${isDark ? 'active' : ''}" type="button" id="themeToggle" role="switch" aria-checked="${isDark}" aria-label="Dark mode"></button>
        </div>
        ${isAdmin ? `
        <div class="settings-item">
          <div><div class="settings-item-label">Default Units</div><div class="settings-item-desc">${settings.default_units === 'imperial' ? 'Imperial (°F, in)' : 'Metric (°C, cm)'}</div></div>
          <button class="btn btn-secondary btn-sm" type="button" id="editUnitsBtn">Edit</button>
        </div>
        ` : ''}
      </section>

      <section aria-label="Garden management">
        <h2 class="section-heading">Garden Management</h2>
        <div id="settingsGardens"></div>
      </section>

      ${isAdmin ? `
      <section aria-label="Locations">
        <h2 class="section-heading">Locations</h2>
        <div style="margin-bottom:12px"><button class="btn btn-primary btn-sm" type="button" id="createLocationBtn">+ Add Location</button></div>
        <div id="locationsList"><p class="loading-text">Loading...</p></div>
      </section>

      <section aria-label="Garden types">
        <h2 class="section-heading">Garden Types</h2>
        <div id="settingsGardenTypes"><p class="loading-text">Loading...</p></div>
      </section>

      <section aria-label="User management">
        <h2 class="section-heading">User Management</h2>
        <div style="margin-bottom:12px"><button class="btn btn-primary btn-sm" type="button" id="createUserBtn">+ Create User</button></div>
        <div id="usersList"><p class="loading-text">Loading...</p></div>
      </section>

      <section aria-label="Devices">
        <h2 class="section-heading">Devices & Sensors</h2>
        <div style="margin-bottom:12px"><button class="btn btn-primary btn-sm" type="button" id="createDeviceBtn">+ Add Device</button></div>
        <div id="devicesList"><p class="loading-text">Loading...</p></div>
      </section>

      <section aria-label="Webhooks">
        <h2 class="section-heading">Webhooks</h2>
        <div style="margin-bottom:12px"><button class="btn btn-primary btn-sm" type="button" id="createWebhookBtn">+ Add Webhook</button></div>
        <div id="webhooksList"><p class="loading-text">Loading...</p></div>
      </section>

      <section aria-label="Audit log">
        <h2 class="section-heading">Audit Log</h2>
        <div class="card" style="padding:0;overflow-x:auto" id="auditContainer"><p style="padding:20px" class="loading-text">Loading...</p></div>
      </section>
      ` : ''}

      <section aria-label="About">
        <h2 class="section-heading">About</h2>
        <div class="settings-item"><div><div class="settings-item-label">CultiVue</div><div class="settings-item-desc">Version 2.0.0 — Garden Management System</div></div></div>
      </section>
    </div>`;

  // Event listeners
  document.getElementById('logoutBtn').addEventListener('click', doLogout);
  document.getElementById('changePasswordBtn').addEventListener('click', () => showChangePassword(false));
  document.getElementById('themeToggle').addEventListener('click', function() {
    const newTheme = state.theme === 'dark' ? 'light' : 'dark';
    applyTheme(newTheme);
    this.classList.toggle('active', newTheme === 'dark');
    this.setAttribute('aria-checked', String(newTheme === 'dark'));
  });

  // Gardens list
  const gardensEl = document.getElementById('settingsGardens');
  state.gardens.forEach(g => {
    const div = document.createElement('div');
    div.className = 'settings-item';
    div.innerHTML = `<div><div class="settings-item-label">${esc(g.name)}</div><div class="settings-item-desc">${esc(getGardenTypeDisplay(g))} — Started ${formatDate(g.start_date)}</div></div>
      <button class="btn btn-danger btn-sm" type="button" data-delete-garden="${g.id}">Delete</button>`;
    gardensEl.appendChild(div);
  });
  gardensEl.querySelectorAll('[data-delete-garden]').forEach(btn => {
    btn.addEventListener('click', () => deleteGarden(btn.dataset.deleteGarden));
  });

  // Admin sections
  if (isAdmin) {
    document.getElementById('createUserBtn').addEventListener('click', showCreateUserModal);
    document.getElementById('createLocationBtn').addEventListener('click', showCreateLocationModal);
    document.getElementById('editUnitsBtn')?.addEventListener('click', () => {
      const current = settings.default_units === 'imperial' ? 'imperial' : 'metric';
      const newUnits = current === 'metric' ? 'imperial' : 'metric';
      API.updateSetting('default_units', newUnits).then(() => { toast(`Units changed to ${newUnits}`); renderPage(); });
    });
    loadUsersPanel();
    loadAuditPanel();
    loadGardenTypesSettings();
    loadLocationsPanel();
    loadDevicesPanel();
    loadWebhooksPanel();
    document.getElementById('createDeviceBtn').addEventListener('click', showCreateDeviceModal);
    document.getElementById('createWebhookBtn').addEventListener('click', showCreateWebhookModal);
  }
}

async function loadGardenTypesSettings() {
  try {
    const types = await API.getGardenTypes();
    const el = document.getElementById('settingsGardenTypes');
    if (!el) return;
    const catNames = { hydroponic: 'Hydroponic', soil: 'Soil', container: 'Container', aquaponics: 'Aquaponics' };
    const categories = {};
    for (const t of types) { if (!categories[t.category]) categories[t.category] = []; categories[t.category].push(t); }

    el.innerHTML = Object.entries(categories).map(([cat, items]) => `
      <div class="settings-category">
        <h3 class="settings-category-title">${catNames[cat] || cat}</h3>
        ${items.map(t => `<div class="settings-item">
          <div><div class="settings-item-label">${esc(t.display_name)}</div></div>
          <button class="toggle ${t.is_enabled ? 'active' : ''}" type="button" role="switch" aria-checked="${t.is_enabled}" aria-label="Enable ${t.display_name}" data-toggle-type="${t.id}" data-enabled="${t.is_enabled}"></button>
        </div>`).join('')}
      </div>
    `).join('');

    // Note: Toggling garden types requires an admin API endpoint not yet implemented,
    // so these toggles are visual only for now. The wizard handles initial setup.
  } catch {
    const el = document.getElementById('settingsGardenTypes');
    if (el) el.innerHTML = '<p class="empty-text">Could not load garden types.</p>';
  }
}

async function loadUsersPanel() {
  try {
    const users = await API.getUsers();
    const el = document.getElementById('usersList');
    if (!el) return;
    el.innerHTML = users.map(u => `
      <div class="settings-item">
        <div>
          <div class="settings-item-label">${esc(u.display_name)} <span class="secondary-text">@${esc(u.username)}</span>
            ${u.is_admin ? '<span class="badge badge-purple">Admin</span>' : ''}
            ${!u.is_active ? '<span class="badge badge-red">Disabled</span>' : ''}
            ${u.must_change_password ? '<span class="badge badge-amber">Temp password</span>' : ''}</div>
          <div class="settings-item-desc">Created ${formatDate(u.created_at)}</div>
        </div>
        <div style="display:flex;gap:6px">
          <button class="btn btn-secondary btn-sm" type="button" data-reset-pw="${u.id}" data-username="${esc(u.username)}">Reset Password</button>
          ${u.id !== state.user.id ? `<button class="btn ${u.is_active ? 'btn-danger' : 'btn-primary'} btn-sm" type="button" data-toggle-user="${u.id}" data-active="${!u.is_active}">${u.is_active ? 'Disable' : 'Enable'}</button>` : ''}
        </div>
      </div>`).join('');

    el.querySelectorAll('[data-reset-pw]').forEach(btn => {
      btn.addEventListener('click', () => showResetPasswordModal(btn.dataset.resetPw, btn.dataset.username));
    });
    el.querySelectorAll('[data-toggle-user]').forEach(btn => {
      btn.addEventListener('click', async () => {
        const active = btn.dataset.active === 'true';
        if (!confirm(`Are you sure you want to ${active ? 'enable' : 'disable'} this user?`)) return;
        await API.setUserActive(btn.dataset.toggleUser, active);
        toast(`User ${active ? 'enabled' : 'disabled'}`);
        renderPage();
      });
    });
  } catch { /* ignore */ }
}

async function loadAuditPanel() {
  try {
    const logs = await API.getAuditLogs(50);
    const el = document.getElementById('auditContainer');
    if (!el) return;
    if (!logs.length) { el.innerHTML = '<p style="padding:20px" class="empty-text">No audit events yet.</p>'; return; }
    el.innerHTML = `<table class="audit-table"><thead><tr><th scope="col">Time</th><th scope="col">User</th><th scope="col">Action</th><th scope="col">Type</th><th scope="col">Details</th></tr></thead><tbody>
      ${logs.map(l => {
        const actionClass = ['create','update','delete','login','login_failed','register','setup'].includes(l.action) ? l.action : '';
        return `<tr><td style="white-space:nowrap">${formatDateTime(l.created_at)}</td><td>${esc(l.username)}</td>
          <td><span class="audit-action audit-action-${actionClass}">${esc(l.action)}</span></td>
          <td>${esc(l.entity_type)}</td><td style="max-width:300px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${esc(l.details || '')}</td></tr>`;
      }).join('')}</tbody></table>`;
  } catch { /* ignore */ }
}

// === Locations Panel ===
async function loadLocationsPanel() {
  const el = document.getElementById('locationsList');
  if (!el) return;
  try {
    const locations = await API.getLocations();
    state.locations = locations;
    if (!locations.length) { el.innerHTML = '<p class="empty-text">No locations yet.</p>'; return; }
    el.innerHTML = locations.map(l => `
      <div class="settings-item">
        <div>
          <div class="settings-item-label">${esc(l.name)} <span class="badge">${l.garden_count} garden${l.garden_count !== 1 ? 's' : ''}</span></div>
          ${l.description ? `<div class="settings-item-desc">${esc(l.description)}</div>` : ''}
        </div>
        <div style="display:flex;gap:6px">
          <button class="btn btn-secondary btn-sm" type="button" data-edit-location="${l.id}">Edit</button>
          <button class="btn btn-danger btn-sm" type="button" data-delete-location="${l.id}">Delete</button>
        </div>
      </div>`).join('');

    el.querySelectorAll('[data-edit-location]').forEach(btn => {
      btn.addEventListener('click', () => {
        const loc = locations.find(l => l.id === btn.dataset.editLocation);
        if (loc) showEditLocationModal(loc);
      });
    });
    el.querySelectorAll('[data-delete-location]').forEach(btn => {
      btn.addEventListener('click', async () => {
        if (!confirm('Delete this location? Gardens at this location will keep their data but lose the location assignment.')) return;
        await API.deleteLocation(btn.dataset.deleteLocation);
        toast('Location deleted');
        loadLocationsPanel();
      });
    });
  } catch { el.innerHTML = '<p class="empty-text">Could not load locations.</p>'; }
}

function showCreateLocationModal(fromLocationsPage) {
  const hasGardens = state.gardens.length > 0;
  const assignable = state.gardens.filter(g => !g.location_id);
  showModal(`<h2 id="modalTitle">Add Location</h2>
    <form id="locationForm">
      <div class="form-group"><label for="loc-name">Name <span class="required" aria-hidden="true">*</span></label><input class="form-input" id="loc-name" name="name" required maxlength="100" aria-required="true"></div>
      <div class="form-group"><label for="loc-desc">Description</label><textarea class="form-input" id="loc-desc" name="description" rows="2" maxlength="500"></textarea></div>
      ${hasGardens ? `<div class="form-group"><label>Assign Gardens</label><div class="tag-select" id="gardenTagSelect"></div>
        ${!assignable.length ? '<div class="form-hint">All gardens are already assigned to locations.</div>' : ''}
      </div>` : ''}
      <div class="form-group"><label for="loc-order">Sort Order</label><input class="form-input" id="loc-order" name="sort_order" type="number" min="0" value="0"></div>
      <div class="modal-actions"><button type="button" class="btn btn-secondary" id="cancelLoc">Cancel</button><button type="submit" class="btn btn-primary">Add Location</button></div>
    </form>`);

  let gardenSelect = { getSelected: () => [] };
  if (hasGardens) {
    const disabledIds = state.gardens.filter(g => g.location_id).map(g => g.id);
    gardenSelect = initTagSelect('gardenTagSelect', assignable, { placeholder: 'Search gardens...', labelKey: 'name', idKey: 'id' });
  }

  document.getElementById('cancelLoc').addEventListener('click', closeModal);
  document.getElementById('locationForm').addEventListener('submit', async e => {
    e.preventDefault();
    const fd = new FormData(e.target);
    const result = await API.createLocation({ name: fd.get('name'), description: fd.get('description') || null, sort_order: parseInt(fd.get('sort_order')) || 0 });
    const gardenIds = gardenSelect.getSelected();
    if (gardenIds.length && result.id) {
      await Promise.all(gardenIds.map(gId => {
        const g = state.gardens.find(garden => garden.id === gId);
        if (!g) return;
        return API.updateGarden(gId, { name: g.name, garden_type_id: g.garden_type_id, system_type: g.garden_type_id || g.system_type, plant_types: g.plant_types, is_active: g.is_active, location_id: result.id });
      }));
      await loadGardens();
    }
    closeModal();
    toast('Location created');
    if (fromLocationsPage) {
      state.locations = await API.getLocations().catch(() => state.locations);
      renderPage();
    } else {
      loadLocationsPanel();
    }
  });
}

function showEditLocationModal(location) {
  showModal(`<h2 id="modalTitle">Edit Location</h2>
    <form id="locationForm">
      <div class="form-group"><label for="loc-name">Name <span class="required" aria-hidden="true">*</span></label><input class="form-input" id="loc-name" name="name" value="${esc(location.name)}" required maxlength="100" aria-required="true"></div>
      <div class="form-group"><label for="loc-desc">Description</label><textarea class="form-input" id="loc-desc" name="description" rows="2" maxlength="500">${esc(location.description || '')}</textarea></div>
      <div class="form-group"><label for="loc-order">Sort Order</label><input class="form-input" id="loc-order" name="sort_order" type="number" min="0" value="${location.sort_order || 0}"></div>
      <div class="modal-actions"><button type="button" class="btn btn-secondary" id="cancelLoc">Cancel</button><button type="submit" class="btn btn-primary">Save Changes</button></div>
    </form>`);
  document.getElementById('cancelLoc').addEventListener('click', closeModal);
  document.getElementById('locationForm').addEventListener('submit', async e => {
    e.preventDefault();
    const fd = new FormData(e.target);
    await API.updateLocation(location.id, { name: fd.get('name'), description: fd.get('description') || null, sort_order: parseInt(fd.get('sort_order')) || 0 });
    closeModal();
    toast('Location updated');
    state.locations = await API.getLocations().catch(() => state.locations);
    if (state.currentPage === 'locations') renderPage();
    else loadLocationsPanel();
  });
}

// === Devices Panel ===
async function loadDevicesPanel() {
  const el = document.getElementById('devicesList');
  if (!el) return;
  try {
    const devices = await API.getDevices();
    if (!devices.length) { el.innerHTML = '<p class="empty-text">No devices registered yet.</p>'; return; }
    el.innerHTML = devices.map(d => `
      <div class="settings-item">
        <div>
          <div class="settings-item-label">${esc(d.name)} <span class="badge badge-${d.is_active ? 'green' : 'red'}">${d.is_active ? 'Active' : 'Inactive'}</span>
            <span class="badge">${esc(d.device_type)}</span></div>
          <div class="settings-item-desc">${d.description ? esc(d.description) + ' — ' : ''}${d.last_seen_at ? 'Last seen ' + formatDateTime(d.last_seen_at) : 'Never connected'}</div>
        </div>
        <div style="display:flex;gap:6px">
          <button class="btn btn-secondary btn-sm" type="button" data-device-keys="${d.id}" data-device-name="${esc(d.name)}">API Keys</button>
          <button class="btn btn-secondary btn-sm" type="button" data-device-readings="${d.id}" data-device-name="${esc(d.name)}">Readings</button>
          <button class="btn btn-danger btn-sm" type="button" data-delete-device="${d.id}">Delete</button>
        </div>
      </div>`).join('');

    el.querySelectorAll('[data-device-keys]').forEach(btn => {
      btn.addEventListener('click', () => showDeviceKeysModal(btn.dataset.deviceKeys, btn.dataset.deviceName));
    });
    el.querySelectorAll('[data-device-readings]').forEach(btn => {
      btn.addEventListener('click', () => showDeviceReadingsModal(btn.dataset.deviceReadings, btn.dataset.deviceName));
    });
    el.querySelectorAll('[data-delete-device]').forEach(btn => {
      btn.addEventListener('click', async () => {
        if (!confirm('Delete this device and all its data?')) return;
        await API.deleteDevice(btn.dataset.deleteDevice);
        toast('Device deleted');
        loadDevicesPanel();
      });
    });
  } catch { el.innerHTML = '<p class="empty-text">Could not load devices.</p>'; }
}

function showCreateDeviceModal() {
  showModal(`<h2 id="modalTitle">Add Device</h2>
    <div class="auth-error" id="modalError" role="alert"></div>
    <form id="createDeviceForm">
      <div class="form-group"><label for="dev-name">Device Name</label><input class="form-input" id="dev-name" name="name" required maxlength="100" aria-required="true"></div>
      <div class="form-group"><label for="dev-type">Type</label><select class="form-input" id="dev-type" name="device_type">
        <option value="sensor">Sensor</option><option value="controller">Controller</option><option value="gateway">Gateway</option></select></div>
      <div class="form-group"><label for="dev-garden">Garden (optional)</label><select class="form-input" id="dev-garden" name="garden_id">
        <option value="">None</option>${state.gardens.map(g => `<option value="${g.id}">${esc(g.name)}</option>`).join('')}</select></div>
      <div class="form-group"><label for="dev-desc">Description</label><input class="form-input" id="dev-desc" name="description" maxlength="500"></div>
      <div class="modal-actions"><button type="button" class="btn btn-secondary" id="cancelDev">Cancel</button><button type="submit" class="btn btn-primary">Add Device</button></div>
    </form>`);
  document.getElementById('cancelDev').addEventListener('click', closeModal);
  document.getElementById('createDeviceForm').addEventListener('submit', async e => {
    e.preventDefault();
    const fd = new FormData(e.target);
    try {
      const device = await API.createDevice({ name: fd.get('name'), device_type: fd.get('device_type'), garden_id: fd.get('garden_id') || null, description: fd.get('description') || null });
      closeModal();
      toast('Device created');
      // Immediately offer to create an API key
      const key = await API.createDeviceKey(device.id, 'default');
      showModal(`<h2 id="modalTitle">API Key Created</h2>
        <p>Save this key now — it will not be shown again.</p>
        <div class="form-group"><label>API Key</label><input class="form-input" value="${esc(key.raw_key)}" readonly id="apiKeyValue" style="font-family:monospace;font-size:12px"></div>
        <div class="modal-actions"><button type="button" class="btn btn-secondary" id="copyKey">Copy</button><button type="button" class="btn btn-primary" id="doneKey">Done</button></div>`);
      document.getElementById('copyKey').addEventListener('click', () => {
        navigator.clipboard.writeText(key.raw_key).then(() => toast('Copied to clipboard')).catch(() => { document.getElementById('apiKeyValue').select(); });
      });
      document.getElementById('doneKey').addEventListener('click', () => { closeModal(); loadDevicesPanel(); });
    } catch (err) {
      const errEl = document.getElementById('modalError');
      if (errEl) errEl.textContent = err.message || 'Failed to create device';
    }
  });
}

async function showDeviceKeysModal(deviceId, deviceName) {
  showModal(`<h2 id="modalTitle">API Keys — ${esc(deviceName)}</h2>
    <div id="keysContent"><p class="loading-text">Loading...</p></div>
    <div class="modal-actions"><button type="button" class="btn btn-primary btn-sm" id="addKeyBtn">+ New Key</button><button type="button" class="btn btn-secondary" id="closeKeys">Close</button></div>`);

  async function loadKeys() {
    const keys = await API.getDeviceKeys(deviceId);
    const el = document.getElementById('keysContent');
    if (!el) return;
    if (!keys.length) { el.innerHTML = '<p class="empty-text">No API keys.</p>'; return; }
    el.innerHTML = keys.map(k => `
      <div class="settings-item" style="padding:8px 0">
        <div><div class="settings-item-label" style="font-family:monospace">${esc(k.key_prefix)}... <span class="badge">${esc(k.label)}</span></div>
          <div class="settings-item-desc">${k.last_used_at ? 'Last used ' + formatDateTime(k.last_used_at) : 'Never used'}</div></div>
        <button class="btn btn-danger btn-sm" type="button" data-del-key="${k.id}">Revoke</button>
      </div>`).join('');
    el.querySelectorAll('[data-del-key]').forEach(btn => {
      btn.addEventListener('click', async () => {
        if (!confirm('Revoke this API key?')) return;
        await API.deleteDeviceKey(deviceId, btn.dataset.delKey);
        toast('Key revoked');
        loadKeys();
      });
    });
  }
  await loadKeys();

  document.getElementById('closeKeys').addEventListener('click', closeModal);
  document.getElementById('addKeyBtn').addEventListener('click', async () => {
    const label = prompt('Key label:', 'default');
    if (!label) return;
    const key = await API.createDeviceKey(deviceId, label);
    showModal(`<h2 id="modalTitle">New API Key</h2>
      <p>Save this key now — it will not be shown again.</p>
      <div class="form-group"><label>API Key</label><input class="form-input" value="${esc(key.raw_key)}" readonly id="apiKeyValue" style="font-family:monospace;font-size:12px"></div>
      <div class="modal-actions"><button type="button" class="btn btn-secondary" id="copyKey2">Copy</button><button type="button" class="btn btn-primary" id="doneKey2">Done</button></div>`);
    document.getElementById('copyKey2').addEventListener('click', () => {
      navigator.clipboard.writeText(key.raw_key).then(() => toast('Copied')).catch(() => { document.getElementById('apiKeyValue').select(); });
    });
    document.getElementById('doneKey2').addEventListener('click', () => { closeModal(); loadDevicesPanel(); });
  });
}

async function showDeviceReadingsModal(deviceId, deviceName) {
  showModal(`<h2 id="modalTitle">Readings — ${esc(deviceName)}</h2>
    <div id="readingsContent" style="max-height:400px;overflow-y:auto"><p class="loading-text">Loading...</p></div>
    <div class="modal-actions"><button type="button" class="btn btn-secondary" id="closeReadings">Close</button></div>`);

  try {
    const readings = await API.getSensorReadings(deviceId, 50);
    const el = document.getElementById('readingsContent');
    if (!el) return;
    if (!readings.length) { el.innerHTML = '<p class="empty-text">No readings yet.</p>'; return; }
    el.innerHTML = `<table class="audit-table"><thead><tr><th>Time</th><th>Metric</th><th>Value</th></tr></thead><tbody>
      ${readings.map(r => `<tr><td style="white-space:nowrap">${formatDateTime(r.recorded_at)}</td><td>${esc(r.metric_id)}</td><td>${r.value}</td></tr>`).join('')}
    </tbody></table>`;
  } catch { document.getElementById('readingsContent').innerHTML = '<p class="empty-text">Could not load readings.</p>'; }

  document.getElementById('closeReadings').addEventListener('click', closeModal);
}

// === Webhooks Panel ===
async function loadWebhooksPanel() {
  const el = document.getElementById('webhooksList');
  if (!el) return;
  try {
    const webhooks = await API.getWebhooks();
    if (!webhooks.length) { el.innerHTML = '<p class="empty-text">No webhooks configured.</p>'; return; }
    el.innerHTML = webhooks.map(w => `
      <div class="settings-item">
        <div>
          <div class="settings-item-label">${esc(w.name)} <span class="badge badge-${w.is_active ? 'green' : 'red'}">${w.is_active ? 'Active' : 'Inactive'}</span></div>
          <div class="settings-item-desc">${esc(w.url)} — Events: ${w.events.map(e => esc(e)).join(', ') || 'none'}</div>
        </div>
        <div style="display:flex;gap:6px">
          <button class="btn btn-secondary btn-sm" type="button" data-test-webhook="${w.id}">Test</button>
          <button class="btn btn-secondary btn-sm" type="button" data-webhook-logs="${w.id}" data-webhook-name="${esc(w.name)}">Logs</button>
          <button class="btn btn-danger btn-sm" type="button" data-delete-webhook="${w.id}">Delete</button>
        </div>
      </div>`).join('');

    el.querySelectorAll('[data-test-webhook]').forEach(btn => {
      btn.addEventListener('click', async () => {
        btn.disabled = true;
        try {
          const result = await API.testWebhook(btn.dataset.testWebhook);
          toast(result.success ? `Test OK (${result.status})` : `Test failed (${result.status}): ${result.body?.slice(0, 100)}`);
        } catch { toast('Test failed'); }
        btn.disabled = false;
      });
    });
    el.querySelectorAll('[data-webhook-logs]').forEach(btn => {
      btn.addEventListener('click', () => showWebhookLogsModal(btn.dataset.webhookLogs, btn.dataset.webhookName));
    });
    el.querySelectorAll('[data-delete-webhook]').forEach(btn => {
      btn.addEventListener('click', async () => {
        if (!confirm('Delete this webhook?')) return;
        await API.deleteWebhook(btn.dataset.deleteWebhook);
        toast('Webhook deleted');
        loadWebhooksPanel();
      });
    });
  } catch { el.innerHTML = '<p class="empty-text">Could not load webhooks.</p>'; }
}

function showCreateWebhookModal() {
  const events = ['sensor_reading', 'metric_alert', 'task_due', 'harvest'];
  showModal(`<h2 id="modalTitle">Add Webhook</h2>
    <div class="auth-error" id="modalError" role="alert"></div>
    <form id="createWebhookForm">
      <div class="form-group"><label for="wh-name">Name</label><input class="form-input" id="wh-name" name="name" required maxlength="100" aria-required="true"></div>
      <div class="form-group"><label for="wh-url">URL</label><input class="form-input" id="wh-url" name="url" type="url" required maxlength="2000" aria-required="true" placeholder="https://..."></div>
      <div class="form-group"><label for="wh-secret">Secret (optional, for HMAC signing)</label><input class="form-input" id="wh-secret" name="secret" maxlength="200"></div>
      <div class="form-group"><label>Events</label>
        ${events.map(e => `<label class="checkbox-label"><input type="checkbox" name="events" value="${e}"> ${e.replace(/_/g, ' ')}</label>`).join('')}
      </div>
      <div class="form-group"><label for="wh-retries">Retry Count</label><input class="form-input" id="wh-retries" name="retry_count" type="number" min="0" max="10" value="3"></div>
      <div class="modal-actions"><button type="button" class="btn btn-secondary" id="cancelWh">Cancel</button><button type="submit" class="btn btn-primary">Add Webhook</button></div>
    </form>`);
  document.getElementById('cancelWh').addEventListener('click', closeModal);
  document.getElementById('createWebhookForm').addEventListener('submit', async e => {
    e.preventDefault();
    const fd = new FormData(e.target);
    const selectedEvents = fd.getAll('events');
    try {
      await API.createWebhook({ name: fd.get('name'), url: fd.get('url'), secret: fd.get('secret') || null, events: selectedEvents, retry_count: parseInt(fd.get('retry_count')) || 3 });
      closeModal();
      toast('Webhook created');
      loadWebhooksPanel();
    } catch (err) {
      const errEl = document.getElementById('modalError');
      if (errEl) errEl.textContent = err.message || 'Failed to create webhook';
    }
  });
}

async function showWebhookLogsModal(webhookId, webhookName) {
  showModal(`<h2 id="modalTitle">Webhook Logs — ${esc(webhookName)}</h2>
    <div id="whLogsContent" style="max-height:400px;overflow-y:auto"><p class="loading-text">Loading...</p></div>
    <div class="modal-actions"><button type="button" class="btn btn-secondary" id="closeWhLogs">Close</button></div>`);

  try {
    const logs = await API.getWebhookLogs(webhookId);
    const el = document.getElementById('whLogsContent');
    if (!el) return;
    if (!logs.length) { el.innerHTML = '<p class="empty-text">No webhook logs yet.</p>'; return; }
    el.innerHTML = `<table class="audit-table"><thead><tr><th>Time</th><th>Event</th><th>Status</th><th>Result</th></tr></thead><tbody>
      ${logs.map(l => `<tr><td style="white-space:nowrap">${formatDateTime(l.attempted_at)}</td><td>${esc(l.event)}</td>
        <td>${l.response_status || '-'}</td>
        <td><span class="badge badge-${l.success ? 'green' : 'red'}">${l.success ? 'OK' : 'Failed'}</span></td></tr>`).join('')}
    </tbody></table>`;
  } catch { document.getElementById('whLogsContent').innerHTML = '<p class="empty-text">Could not load logs.</p>'; }

  document.getElementById('closeWhLogs').addEventListener('click', closeModal);
}

function showCreateUserModal() {
  showModal(`<h2 id="modalTitle">Create User Account</h2>
    <p class="wizard-desc">The user will be required to change their password on first login.</p>
    <div class="auth-error" id="modalError" role="alert"></div>
    <form id="createUserForm">
      <div class="form-group"><label for="cu-username">Username</label><input class="form-input" id="cu-username" name="username" required minlength="3" maxlength="30" pattern="[a-zA-Z0-9_.-]+" aria-required="true"></div>
      <div class="form-group"><label for="cu-display">Display Name</label><input class="form-input" id="cu-display" name="display_name" required maxlength="50" aria-required="true"></div>
      <div class="form-group"><label for="cu-password">Temporary Password</label><input class="form-input" id="cu-password" name="password" type="password" required minlength="8" aria-required="true">
        <div class="form-hint">Min 8 characters, at least 1 letter and 1 number</div></div>
      <div class="form-group"><label class="checkbox-label"><input type="checkbox" id="cu-admin" name="is_admin"> Admin privileges</label></div>
      <div class="modal-actions"><button type="button" class="btn btn-secondary" id="cancelUser">Cancel</button><button type="submit" class="btn btn-primary">Create User</button></div></form>`);
  document.getElementById('cancelUser').addEventListener('click', closeModal);
  document.getElementById('createUserForm').addEventListener('submit', async e => {
    e.preventDefault();
    const fd = new FormData(e.target);
    try {
      const result = await API.createUser({ username: fd.get('username'), display_name: fd.get('display_name'), password: fd.get('password'), is_admin: !!fd.get('is_admin') });
      if (result.error) { const el = document.getElementById('modalError'); el.textContent = result.error; el.classList.add('visible'); return; }
      closeModal();
      toast('User created');
      renderPage();
    } catch (err) { const el = document.getElementById('modalError'); el.textContent = 'Failed to create user'; el.classList.add('visible'); }
  });
}

function showResetPasswordModal(userId, username) {
  showModal(`<h2 id="modalTitle">Reset Password</h2>
    <p class="wizard-desc">Set a new temporary password for <strong>@${esc(username)}</strong>. They will be required to change it on next login.</p>
    <div class="auth-error" id="modalError" role="alert"></div>
    <form id="resetPasswordForm">
      <div class="form-group"><label for="rp-password">New Temporary Password</label><input class="form-input" id="rp-password" name="password" type="password" required minlength="8" aria-required="true">
        <div class="form-hint">Min 8 characters, at least 1 letter and 1 number</div></div>
      <div class="modal-actions"><button type="button" class="btn btn-secondary" id="cancelReset">Cancel</button><button type="submit" class="btn btn-primary">Reset Password</button></div></form>`);
  document.getElementById('cancelReset').addEventListener('click', closeModal);
  document.getElementById('resetPasswordForm').addEventListener('submit', async e => {
    e.preventDefault();
    const fd = new FormData(e.target);
    try {
      const result = await API.resetUserPassword(userId, fd.get('password'));
      if (result.error) { const el = document.getElementById('modalError'); el.textContent = result.error; el.classList.add('visible'); return; }
      closeModal();
      toast('Password reset');
      renderPage();
    } catch (err) { const el = document.getElementById('modalError'); el.textContent = 'Failed to reset password'; el.classList.add('visible'); }
  });
}

async function doLogout() {
  await API.logout();
  state.user = null;
  showAuth();
}
