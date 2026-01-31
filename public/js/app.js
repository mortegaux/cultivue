// === State ===
let state = {
  gardens: [],
  selectedGardenId: null,
  currentPage: 'dashboard',
  theme: localStorage.getItem('theme') || 'light',
  logsChart: null,
};

// === Init ===
document.addEventListener('DOMContentLoaded', async () => {
  applyTheme(state.theme);
  setupNav();
  await loadGardens();
  renderPage();
});

function applyTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme);
  state.theme = theme;
  localStorage.setItem('theme', theme);
}

function setupNav() {
  document.querySelectorAll('.nav-link').forEach(link => {
    link.addEventListener('click', e => {
      e.preventDefault();
      const page = link.dataset.page;
      state.currentPage = page;
      document.querySelectorAll('.nav-link').forEach(l => l.classList.remove('active'));
      link.classList.add('active');
      renderPage();
    });
  });
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
  if (!state.gardens.length) {
    el.innerHTML = '<span style="color:var(--text-tertiary);font-size:0.85rem">No gardens yet</span>';
    return;
  }
  el.innerHTML = `<select onchange="selectGarden(this.value)">
    ${state.gardens.map(g => `<option value="${g.id}" ${g.id === state.selectedGardenId ? 'selected' : ''}>${esc(g.name)}</option>`).join('')}
  </select>`;
}

function selectGarden(id) {
  state.selectedGardenId = id;
  renderPage();
}

function getSelectedGarden() {
  return state.gardens.find(g => g.id === state.selectedGardenId);
}

// === Render Router ===
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
  const d = new Date(iso);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function formatDateTime(iso) {
  if (!iso) return '--';
  const d = new Date(iso);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' });
}

function timeGreeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}

function daysAgo(iso) {
  return Math.floor((Date.now() - new Date(iso).getTime()) / 86400000);
}

const SYSTEM_TYPES = {
  dwc: 'Deep Water Culture (DWC)', kratky: 'Kratky', nft: 'NFT (Nutrient Film Technique)',
  ebbAndFlow: 'Ebb & Flow', aeroponics: 'Aeroponics', drip: 'Drip System'
};

const PLANT_TYPES = ['vegetables', 'fruits', 'herbs', 'cannabis', 'flowers', 'other'];
const GROWTH_STAGES = ['seed', 'germination', 'seedling', 'vegetative', 'flowering', 'fruiting', 'harvest'];

const STAGE_COLORS = {
  seed: 'gray', germination: 'purple', seedling: 'blue', vegetative: 'green',
  flowering: 'amber', fruiting: 'red', harvest: 'green'
};

const PLANT_ICONS = {
  vegetables: '🥬', fruits: '🍅', herbs: '🌿', cannabis: '🌱', flowers: '🌸', other: '🌾'
};

// === Modal ===
function showModal(html) {
  const backdrop = document.getElementById('modalBackdrop');
  const modal = document.getElementById('modal');
  modal.innerHTML = html;
  backdrop.hidden = false;
  backdrop.onclick = e => { if (e.target === backdrop) closeModal(); };
}

function closeModal() {
  document.getElementById('modalBackdrop').hidden = true;
}

