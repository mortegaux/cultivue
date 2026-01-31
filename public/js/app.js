// === State ===
let state = {
  user: null,
  gardens: [],
  selectedGardenId: null,
  currentPage: 'dashboard',
  theme: localStorage.getItem('theme') || 'light',
  logsChart: null,
};

// === Init ===
document.addEventListener('DOMContentLoaded', async () => {
  applyTheme(state.theme);
  window._handleAuthError = () => showAuth();
  await checkAuth();
});

async function checkAuth() {
  try {
    const status = await API.authStatus();
    if (status.needs_setup) {
      showSetup();
      return;
    }
    const result = await API.me();
    if (result.user) {
      state.user = result.user;
      if (state.user.must_change_password) {
        showChangePassword(true);
        return;
      }
      enterApp();
    } else {
      showAuth();
    }
  } catch {
    showAuth();
  }
}

function enterApp() {
  document.getElementById('authScreen').hidden = true;
  document.getElementById('appLayout').hidden = false;
  setupNav();
  renderUserBadge();
  loadGardens().then(() => renderPage());
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
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/></svg>
        <span>HydroMate</span>
      </div>
      <h2>Sign in to your account</h2>
      <div class="auth-error" id="authError"></div>
      <form id="loginForm">
        <div class="form-group">
          <label>Username</label>
          <input class="form-input" name="username" autocomplete="username" required>
        </div>
        <div class="form-group">
          <label>Password</label>
          <input class="form-input" name="password" type="password" autocomplete="current-password" required>
        </div>
        <button class="btn btn-primary" type="submit" style="width:100%;justify-content:center;padding:12px">Sign In</button>
      </form>
    </div>
  `;
  document.getElementById('loginForm').onsubmit = async e => {
    e.preventDefault();
    const fd = new FormData(e.target);
    try {
      const result = await API.login(fd.get('username'), fd.get('password'));
      if (result.error) {
        showAuthError(result.error);
        return;
      }
      state.user = result.user;
      if (state.user.must_change_password) {
        showChangePassword(true);
      } else {
        enterApp();
      }
    } catch (err) {
      showAuthError('Login failed');
    }
  };
}

function showSetup() {
  document.getElementById('appLayout').hidden = true;
  const screen = document.getElementById('authScreen');
  screen.hidden = false;
  screen.innerHTML = `
    <div class="auth-card">
      <div class="brand">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/></svg>
        <span>HydroMate</span>
      </div>
      <h2>Create Admin Account</h2>
      <p style="text-align:center;color:var(--text-tertiary);font-size:0.85rem;margin-bottom:20px">Set up the first administrator account to get started.</p>
      <div class="auth-error" id="authError"></div>
      <form id="setupForm">
        <div class="form-group">
          <label>Username</label>
          <input class="form-input" name="username" autocomplete="username" required minlength="3" maxlength="30" pattern="[a-zA-Z0-9_.-]+">
        </div>
        <div class="form-group">
          <label>Display Name</label>
          <input class="form-input" name="display_name" required maxlength="50">
        </div>
        <div class="form-group">
          <label>Password (min 8 characters)</label>
          <input class="form-input" name="password" type="password" autocomplete="new-password" required minlength="8">
        </div>
        <div class="form-group">
          <label>Confirm Password</label>
          <input class="form-input" name="confirm" type="password" autocomplete="new-password" required>
        </div>
        <button class="btn btn-primary" type="submit" style="width:100%;justify-content:center;padding:12px">Create Admin Account</button>
      </form>
    </div>
  `;
  document.getElementById('setupForm').onsubmit = async e => {
    e.preventDefault();
    const fd = new FormData(e.target);
    if (fd.get('password') !== fd.get('confirm')) {
      showAuthError('Passwords do not match');
      return;
    }
    try {
      const result = await API.setup({
        username: fd.get('username'),
        display_name: fd.get('display_name'),
        password: fd.get('password'),
      });
      if (result.error) {
        showAuthError(result.error);
        return;
      }
      state.user = result.user;
      enterApp();
    } catch (err) {
      showAuthError('Setup failed');
    }
  };
}

function showChangePassword(forced) {
  document.getElementById('appLayout').hidden = true;
  const screen = document.getElementById('authScreen');
  screen.hidden = false;
  screen.innerHTML = `
    <div class="auth-card">
      <div class="brand">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/></svg>
        <span>HydroMate</span>
      </div>
      <h2>${forced ? 'Password Change Required' : 'Change Password'}</h2>
      ${forced ? '<p style="text-align:center;color:var(--text-tertiary);font-size:0.85rem;margin-bottom:20px">Your administrator has set a temporary password. Please choose a new password.</p>' : ''}
      <div class="auth-error" id="authError"></div>
      <form id="changePasswordForm">
        <div class="form-group">
          <label>${forced ? 'Temporary Password' : 'Current Password'}</label>
          <input class="form-input" name="current_password" type="password" required>
        </div>
        <div class="form-group">
          <label>New Password (min 8 characters)</label>
          <input class="form-input" name="new_password" type="password" autocomplete="new-password" required minlength="8">
        </div>
        <div class="form-group">
          <label>Confirm New Password</label>
          <input class="form-input" name="confirm" type="password" autocomplete="new-password" required>
        </div>
        <button class="btn btn-primary" type="submit" style="width:100%;justify-content:center;padding:12px">Set New Password</button>
      </form>
      ${!forced ? '<div class="auth-toggle"><a onclick="enterApp()">Cancel</a></div>' : ''}
    </div>
  `;
  document.getElementById('changePasswordForm').onsubmit = async e => {
    e.preventDefault();
    const fd = new FormData(e.target);
    if (fd.get('new_password') !== fd.get('confirm')) {
      showAuthError('Passwords do not match');
      return;
    }
    try {
      const result = await API.changePassword(fd.get('current_password'), fd.get('new_password'));
      if (result.error) {
        showAuthError(result.error);
        return;
      }
      state.user.must_change_password = false;
      enterApp();
    } catch (err) {
      showAuthError('Password change failed');
    }
  };
}

function showAuthError(msg) {
  const el = document.getElementById('authError');
  if (el) { el.textContent = msg; el.classList.add('visible'); }
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
      state.currentPage = link.dataset.page;
      document.querySelectorAll('.nav-link').forEach(l => l.classList.remove('active'));
      link.classList.add('active');
      renderPage();
    });
  });
}

function renderUserBadge() {
  const el = document.getElementById('userBadge');
  if (!el || !state.user) return;
  const initials = (state.user.display_name || state.user.username).slice(0, 2).toUpperCase();
  el.innerHTML = `
    <div class="user-badge">
      <div class="user-avatar">${esc(initials)}</div>
      <span style="flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${esc(state.user.display_name)}</span>
    </div>
  `;
}

async function loadGardens() {
  state.gardens = await API.getGardens();
  if (state.gardens.length && !state.selectedGardenId) {
    state.selectedGardenId = state.gardens[0].id;
  }
  renderGardenSelector();
}

function renderGardenSelector() {
  const el = document.getElementById('gardenSelector');
  if (!el) return;
  if (!state.gardens.length) {
    el.innerHTML = '<span style="color:var(--text-tertiary);font-size:0.85rem">No gardens yet</span>';
    return;
  }
  el.innerHTML = `<select onchange="selectGarden(this.value)">
    ${state.gardens.map(g => `<option value="${g.id}" ${g.id === state.selectedGardenId ? 'selected' : ''}>${esc(g.name)}</option>`).join('')}
  </select>`;
}

function selectGarden(id) { state.selectedGardenId = id; renderPage(); }
function getSelectedGarden() { return state.gardens.find(g => g.id === state.selectedGardenId); }

function renderPage() {
  const main = document.getElementById('mainContent');
  switch (state.currentPage) {
    case 'dashboard': renderDashboard(main); break;
    case 'logs': renderLogs(main); break;
    case 'tasks': renderTasks(main); break;
    case 'plants': renderPlants(main); break;
    case 'settings': renderSettings(main); break;
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
const PLANT_ICONS = { vegetables: '🥬', fruits: '🍅', herbs: '🌿', cannabis: '🌱', flowers: '🌸', other: '🌾' };

function showModal(html) {
  const backdrop = document.getElementById('modalBackdrop');
  document.getElementById('modal').innerHTML = html;
  backdrop.hidden = false;
  backdrop.onclick = e => { if (e.target === backdrop) closeModal(); };
}

function closeModal() { document.getElementById('modalBackdrop').hidden = true; }

// ============================================
// === DASHBOARD
// ============================================
async function renderDashboard(main) {
  main.innerHTML = `
    <div class="page-header">
      <div><p class="subtitle">${timeGreeting()}, ${esc(state.user?.display_name || '')}!</p><h1>My Gardens</h1></div>
      <button class="btn btn-primary" onclick="showCreateGardenModal()">+ New Garden</button>
    </div>
    <div id="dashboardContent"><p style="color:var(--text-tertiary)">Loading...</p></div>
  `;
  await loadGardens();
  const container = document.getElementById('dashboardContent');

  if (!state.gardens.length) {
    container.innerHTML = `<div class="empty-state">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/></svg>
      <h3>No gardens yet</h3><p>Create your first hydroponic garden to start tracking.</p>
      <button class="btn btn-primary" style="margin-top:16px" onclick="showCreateGardenModal()">Create Garden</button>
    </div>`;
    return;
  }

  const allStats = await Promise.all(state.gardens.map(g => API.getStats(g.id)));
  container.innerHTML = `<div class="grid-2" id="gardenGrid"></div>`;
  const grid = document.getElementById('gardenGrid');

  state.gardens.forEach((garden, i) => {
    const stats = allStats[i];
    const daysSince = daysAgo(garden.start_date);
    grid.innerHTML += `
      <div class="card garden-card" onclick="viewGardenDetail('${garden.id}')">
        <div class="garden-card-header">
          <h3>${esc(garden.name)}</h3>
          <span class="badge badge-green">${SYSTEM_TYPES[garden.system_type] || garden.system_type}</span>
        </div>
        <div class="grid-4" style="gap:12px">
          <div class="metric-card"><div class="metric-icon green">🌱</div><div><div class="metric-value">${stats.active_plants}</div><div class="metric-label">Plants</div></div></div>
          <div class="metric-card"><div class="metric-icon blue">📊</div><div><div class="metric-value">${stats.total_logs}</div><div class="metric-label">Logs</div></div></div>
          <div class="metric-card"><div class="metric-icon amber">📋</div><div><div class="metric-value">${stats.active_tasks}</div><div class="metric-label">Tasks</div></div></div>
          <div class="metric-card"><div class="metric-icon green">📅</div><div><div class="metric-value">${daysSince}d</div><div class="metric-label">Age</div></div></div>
        </div>
        ${stats.latest_log ? `<div style="display:flex;gap:16px;padding-top:8px;border-top:1px solid var(--border);font-size:0.85rem;color:var(--text-secondary)">
          <span>pH: <strong>${stats.latest_log.ph != null ? stats.latest_log.ph.toFixed(1) : '--'}</strong></span>
          <span>PPM: <strong>${stats.latest_log.ppm ?? '--'}</strong></span>
          <span>Temp: <strong>${stats.latest_log.water_temp != null ? stats.latest_log.water_temp.toFixed(1) + '°C' : '--'}</strong></span>
        </div>` : ''}
      </div>`;
  });
}

function viewGardenDetail(id) {
  state.selectedGardenId = id;
  renderGardenSelector();
  state.currentPage = 'logs';
  document.querySelectorAll('.nav-link').forEach(l => l.classList.toggle('active', l.dataset.page === 'logs'));
  renderPage();
}

function showCreateGardenModal() {
  showModal(`
    <h2>Create New Garden</h2>
    <form id="gardenForm">
      <div class="form-group"><label>Garden Name</label><input class="form-input" name="name" placeholder="My Hydro Setup" required></div>
      <div class="form-group"><label>System Type</label><select class="form-input" name="system_type" required>${Object.entries(SYSTEM_TYPES).map(([k,v]) => `<option value="${k}">${v}</option>`).join('')}</select></div>
      <div class="form-group"><label>Plant Types</label><div style="display:flex;flex-wrap:wrap;gap:8px">${PLANT_TYPES.map(t => `<label style="display:flex;align-items:center;gap:4px;cursor:pointer"><input type="checkbox" name="plant_types" value="${t}"> ${t.charAt(0).toUpperCase() + t.slice(1)}</label>`).join('')}</div></div>
      <div class="modal-actions"><button type="button" class="btn btn-secondary" onclick="closeModal()">Cancel</button><button type="submit" class="btn btn-primary">Create</button></div>
    </form>
  `);
  document.getElementById('gardenForm').onsubmit = async e => {
    e.preventDefault();
    const fd = new FormData(e.target);
    const plant_types = fd.getAll('plant_types');
    if (!plant_types.length) plant_types.push('other');
    await API.createGarden({ name: fd.get('name'), system_type: fd.get('system_type'), plant_types, start_date: new Date().toISOString() });
    closeModal(); await loadGardens(); renderPage();
  };
}

// ============================================
// === LOGS
// ============================================
async function renderLogs(main) {
  const garden = getSelectedGarden();
  if (!garden) { main.innerHTML = '<div class="empty-state"><h3>Select a garden first</h3><p>Create a garden from the Dashboard.</p></div>'; return; }

  main.innerHTML = `
    <div class="page-header"><div><p class="subtitle">${esc(garden.name)}</p><h1>Charts & Logs</h1></div>
      <button class="btn btn-primary" onclick="showAddLogModal()">+ Add Log</button></div>
    <div class="content-split"><div>
        <div class="metric-tabs">
          <button class="metric-tab active" data-metric="ph" onclick="switchMetric('ph', this)">pH</button>
          <button class="metric-tab" data-metric="ppm" onclick="switchMetric('ppm', this)">PPM</button>
          <button class="metric-tab" data-metric="temp" onclick="switchMetric('temp', this)">Temp</button>
        </div><div class="card"><div class="chart-container"><canvas id="logsChart"></canvas></div></div></div>
      <div><div class="card" style="padding:0">
          <div style="padding:16px 20px;border-bottom:1px solid var(--border);display:flex;justify-content:space-between;align-items:center"><h3>Recent Logs</h3><span id="logCount" style="color:var(--text-tertiary);font-size:0.85rem"></span></div>
          <div id="logsList" style="padding:0 20px;max-height:400px;overflow-y:auto"></div></div></div></div>`;

  const logs = await API.getLogs(garden.id);
  document.getElementById('logCount').textContent = `${logs.length} entries`;
  renderLogsChart(logs, 'ph');
  renderLogsList(logs);
}

let currentMetric = 'ph';
function switchMetric(metric, btn) {
  currentMetric = metric;
  document.querySelectorAll('.metric-tab').forEach(t => t.classList.remove('active'));
  btn.classList.add('active');
  const garden = getSelectedGarden();
  if (garden) API.getLogs(garden.id).then(logs => renderLogsChart(logs, metric));
}

function renderLogsChart(logs, metric) {
  const canvas = document.getElementById('logsChart');
  if (!canvas) return;
  if (state.logsChart) { state.logsChart.destroy(); state.logsChart = null; }

  const valid = logs.filter(l => metric === 'ph' ? l.ph != null : metric === 'ppm' ? l.ppm != null : l.water_temp != null).slice(0, 20).reverse();
  const colors = { ph: '#0ea5e9', ppm: '#10b981', temp: '#f59e0b' };
  const labels = { ph: 'pH', ppm: 'PPM', temp: 'Temperature (°C)' };

  state.logsChart = new Chart(canvas, {
    type: 'line',
    data: {
      labels: valid.map(l => new Date(l.timestamp).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })),
      datasets: [{ label: labels[metric], data: valid.map(l => metric === 'ph' ? l.ph : metric === 'ppm' ? l.ppm : l.water_temp),
        borderColor: colors[metric], backgroundColor: colors[metric] + '18', fill: true, tension: 0.3, pointRadius: 4, pointBackgroundColor: colors[metric] }]
    },
    options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } },
      scales: { x: { grid: { display: false } }, y: { grid: { color: 'rgba(0,0,0,0.05)' } } } }
  });
}

function renderLogsList(logs) {
  const el = document.getElementById('logsList');
  if (!logs.length) { el.innerHTML = '<div class="empty-state" style="padding:40px"><h3>No logs yet</h3><p>Add your first log entry.</p></div>'; return; }
  el.innerHTML = logs.slice(0, 30).map(log => `
    <div class="log-item">
      <div class="log-item-date">${formatDateTime(log.timestamp)}</div>
      <div class="log-item-value"><div class="val">${log.ph != null ? log.ph.toFixed(1) : '--'}</div><div class="label">pH</div></div>
      <div class="log-item-value"><div class="val">${log.ppm ?? '--'}</div><div class="label">PPM</div></div>
      <div class="log-item-value"><div class="val">${log.water_temp != null ? log.water_temp.toFixed(1) + '°' : '--'}</div><div class="label">Temp</div></div>
      <button class="btn-icon btn-sm" onclick="deleteLog('${log.id}')" title="Delete">🗑</button>
    </div>`).join('');
}

function showAddLogModal() {
  showModal(`<h2>Add Log Entry</h2><form id="logForm">
    <div class="form-row"><div class="form-group"><label>pH</label><input class="form-input" name="ph" type="number" step="0.1" min="0" max="14" placeholder="6.0"></div>
      <div class="form-group"><label>PPM</label><input class="form-input" name="ppm" type="number" step="1" min="0" placeholder="1000"></div>
      <div class="form-group"><label>Water Temp (°C)</label><input class="form-input" name="water_temp" type="number" step="0.1" placeholder="20.0"></div></div>
    <div class="form-group"><label>Nutrients</label><input class="form-input" name="nutrients" placeholder="e.g., General Hydroponics Flora series"></div>
    <div class="form-group"><label>Notes</label><textarea class="form-input" name="notes" rows="2" placeholder="Any observations..."></textarea></div>
    <div class="modal-actions"><button type="button" class="btn btn-secondary" onclick="closeModal()">Cancel</button><button type="submit" class="btn btn-primary">Save Log</button></div></form>`);
  document.getElementById('logForm').onsubmit = async e => {
    e.preventDefault(); const fd = new FormData(e.target);
    await API.createLog(state.selectedGardenId, { ph: fd.get('ph') ? parseFloat(fd.get('ph')) : null, ppm: fd.get('ppm') ? parseInt(fd.get('ppm')) : null, water_temp: fd.get('water_temp') ? parseFloat(fd.get('water_temp')) : null, nutrients: fd.get('nutrients') || null, notes: fd.get('notes') || null });
    closeModal(); renderPage();
  };
}

async function deleteLog(id) { if (!confirm('Delete this log entry?')) return; await API.deleteLog(id); renderPage(); }

// ============================================
// === TASKS
// ============================================
async function renderTasks(main) {
  const garden = getSelectedGarden();
  if (!garden) { main.innerHTML = '<div class="empty-state"><h3>Select a garden first</h3></div>'; return; }

  main.innerHTML = `<div class="page-header"><div><p class="subtitle">${esc(garden.name)}</p><h1>Tasks</h1></div>
    <button class="btn btn-primary" onclick="showAddTaskModal()">+ Add Task</button></div>
    <div class="tabs"><button class="tab active" data-tab="active" onclick="switchTaskTab('active', this)">Active</button>
      <button class="tab" data-tab="completed" onclick="switchTaskTab('completed', this)">Completed</button></div>
    <div id="tasksList"></div>`;

  const tasks = await API.getTasks(garden.id);
  window._tasks = tasks;
  renderTasksList(tasks, 'active');
}

function switchTaskTab(tab, btn) {
  document.querySelectorAll('.tabs .tab').forEach(t => t.classList.remove('active'));
  btn.classList.add('active');
  renderTasksList(window._tasks, tab);
}

function renderTasksList(tasks, tab) {
  const filtered = tasks.filter(t => tab === 'active' ? !t.is_completed : t.is_completed);
  const el = document.getElementById('tasksList');
  if (!filtered.length) { el.innerHTML = `<div class="empty-state"><h3>${tab === 'active' ? 'No active tasks' : 'No completed tasks'}</h3></div>`; return; }

  el.innerHTML = filtered.map(task => {
    const isOverdue = !task.is_completed && new Date(task.due_date) < new Date();
    return `<div class="task-item">
      <div class="task-checkbox ${task.is_completed ? 'checked' : ''}" onclick="toggleTask('${task.id}')"></div>
      <div class="task-content"><div class="task-title ${task.is_completed ? 'completed' : ''}">${esc(task.title)}</div>
        <div class="task-meta"><span><span class="priority-dot priority-${task.priority}"></span>${task.priority}</span>
          <span style="${isOverdue ? 'color:var(--error)' : ''}">${isOverdue ? 'Overdue: ' : ''}${formatDate(task.due_date)}</span>
          ${task.is_recurring ? '<span>🔁 Recurring</span>' : ''}</div></div>
      <div class="task-actions"><button class="btn-icon btn-sm" onclick="deleteTask('${task.id}')" title="Delete">🗑</button></div></div>`;
  }).join('');
}

async function toggleTask(id) { await API.toggleTask(id); renderPage(); }
async function deleteTask(id) { if (!confirm('Delete this task?')) return; await API.deleteTask(id); renderPage(); }

function showAddTaskModal() {
  const today = new Date().toISOString().split('T')[0];
  showModal(`<h2>Add New Task</h2><form id="taskForm">
    <div class="form-group"><label>Title</label><input class="form-input" name="title" placeholder="e.g., Water change" required></div>
    <div class="form-group"><label>Description</label><textarea class="form-input" name="description" rows="2" placeholder="Details..."></textarea></div>
    <div class="form-row"><div class="form-group"><label>Due Date</label><input class="form-input" name="due_date" type="date" value="${today}" required></div>
      <div class="form-group"><label>Priority</label><select class="form-input" name="priority"><option value="low">Low</option><option value="medium" selected>Medium</option><option value="high">High</option></select></div></div>
    <div class="form-group" style="display:flex;align-items:center;gap:12px"><label style="margin:0">Recurring</label><div class="toggle" id="recurringToggle" onclick="this.classList.toggle('active');document.getElementById('recurringDays').hidden=!this.classList.contains('active')"></div></div>
    <div class="form-group" id="recurringDays" hidden><label>Repeat every (days)</label><input class="form-input" name="recurring_days" type="number" min="1" value="7"></div>
    <div class="modal-actions"><button type="button" class="btn btn-secondary" onclick="closeModal()">Cancel</button><button type="submit" class="btn btn-primary">Add Task</button></div></form>`);
  document.getElementById('taskForm').onsubmit = async e => {
    e.preventDefault(); const fd = new FormData(e.target);
    const isRecurring = document.getElementById('recurringToggle').classList.contains('active');
    await API.createTask(state.selectedGardenId, { title: fd.get('title'), description: fd.get('description') || null, due_date: new Date(fd.get('due_date')).toISOString(), priority: fd.get('priority'), is_recurring: isRecurring, recurring_days: isRecurring ? parseInt(fd.get('recurring_days')) || 7 : null });
    closeModal(); renderPage();
  };
}

// ============================================
// === PLANTS
// ============================================
async function renderPlants(main) {
  const garden = getSelectedGarden();
  if (!garden) { main.innerHTML = '<div class="empty-state"><h3>Select a garden first</h3></div>'; return; }

  main.innerHTML = `<div class="page-header"><div><p class="subtitle">${esc(garden.name)}</p><h1>My Plants</h1></div>
    <div style="display:flex;gap:8px"><select class="form-input" id="stageFilter" onchange="filterPlants()" style="width:auto"><option value="">All Stages</option>${GROWTH_STAGES.map(s => `<option value="${s}">${s.charAt(0).toUpperCase() + s.slice(1)}</option>`).join('')}</select>
    <button class="btn btn-primary" onclick="showAddPlantModal()">+ Add Plant</button></div></div><div id="plantsList"></div>`;

  const plants = await API.getPlants(garden.id);
  window._plants = plants;
  renderPlantsList(plants);
}

function filterPlants() {
  const stage = document.getElementById('stageFilter').value;
  renderPlantsList(stage ? window._plants.filter(p => p.current_stage === stage) : window._plants);
}

function renderPlantsList(plants) {
  const el = document.getElementById('plantsList');
  const active = plants.filter(p => p.is_active);
  if (!active.length) { el.innerHTML = '<div class="empty-state"><h3>No plants yet</h3><p>Add your first plant to start tracking.</p></div>'; return; }

  el.innerHTML = `<div class="grid-2">${active.map(plant => {
    const age = daysAgo(plant.seeded_date || plant.created_at);
    const ageStr = age < 7 ? `${age}d` : age < 30 ? `${Math.floor(age/7)}w` : `${Math.floor(age/30)}mo`;
    return `<div class="card plant-card" onclick="showPlantDetail('${plant.id}')">
      <div class="plant-avatar">${PLANT_ICONS[plant.plant_type] || '🌱'}</div>
      <div class="plant-info"><h3>${esc(plant.name)}</h3><div class="species">${esc(plant.species)}</div>
        <div class="plant-badges"><span class="badge badge-${STAGE_COLORS[plant.current_stage] || 'gray'}">${plant.current_stage}</span><span class="badge badge-gray">${ageStr} old</span></div></div></div>`;
  }).join('')}</div>`;
}

function showPlantDetail(id) {
  const plant = window._plants.find(p => p.id === id);
  if (!plant) return;
  showModal(`<h2>${esc(plant.name)}</h2>
    <div style="margin-bottom:16px;display:flex;gap:8px"><span class="badge badge-${STAGE_COLORS[plant.current_stage] || 'gray'}">${plant.current_stage}</span><span class="badge badge-gray">${esc(plant.plant_type)}</span></div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:16px">
      <div><div style="font-size:0.8rem;color:var(--text-tertiary)">Species</div><div style="font-weight:600">${esc(plant.species)}</div></div>
      <div><div style="font-size:0.8rem;color:var(--text-tertiary)">Seeded</div><div style="font-weight:600">${formatDate(plant.seeded_date)}</div></div>
      <div><div style="font-size:0.8rem;color:var(--text-tertiary)">Initial pH</div><div style="font-weight:600">${plant.initial_ph ?? '--'}</div></div>
      <div><div style="font-size:0.8rem;color:var(--text-tertiary)">Initial PPM</div><div style="font-weight:600">${plant.initial_ppm ?? '--'}</div></div></div>
    ${plant.notes ? `<div style="padding:12px;background:var(--bg-hover);border-radius:8px;font-size:0.9rem;margin-bottom:16px">${esc(plant.notes)}</div>` : ''}
    <div class="form-group"><label>Update Growth Stage</label><select class="form-input" id="updateStage">${GROWTH_STAGES.map(s => `<option value="${s}" ${s === plant.current_stage ? 'selected' : ''}>${s.charAt(0).toUpperCase() + s.slice(1)}</option>`).join('')}</select></div>
    <div class="modal-actions"><button class="btn btn-danger btn-sm" onclick="deletePlant('${plant.id}')">Delete</button><button class="btn btn-secondary" onclick="closeModal()">Cancel</button><button class="btn btn-primary" onclick="updatePlantStage('${plant.id}')">Update</button></div>`);
}

async function updatePlantStage(id) {
  const plant = window._plants.find(p => p.id === id);
  const stage = document.getElementById('updateStage').value;
  await API.updatePlant(id, { ...plant, current_stage: stage, is_active: stage !== 'harvest' || plant.is_active });
  closeModal(); renderPage();
}

async function deletePlant(id) { if (!confirm('Delete this plant?')) return; await API.deletePlant(id); closeModal(); renderPage(); }

function showAddPlantModal() {
  showModal(`<h2>Add New Plant</h2><form id="plantForm">
    <div class="form-group"><label>Plant Name</label><input class="form-input" name="name" placeholder="e.g., Tomato Plant #1" required></div>
    <div class="form-row"><div class="form-group"><label>Plant Type</label><select class="form-input" name="plant_type" required>${PLANT_TYPES.map(t => `<option value="${t}">${t.charAt(0).toUpperCase() + t.slice(1)}</option>`).join('')}</select></div>
      <div class="form-group"><label>Species</label><input class="form-input" name="species" placeholder="e.g., Cherry Tomato" required></div></div>
    <div class="form-row"><div class="form-group"><label>Seeded Date</label><input class="form-input" name="seeded_date" type="date" value="${new Date().toISOString().split('T')[0]}"></div>
      <div class="form-group"><label>Growth Stage</label><select class="form-input" name="current_stage">${GROWTH_STAGES.map(s => `<option value="${s}">${s.charAt(0).toUpperCase() + s.slice(1)}</option>`).join('')}</select></div></div>
    <div class="form-row"><div class="form-group"><label>Initial pH</label><input class="form-input" name="initial_ph" type="number" step="0.1" placeholder="6.0"></div>
      <div class="form-group"><label>Initial PPM</label><input class="form-input" name="initial_ppm" type="number" placeholder="800"></div></div>
    <div class="form-group"><label>Notes</label><textarea class="form-input" name="notes" rows="2" placeholder="Any notes..."></textarea></div>
    <div class="modal-actions"><button type="button" class="btn btn-secondary" onclick="closeModal()">Cancel</button><button type="submit" class="btn btn-primary">Add Plant</button></div></form>`);
  document.getElementById('plantForm').onsubmit = async e => {
    e.preventDefault(); const fd = new FormData(e.target);
    await API.createPlant(state.selectedGardenId, { name: fd.get('name'), plant_type: fd.get('plant_type'), species: fd.get('species'), seeded_date: fd.get('seeded_date') ? new Date(fd.get('seeded_date')).toISOString() : null, current_stage: fd.get('current_stage'), initial_ph: fd.get('initial_ph') ? parseFloat(fd.get('initial_ph')) : null, initial_ppm: fd.get('initial_ppm') ? parseInt(fd.get('initial_ppm')) : null, notes: fd.get('notes') || null });
    closeModal(); renderPage();
  };
}

// ============================================
// === SETTINGS
// ============================================
async function renderSettings(main) {
  const isDark = state.theme === 'dark';
  const isAdmin = state.user?.is_admin;

  main.innerHTML = `
    <div class="page-header"><div><h1>Settings</h1></div>
      <button class="btn btn-secondary" onclick="doLogout()">Sign Out</button></div>
    <div style="max-width:800px">
      <h3 style="margin-bottom:12px;color:var(--text-secondary)">Account</h3>
      <div class="settings-item">
        <div><div class="settings-item-label">${esc(state.user?.display_name)}</div>
          <div class="settings-item-desc">@${esc(state.user?.username)} ${isAdmin ? '(Admin)' : ''}</div></div>
        <button class="btn btn-secondary btn-sm" onclick="showChangePassword(false)">Change Password</button>
      </div>

      <h3 style="margin:24px 0 12px;color:var(--text-secondary)">Preferences</h3>
      <div class="settings-item">
        <div><div class="settings-item-label">Dark Mode</div><div class="settings-item-desc">Toggle between light and dark theme</div></div>
        <div class="toggle ${isDark ? 'active' : ''}" onclick="toggleTheme()"></div>
      </div>

      <h3 style="margin:24px 0 12px;color:var(--text-secondary)">Garden Management</h3>
      <div id="settingsGardens"></div>

      ${isAdmin ? `
      <h3 style="margin:24px 0 12px;color:var(--text-secondary)">User Management</h3>
      <div style="margin-bottom:12px"><button class="btn btn-primary btn-sm" onclick="showCreateUserModal()">+ Create User</button></div>
      <div id="usersList"><p style="color:var(--text-tertiary)">Loading...</p></div>

      <h3 style="margin:24px 0 12px;color:var(--text-secondary)">Audit Log</h3>
      <div class="card" style="padding:0;overflow-x:auto" id="auditContainer"><p style="padding:20px;color:var(--text-tertiary)">Loading...</p></div>
      ` : ''}

      <h3 style="margin:24px 0 12px;color:var(--text-secondary)">About</h3>
      <div class="settings-item"><div><div class="settings-item-label">HydroMate</div><div class="settings-item-desc">Version 1.0.0 — Hydroponic Garden Management</div></div></div>
    </div>`;

  // Gardens list
  const gardensEl = document.getElementById('settingsGardens');
  state.gardens.forEach(g => {
    gardensEl.innerHTML += `<div class="settings-item"><div><div class="settings-item-label">${esc(g.name)}</div><div class="settings-item-desc">${SYSTEM_TYPES[g.system_type] || g.system_type} — Started ${formatDate(g.start_date)}</div></div>
      <button class="btn btn-danger btn-sm" onclick="deleteGarden('${g.id}')">Delete</button></div>`;
  });

  // Admin sections
  if (isAdmin) {
    loadUsersPanel();
    loadAuditPanel();
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
          <div class="settings-item-label">${esc(u.display_name)} <span style="color:var(--text-tertiary);font-weight:400">@${esc(u.username)}</span>
            ${u.is_admin ? '<span class="badge badge-purple" style="margin-left:6px">Admin</span>' : ''}
            ${!u.is_active ? '<span class="badge badge-red" style="margin-left:6px">Disabled</span>' : ''}
            ${u.must_change_password ? '<span class="badge badge-amber" style="margin-left:6px">Temp password</span>' : ''}</div>
          <div class="settings-item-desc">Created ${formatDate(u.created_at)}</div>
        </div>
        <div style="display:flex;gap:6px">
          <button class="btn btn-secondary btn-sm" onclick="showResetPasswordModal('${u.id}', '${esc(u.username)}')">Reset Password</button>
          ${u.id !== state.user.id ? `<button class="btn ${u.is_active ? 'btn-danger' : 'btn-primary'} btn-sm" onclick="toggleUserActive('${u.id}', ${!u.is_active})">${u.is_active ? 'Disable' : 'Enable'}</button>` : ''}
        </div>
      </div>`).join('');
  } catch { /* ignore if not admin */ }
}

async function loadAuditPanel() {
  try {
    const logs = await API.getAuditLogs(50);
    const el = document.getElementById('auditContainer');
    if (!el) return;
    if (!logs.length) { el.innerHTML = '<p style="padding:20px;color:var(--text-tertiary)">No audit events yet.</p>'; return; }
    el.innerHTML = `<table class="audit-table"><thead><tr><th>Time</th><th>User</th><th>Action</th><th>Type</th><th>Details</th></tr></thead><tbody>
      ${logs.map(l => {
        const actionClass = ['create','update','delete','login','register','setup'].includes(l.action) ? l.action : '';
        return `<tr><td style="white-space:nowrap">${formatDateTime(l.created_at)}</td><td>${esc(l.username)}</td>
          <td><span class="audit-action audit-action-${actionClass}">${esc(l.action)}</span></td>
          <td>${esc(l.entity_type)}</td><td style="max-width:300px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${esc(l.details || '')}</td></tr>`;
      }).join('')}</tbody></table>`;
  } catch { /* ignore */ }
}

function showCreateUserModal() {
  showModal(`<h2>Create User Account</h2>
    <p style="color:var(--text-tertiary);font-size:0.85rem;margin-bottom:16px">The user will be required to change their password on first login.</p>
    <div class="auth-error" id="modalError"></div>
    <form id="createUserForm">
      <div class="form-group"><label>Username</label><input class="form-input" name="username" required minlength="3" maxlength="30" pattern="[a-zA-Z0-9_.-]+"></div>
      <div class="form-group"><label>Display Name</label><input class="form-input" name="display_name" required maxlength="50"></div>
      <div class="form-group"><label>Temporary Password (min 8 characters)</label><input class="form-input" name="password" type="password" required minlength="8"></div>
      <div class="form-group" style="display:flex;align-items:center;gap:12px"><label style="margin:0">Admin privileges</label>
        <div class="toggle" id="adminToggle" onclick="this.classList.toggle('active')"></div></div>
      <div class="modal-actions"><button type="button" class="btn btn-secondary" onclick="closeModal()">Cancel</button><button type="submit" class="btn btn-primary">Create User</button></div></form>`);
  document.getElementById('createUserForm').onsubmit = async e => {
    e.preventDefault(); const fd = new FormData(e.target);
    const isAdmin = document.getElementById('adminToggle').classList.contains('active');
    try {
      const result = await API.createUser({ username: fd.get('username'), display_name: fd.get('display_name'), password: fd.get('password'), is_admin: isAdmin });
      if (result.error) { const el = document.getElementById('modalError'); el.textContent = result.error; el.classList.add('visible'); return; }
      closeModal(); renderPage();
    } catch (err) { const el = document.getElementById('modalError'); el.textContent = 'Failed to create user'; el.classList.add('visible'); }
  };
}

function showResetPasswordModal(userId, username) {
  showModal(`<h2>Reset Password</h2>
    <p style="color:var(--text-tertiary);font-size:0.85rem;margin-bottom:16px">Set a new temporary password for <strong>@${esc(username)}</strong>. They will be required to change it on next login.</p>
    <div class="auth-error" id="modalError"></div>
    <form id="resetPasswordForm">
      <div class="form-group"><label>New Temporary Password (min 8 characters)</label><input class="form-input" name="password" type="password" required minlength="8"></div>
      <div class="modal-actions"><button type="button" class="btn btn-secondary" onclick="closeModal()">Cancel</button><button type="submit" class="btn btn-primary">Reset Password</button></div></form>`);
  document.getElementById('resetPasswordForm').onsubmit = async e => {
    e.preventDefault(); const fd = new FormData(e.target);
    try {
      const result = await API.resetUserPassword(userId, fd.get('password'));
      if (result.error) { const el = document.getElementById('modalError'); el.textContent = result.error; el.classList.add('visible'); return; }
      closeModal(); renderPage();
    } catch (err) { const el = document.getElementById('modalError'); el.textContent = 'Failed to reset password'; el.classList.add('visible'); }
  };
}

async function toggleUserActive(id, active) {
  const action = active ? 'enable' : 'disable';
  if (!confirm(`Are you sure you want to ${action} this user?`)) return;
  await API.setUserActive(id, active);
  renderPage();
}

function toggleTheme() { applyTheme(state.theme === 'dark' ? 'light' : 'dark'); renderPage(); }

async function deleteGarden(id) {
  if (!confirm('Delete this garden? All associated data will be lost.')) return;
  await API.deleteGarden(id);
  if (state.selectedGardenId === id) state.selectedGardenId = null;
  await loadGardens(); renderPage();
}

async function doLogout() {
  await API.logout();
  state.user = null;
  showAuth();
}