// ============================================
// === DASHBOARD PAGE
// ============================================
async function renderDashboard(main) {
  main.innerHTML = `
    <div class="page-header">
      <div>
        <p class="subtitle">${timeGreeting()}!</p>
        <h1>My Gardens</h1>
      </div>
      <button class="btn btn-primary" onclick="showCreateGardenModal()">+ New Garden</button>
    </div>
    <div id="dashboardContent"><p style="color:var(--text-tertiary)">Loading...</p></div>
  `;

  await loadGardens();
  const container = document.getElementById('dashboardContent');

  if (!state.gardens.length) {
    container.innerHTML = `
      <div class="empty-state">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/></svg>
        <h3>No gardens yet</h3>
        <p>Create your first hydroponic garden to start tracking.</p>
        <button class="btn btn-primary" style="margin-top:16px" onclick="showCreateGardenModal()">Create Garden</button>
      </div>
    `;
    return;
  }

  // Load stats for each garden
  const statsPromises = state.gardens.map(g => API.getStats(g.id));
  const allStats = await Promise.all(statsPromises);

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
          <div class="metric-card">
            <div class="metric-icon green">🌱</div>
            <div><div class="metric-value">${stats.active_plants}</div><div class="metric-label">Plants</div></div>
          </div>
          <div class="metric-card">
            <div class="metric-icon blue">📊</div>
            <div><div class="metric-value">${stats.total_logs}</div><div class="metric-label">Logs</div></div>
          </div>
          <div class="metric-card">
            <div class="metric-icon amber">📋</div>
            <div><div class="metric-value">${stats.active_tasks}</div><div class="metric-label">Tasks</div></div>
          </div>
          <div class="metric-card">
            <div class="metric-icon green">📅</div>
            <div><div class="metric-value">${daysSince}d</div><div class="metric-label">Age</div></div>
          </div>
        </div>
        ${stats.latest_log ? `
        <div style="display:flex;gap:16px;padding-top:8px;border-top:1px solid var(--border);font-size:0.85rem;color:var(--text-secondary)">
          <span>pH: <strong>${stats.latest_log.ph != null ? stats.latest_log.ph.toFixed(1) : '--'}</strong></span>
          <span>PPM: <strong>${stats.latest_log.ppm ?? '--'}</strong></span>
          <span>Temp: <strong>${stats.latest_log.water_temp != null ? stats.latest_log.water_temp.toFixed(1) + '°C' : '--'}</strong></span>
        </div>` : ''}
      </div>
    `;
  });
}

function viewGardenDetail(id) {
  state.selectedGardenId = id;
  renderGardenSelector();
  state.currentPage = 'logs';
  document.querySelectorAll('.nav-link').forEach(l => {
    l.classList.toggle('active', l.dataset.page === 'logs');
  });
  renderPage();
}

function showCreateGardenModal() {
  showModal(`
    <h2>Create New Garden</h2>
    <form id="gardenForm">
      <div class="form-group">
        <label>Garden Name</label>
        <input class="form-input" name="name" placeholder="My Hydro Setup" required>
      </div>
      <div class="form-group">
        <label>System Type</label>
        <select class="form-input" name="system_type" required>
          ${Object.entries(SYSTEM_TYPES).map(([k,v]) => `<option value="${k}">${v}</option>`).join('')}
        </select>
      </div>
      <div class="form-group">
        <label>Plant Types</label>
        <div style="display:flex;flex-wrap:wrap;gap:8px">
          ${PLANT_TYPES.map(t => `<label style="display:flex;align-items:center;gap:4px;cursor:pointer">
            <input type="checkbox" name="plant_types" value="${t}"> ${t.charAt(0).toUpperCase() + t.slice(1)}
          </label>`).join('')}
        </div>
      </div>
      <div class="modal-actions">
        <button type="button" class="btn btn-secondary" onclick="closeModal()">Cancel</button>
        <button type="submit" class="btn btn-primary">Create</button>
      </div>
    </form>
  `);

  document.getElementById('gardenForm').onsubmit = async e => {
    e.preventDefault();
    const fd = new FormData(e.target);
    const plant_types = fd.getAll('plant_types');
    if (!plant_types.length) plant_types.push('other');
    await API.createGarden({
      name: fd.get('name'),
      system_type: fd.get('system_type'),
      plant_types,
      start_date: new Date().toISOString()
    });
    closeModal();
    await loadGardens();
    renderPage();
  };
}

// ============================================
// === LOGS PAGE
// ============================================
async function renderLogs(main) {
  const garden = getSelectedGarden();
  if (!garden) {
    main.innerHTML = '<div class="empty-state"><h3>Select a garden first</h3><p>Create a garden from the Dashboard.</p></div>';
    return;
  }

  main.innerHTML = `
    <div class="page-header">
      <div>
        <p class="subtitle">${esc(garden.name)}</p>
        <h1>Charts & Logs</h1>
      </div>
      <button class="btn btn-primary" onclick="showAddLogModal()">+ Add Log</button>
    </div>
    <div class="content-split">
      <div>
        <div class="metric-tabs">
          <button class="metric-tab active" data-metric="ph" onclick="switchMetric('ph', this)">pH</button>
          <button class="metric-tab" data-metric="ppm" onclick="switchMetric('ppm', this)">PPM</button>
          <button class="metric-tab" data-metric="temp" onclick="switchMetric('temp', this)">Temp</button>
        </div>
        <div class="card">
          <div class="chart-container"><canvas id="logsChart"></canvas></div>
        </div>
      </div>
      <div>
        <div class="card" style="padding:0">
          <div style="padding:16px 20px;border-bottom:1px solid var(--border);display:flex;justify-content:space-between;align-items:center">
            <h3>Recent Logs</h3>
            <span id="logCount" style="color:var(--text-tertiary);font-size:0.85rem"></span>
          </div>
          <div id="logsList" style="padding:0 20px; max-height:400px; overflow-y:auto"></div>
        </div>
      </div>
    </div>
  `;

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
  // Re-fetch and render
  const garden = getSelectedGarden();
  if (garden) {
    API.getLogs(garden.id).then(logs => renderLogsChart(logs, metric));
  }
}

function renderLogsChart(logs, metric) {
  const canvas = document.getElementById('logsChart');
  if (!canvas) return;

  if (state.logsChart) { state.logsChart.destroy(); state.logsChart = null; }

  const valid = logs.filter(l => {
    if (metric === 'ph') return l.ph != null;
    if (metric === 'ppm') return l.ppm != null;
    return l.water_temp != null;
  }).slice(0, 20).reverse();

  const colors = { ph: '#0ea5e9', ppm: '#10b981', temp: '#f59e0b' };
  const labels = { ph: 'pH', ppm: 'PPM', temp: 'Temperature (°C)' };

  state.logsChart = new Chart(canvas, {
    type: 'line',
    data: {
      labels: valid.map(l => new Date(l.timestamp).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })),
      datasets: [{
        label: labels[metric],
        data: valid.map(l => metric === 'ph' ? l.ph : metric === 'ppm' ? l.ppm : l.water_temp),
        borderColor: colors[metric],
        backgroundColor: colors[metric] + '18',
        fill: true,
        tension: 0.3,
        pointRadius: 4,
        pointBackgroundColor: colors[metric],
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: {
        x: { grid: { display: false } },
        y: { grid: { color: 'rgba(0,0,0,0.05)' } }
      }
    }
  });
}

function renderLogsList(logs) {
  const el = document.getElementById('logsList');
  if (!logs.length) {
    el.innerHTML = '<div class="empty-state" style="padding:40px"><h3>No logs yet</h3><p>Add your first log entry.</p></div>';
    return;
  }
  el.innerHTML = logs.slice(0, 30).map(log => `
    <div class="log-item">
      <div class="log-item-date">${formatDateTime(log.timestamp)}</div>
      <div class="log-item-value"><div class="val">${log.ph != null ? log.ph.toFixed(1) : '--'}</div><div class="label">pH</div></div>
      <div class="log-item-value"><div class="val">${log.ppm ?? '--'}</div><div class="label">PPM</div></div>
      <div class="log-item-value"><div class="val">${log.water_temp != null ? log.water_temp.toFixed(1) + '°' : '--'}</div><div class="label">Temp</div></div>
      <button class="btn-icon btn-sm" onclick="deleteLog('${log.id}')" title="Delete">🗑</button>
    </div>
  `).join('');
}

function showAddLogModal() {
  showModal(`
    <h2>Add Log Entry</h2>
    <form id="logForm">
      <div class="form-row">
        <div class="form-group">
          <label>pH</label>
          <input class="form-input" name="ph" type="number" step="0.1" min="0" max="14" placeholder="6.0">
        </div>
        <div class="form-group">
          <label>PPM</label>
          <input class="form-input" name="ppm" type="number" step="1" min="0" placeholder="1000">
        </div>
        <div class="form-group">
          <label>Water Temp (°C)</label>
          <input class="form-input" name="water_temp" type="number" step="0.1" placeholder="20.0">
        </div>
      </div>
      <div class="form-group">
        <label>Nutrients</label>
        <input class="form-input" name="nutrients" placeholder="e.g., General Hydroponics Flora series">
      </div>
      <div class="form-group">
        <label>Notes</label>
        <textarea class="form-input" name="notes" rows="2" placeholder="Any observations..."></textarea>
      </div>
      <div class="modal-actions">
        <button type="button" class="btn btn-secondary" onclick="closeModal()">Cancel</button>
        <button type="submit" class="btn btn-primary">Save Log</button>
      </div>
    </form>
  `);

  document.getElementById('logForm').onsubmit = async e => {
    e.preventDefault();
    const fd = new FormData(e.target);
    await API.createLog(state.selectedGardenId, {
      ph: fd.get('ph') ? parseFloat(fd.get('ph')) : null,
      ppm: fd.get('ppm') ? parseInt(fd.get('ppm')) : null,
      water_temp: fd.get('water_temp') ? parseFloat(fd.get('water_temp')) : null,
      nutrients: fd.get('nutrients') || null,
      notes: fd.get('notes') || null,
    });
    closeModal();
    renderPage();
  };
}

async function deleteLog(id) {
  if (!confirm('Delete this log entry?')) return;
  await API.deleteLog(id);
  renderPage();
}

// ============================================
// === TASKS PAGE
// ============================================
async function renderTasks(main) {
  const garden = getSelectedGarden();
  if (!garden) {
    main.innerHTML = '<div class="empty-state"><h3>Select a garden first</h3></div>';
    return;
  }

  main.innerHTML = `
    <div class="page-header">
      <div>
        <p class="subtitle">${esc(garden.name)}</p>
        <h1>Tasks</h1>
      </div>
      <button class="btn btn-primary" onclick="showAddTaskModal()">+ Add Task</button>
    </div>
    <div class="tabs">
      <button class="tab active" data-tab="active" onclick="switchTaskTab('active', this)">Active</button>
      <button class="tab" data-tab="completed" onclick="switchTaskTab('completed', this)">Completed</button>
    </div>
    <div id="tasksList"></div>
  `;

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

  if (!filtered.length) {
    el.innerHTML = `<div class="empty-state">
      <h3>${tab === 'active' ? 'No active tasks' : 'No completed tasks'}</h3>
      <p>${tab === 'active' ? 'Add a task to get started.' : ''}</p>
    </div>`;
    return;
  }

  el.innerHTML = filtered.map(task => {
    const isOverdue = !task.is_completed && new Date(task.due_date) < new Date();
    return `
    <div class="task-item">
      <div class="task-checkbox ${task.is_completed ? 'checked' : ''}" onclick="toggleTask('${task.id}')"></div>
      <div class="task-content">
        <div class="task-title ${task.is_completed ? 'completed' : ''}">${esc(task.title)}</div>
        <div class="task-meta">
          <span><span class="priority-dot priority-${task.priority}"></span>${task.priority}</span>
          <span style="${isOverdue ? 'color:var(--error)' : ''}">${isOverdue ? 'Overdue: ' : ''}${formatDate(task.due_date)}</span>
          ${task.is_recurring ? '<span>🔁 Recurring</span>' : ''}
        </div>
      </div>
      <div class="task-actions">
        <button class="btn-icon btn-sm" onclick="deleteTask('${task.id}')" title="Delete">🗑</button>
      </div>
    </div>`;
  }).join('');
}

async function toggleTask(id) {
  await API.toggleTask(id);
  renderPage();
}

async function deleteTask(id) {
  if (!confirm('Delete this task?')) return;
  await API.deleteTask(id);
  renderPage();
}

function showAddTaskModal() {
  const today = new Date().toISOString().split('T')[0];
  showModal(`
    <h2>Add New Task</h2>
    <form id="taskForm">
      <div class="form-group">
        <label>Title</label>
        <input class="form-input" name="title" placeholder="e.g., Water change" required>
      </div>
      <div class="form-group">
        <label>Description</label>
        <textarea class="form-input" name="description" rows="2" placeholder="Details..."></textarea>
      </div>
      <div class="form-row">
        <div class="form-group">
          <label>Due Date</label>
          <input class="form-input" name="due_date" type="date" value="${today}" required>
        </div>
        <div class="form-group">
          <label>Priority</label>
          <select class="form-input" name="priority">
            <option value="low">Low</option>
            <option value="medium" selected>Medium</option>
            <option value="high">High</option>
          </select>
        </div>
      </div>
      <div class="form-group" style="display:flex;align-items:center;gap:12px">
        <label style="margin:0">Recurring</label>
        <div class="toggle" id="recurringToggle" onclick="this.classList.toggle('active');document.getElementById('recurringDays').hidden=!this.classList.contains('active')"></div>
      </div>
      <div class="form-group" id="recurringDays" hidden>
        <label>Repeat every (days)</label>
        <input class="form-input" name="recurring_days" type="number" min="1" value="7" placeholder="7">
      </div>
      <div class="modal-actions">
        <button type="button" class="btn btn-secondary" onclick="closeModal()">Cancel</button>
        <button type="submit" class="btn btn-primary">Add Task</button>
      </div>
    </form>
  `);

  document.getElementById('taskForm').onsubmit = async e => {
    e.preventDefault();
    const fd = new FormData(e.target);
    const isRecurring = document.getElementById('recurringToggle').classList.contains('active');
    await API.createTask(state.selectedGardenId, {
      title: fd.get('title'),
      description: fd.get('description') || null,
      due_date: new Date(fd.get('due_date')).toISOString(),
      priority: fd.get('priority'),
      is_recurring: isRecurring,
      recurring_days: isRecurring ? parseInt(fd.get('recurring_days')) || 7 : null,
    });
    closeModal();
    renderPage();
  };
}

// ============================================
// === PLANTS PAGE
// ============================================
async function renderPlants(main) {
  const garden = getSelectedGarden();
  if (!garden) {
    main.innerHTML = '<div class="empty-state"><h3>Select a garden first</h3></div>';
    return;
  }

  main.innerHTML = `
    <div class="page-header">
      <div>
        <p class="subtitle">${esc(garden.name)}</p>
        <h1>My Plants</h1>
      </div>
      <div style="display:flex;gap:8px">
        <select class="form-input" id="stageFilter" onchange="filterPlants()" style="width:auto">
          <option value="">All Stages</option>
          ${GROWTH_STAGES.map(s => `<option value="${s}">${s.charAt(0).toUpperCase() + s.slice(1)}</option>`).join('')}
        </select>
        <button class="btn btn-primary" onclick="showAddPlantModal()">+ Add Plant</button>
      </div>
    </div>
    <div id="plantsList"></div>
  `;

  const plants = await API.getPlants(garden.id);
  window._plants = plants;
  renderPlantsList(plants);
}

function filterPlants() {
  const stage = document.getElementById('stageFilter').value;
  const filtered = stage ? window._plants.filter(p => p.current_stage === stage) : window._plants;
  renderPlantsList(filtered);
}

function renderPlantsList(plants) {
  const el = document.getElementById('plantsList');
  const active = plants.filter(p => p.is_active);

  if (!active.length) {
    el.innerHTML = '<div class="empty-state"><h3>No plants yet</h3><p>Add your first plant to start tracking.</p></div>';
    return;
  }

  el.innerHTML = `<div class="grid-2">${active.map(plant => {
    const age = daysAgo(plant.seeded_date || plant.created_at);
    const ageStr = age < 7 ? `${age}d` : age < 30 ? `${Math.floor(age/7)}w` : `${Math.floor(age/30)}mo`;
    const badgeColor = STAGE_COLORS[plant.current_stage] || 'gray';
    return `
      <div class="card plant-card" onclick="showPlantDetail('${plant.id}')">
        <div class="plant-avatar">${PLANT_ICONS[plant.plant_type] || '🌱'}</div>
        <div class="plant-info">
          <h3>${esc(plant.name)}</h3>
          <div class="species">${esc(plant.species)}</div>
          <div class="plant-badges">
            <span class="badge badge-${badgeColor}">${plant.current_stage}</span>
            <span class="badge badge-gray">${ageStr} old</span>
          </div>
        </div>
      </div>
    `;
  }).join('')}</div>`;
}

function showPlantDetail(id) {
  const plant = window._plants.find(p => p.id === id);
  if (!plant) return;

  showModal(`
    <h2>${esc(plant.name)}</h2>
    <div style="margin-bottom:16px;display:flex;gap:8px">
      <span class="badge badge-${STAGE_COLORS[plant.current_stage] || 'gray'}">${plant.current_stage}</span>
      <span class="badge badge-gray">${esc(plant.plant_type)}</span>
    </div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:16px">
      <div><div style="font-size:0.8rem;color:var(--text-tertiary)">Species</div><div style="font-weight:600">${esc(plant.species)}</div></div>
      <div><div style="font-size:0.8rem;color:var(--text-tertiary)">Seeded</div><div style="font-weight:600">${formatDate(plant.seeded_date)}</div></div>
      <div><div style="font-size:0.8rem;color:var(--text-tertiary)">Initial pH</div><div style="font-weight:600">${plant.initial_ph ?? '--'}</div></div>
      <div><div style="font-size:0.8rem;color:var(--text-tertiary)">Initial PPM</div><div style="font-weight:600">${plant.initial_ppm ?? '--'}</div></div>
    </div>
    ${plant.notes ? `<div style="padding:12px;background:var(--bg-hover);border-radius:8px;font-size:0.9rem;margin-bottom:16px">${esc(plant.notes)}</div>` : ''}
    <div class="form-group">
      <label>Update Growth Stage</label>
      <select class="form-input" id="updateStage" value="${plant.current_stage}">
        ${GROWTH_STAGES.map(s => `<option value="${s}" ${s === plant.current_stage ? 'selected' : ''}>${s.charAt(0).toUpperCase() + s.slice(1)}</option>`).join('')}
      </select>
    </div>
    <div class="modal-actions">
      <button class="btn btn-danger btn-sm" onclick="deletePlant('${plant.id}')">Delete</button>
      <button class="btn btn-secondary" onclick="closeModal()">Cancel</button>
      <button class="btn btn-primary" onclick="updatePlantStage('${plant.id}')">Update</button>
    </div>
  `);
}

async function updatePlantStage(id) {
  const plant = window._plants.find(p => p.id === id);
  const stage = document.getElementById('updateStage').value;
  await API.updatePlant(id, { ...plant, current_stage: stage, is_active: stage !== 'harvest' || plant.is_active });
  closeModal();
  renderPage();
}

async function deletePlant(id) {
  if (!confirm('Delete this plant?')) return;
  await API.deletePlant(id);
  closeModal();
  renderPage();
}

function showAddPlantModal() {
  showModal(`
    <h2>Add New Plant</h2>
    <form id="plantForm">
      <div class="form-group">
        <label>Plant Name</label>
        <input class="form-input" name="name" placeholder="e.g., Tomato Plant #1" required>
      </div>
      <div class="form-row">
        <div class="form-group">
          <label>Plant Type</label>
          <select class="form-input" name="plant_type" required>
            ${PLANT_TYPES.map(t => `<option value="${t}">${t.charAt(0).toUpperCase() + t.slice(1)}</option>`).join('')}
          </select>
        </div>
        <div class="form-group">
          <label>Species</label>
          <input class="form-input" name="species" placeholder="e.g., Cherry Tomato" required>
        </div>
      </div>
      <div class="form-row">
        <div class="form-group">
          <label>Seeded Date</label>
          <input class="form-input" name="seeded_date" type="date" value="${new Date().toISOString().split('T')[0]}">
        </div>
        <div class="form-group">
          <label>Growth Stage</label>
          <select class="form-input" name="current_stage">
            ${GROWTH_STAGES.map(s => `<option value="${s}">${s.charAt(0).toUpperCase() + s.slice(1)}</option>`).join('')}
          </select>
        </div>
      </div>
      <div class="form-row">
        <div class="form-group">
          <label>Initial pH</label>
          <input class="form-input" name="initial_ph" type="number" step="0.1" placeholder="6.0">
        </div>
        <div class="form-group">
          <label>Initial PPM</label>
          <input class="form-input" name="initial_ppm" type="number" placeholder="800">
        </div>
      </div>
      <div class="form-group">
        <label>Notes</label>
        <textarea class="form-input" name="notes" rows="2" placeholder="Any notes..."></textarea>
      </div>
      <div class="modal-actions">
        <button type="button" class="btn btn-secondary" onclick="closeModal()">Cancel</button>
        <button type="submit" class="btn btn-primary">Add Plant</button>
      </div>
    </form>
  `);

  document.getElementById('plantForm').onsubmit = async e => {
    e.preventDefault();
    const fd = new FormData(e.target);
    await API.createPlant(state.selectedGardenId, {
      name: fd.get('name'),
      plant_type: fd.get('plant_type'),
      species: fd.get('species'),
      seeded_date: fd.get('seeded_date') ? new Date(fd.get('seeded_date')).toISOString() : null,
      current_stage: fd.get('current_stage'),
      initial_ph: fd.get('initial_ph') ? parseFloat(fd.get('initial_ph')) : null,
      initial_ppm: fd.get('initial_ppm') ? parseInt(fd.get('initial_ppm')) : null,
      notes: fd.get('notes') || null,
    });
    closeModal();
    renderPage();
  };
}

// ============================================
// === SETTINGS PAGE
// ============================================
function renderSettings(main) {
  const isDark = state.theme === 'dark';
  main.innerHTML = `
    <div class="page-header">
      <div><h1>Settings</h1></div>
    </div>

    <div style="max-width:600px">
      <h3 style="margin-bottom:12px;color:var(--text-secondary)">Preferences</h3>

      <div class="settings-item">
        <div>
          <div class="settings-item-label">Dark Mode</div>
          <div class="settings-item-desc">Toggle between light and dark theme</div>
        </div>
        <div class="toggle ${isDark ? 'active' : ''}" onclick="toggleTheme()"></div>
      </div>

      <h3 style="margin:24px 0 12px;color:var(--text-secondary)">Garden Management</h3>
      <div id="settingsGardens"></div>

      <h3 style="margin:24px 0 12px;color:var(--text-secondary)">About</h3>
      <div class="settings-item">
        <div>
          <div class="settings-item-label">HydroMate</div>
          <div class="settings-item-desc">Version 1.0.0 — Hydroponic Garden Management</div>
        </div>
      </div>
    </div>
  `;

  const gardensEl = document.getElementById('settingsGardens');
  state.gardens.forEach(g => {
    gardensEl.innerHTML += `
      <div class="settings-item">
        <div>
          <div class="settings-item-label">${esc(g.name)}</div>
          <div class="settings-item-desc">${SYSTEM_TYPES[g.system_type] || g.system_type} — Started ${formatDate(g.start_date)}</div>
        </div>
        <button class="btn btn-danger btn-sm" onclick="deleteGarden('${g.id}')">Delete</button>
      </div>
    `;
  });
}

function toggleTheme() {
  applyTheme(state.theme === 'dark' ? 'light' : 'dark');
  renderPage();
}

async function deleteGarden(id) {
  if (!confirm('Delete this garden? All associated data will be lost.')) return;
  await API.deleteGarden(id);
  if (state.selectedGardenId === id) state.selectedGardenId = null;
  await loadGardens();
  renderPage();
}
