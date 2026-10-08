const API = {
  async request(method, url, body) {
    const opts = { method, headers: { 'Content-Type': 'application/json' }, credentials: 'same-origin' };
    if (body) opts.body = JSON.stringify(body);
    const res = await fetch(url, opts);
    if (res.status === 401) {
      const err = new Error('Unauthorized');
      err.status = 401;
      throw err;
    }
    const data = await res.json();
    if (!res.ok) {
      const err = new Error(data.error || `Request failed (${res.status})`);
      err.status = res.status;
      throw err;
    }
    return data;
  },

  async download(url) {
    const res = await fetch(url, { credentials: 'same-origin' });
    if (res.status === 401) { const err = new Error('Unauthorized'); err.status = 401; throw err; }
    const blob = await res.blob();
    const disposition = res.headers.get('Content-Disposition') || '';
    const match = disposition.match(/filename="?([^"]+)"?/);
    const filename = match ? match[1] : 'export.csv';
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = filename;
    a.click();
    URL.revokeObjectURL(a.href);
  },

  // Auth
  authStatus() { return this.request('GET', '/api/auth/status'); },
  setupStatus() { return this.request('GET', '/api/setup/status'); },
  setup(data) { return this.request('POST', '/api/auth/setup', data); },
  setupWizard(data) { return this.request('POST', '/api/setup/wizard', data); },
  login(username, password) { return this.request('POST', '/api/auth/login', { username, password }); },
  logout() { return this.request('POST', '/api/auth/logout'); },
  me() { return this.request('GET', '/api/auth/me'); },
  changePassword(current_password, new_password) { return this.request('POST', '/api/auth/change-password', { current_password, new_password }); },

  // Admin
  getUsers() { return this.request('GET', '/api/admin/users'); },
  createUser(data) { return this.request('POST', '/api/admin/users', data); },
  setUserActive(id, is_active) { return this.request('PATCH', `/api/admin/users/${id}/active`, { is_active }); },
  resetUserPassword(id, password) { return this.request('POST', `/api/admin/users/${id}/reset-password`, { password }); },
  deleteUser(id) { return this.request('DELETE', `/api/admin/users/${id}`); },
  deleteuser(id) { return this.deleteUser(id); },

  // Settings
  getSettings() { return this.request('GET', '/api/settings'); },
  updateSetting(key, value, type = 'string') { return this.request('PUT', `/api/settings/${encodeURIComponent(key)}`, { value, type }); },

  // Garden Types
  getGardenTypes() { return this.request('GET', '/api/garden-types'); },
  updateGardenType(typeId, data) { return this.request('PUT', `/api/garden-types/${encodeURIComponent(typeId)}`, data); },
  updateGardenTypeCategory(category, data) { return this.request('PUT', `/api/garden-types/category/${encodeURIComponent(category)}`, data); },
  getGardenTypeMetrics(typeId) { return this.request('GET', `/api/garden-types/${encodeURIComponent(typeId)}/metrics`); },

  // Metrics
  getMetrics() { return this.request('GET', '/api/metrics'); },

  // Locations
  getLocations() { return this.request('GET', '/api/locations'); },
  createLocation(data) { return this.request('POST', '/api/locations', data); },
  updateLocation(id, data) { return this.request('PUT', `/api/locations/${id}`, data); },
  deleteLocation(id) { return this.request('DELETE', `/api/locations/${id}`); },
  getLocationGardens(id) { return this.request('GET', `/api/locations/${id}/gardens`); },

  // Gardens
  getGardens() { return this.request('GET', '/api/gardens'); },
  createGarden(data) { return this.request('POST', '/api/gardens', data); },
  updateGarden(id, data) { return this.request('PUT', `/api/gardens/${id}`, data); },
  deleteGarden(id) { return this.request('DELETE', `/api/gardens/${id}`); },

  // Logs
  getLogs(gardenId, { limit, from, to } = {}) {
    const p = new URLSearchParams();
    if (limit) p.set('limit', limit);
    if (from) p.set('from', from);
    if (to) p.set('to', to);
    const qs = p.toString();
    return this.request('GET', `/api/gardens/${gardenId}/logs${qs ? '?' + qs : ''}`);
  },
  createLog(gardenId, data) { return this.request('POST', `/api/gardens/${gardenId}/logs`, data); },
  updateLog(id, data) { return this.request('PUT', `/api/logs/${id}`, data); },
  deleteLog(id) { return this.request('DELETE', `/api/logs/${id}`); },

  // Tasks
  getTasks(gardenId) { return this.request('GET', `/api/gardens/${gardenId}/tasks`); },
  getAllTasks(query = '') { return this.request('GET', `/api/tasks${query ? '?' + query : ''}`); },
  createTask(gardenId, data) { return this.request('POST', `/api/gardens/${gardenId}/tasks`, data); },
  createTaskGeneral(data) { return this.request('POST', '/api/tasks', data); },
  updateTask(id, data) { return this.request('PUT', `/api/tasks/${id}`, data); },
  toggleTask(id) { return this.request('PATCH', `/api/tasks/${id}/toggle`); },
  deleteTask(id) { return this.request('DELETE', `/api/tasks/${id}`); },

  // Plants
  getPlants(gardenId) { return this.request('GET', `/api/gardens/${gardenId}/plants`); },
  createPlant(gardenId, data) { return this.request('POST', `/api/gardens/${gardenId}/plants`, data); },
  updatePlant(id, data) { return this.request('PUT', `/api/plants/${id}`, data); },
  deletePlant(id) { return this.request('DELETE', `/api/plants/${id}`); },

  // Seeds
  getSeeds() { return this.request('GET', '/api/seeds'); },
  getSeed(id) { return this.request('GET', `/api/seeds/${id}`); },
  createSeed(data) { return this.request('POST', '/api/seeds', data); },
  updateSeed(id, data) { return this.request('PUT', `/api/seeds/${id}`, data); },
  deleteSeed(id) { return this.request('DELETE', `/api/seeds/${id}`); },
  getSeedMetrics(id) { return this.request('GET', `/api/seeds/${id}/metrics`); },

  // Plant Failures
  markPlantFailed(id, data) { return this.request('POST', `/api/plants/${id}/fail`, data); },

  // Stats
  getStats(gardenId) { return this.request('GET', `/api/gardens/${gardenId}/stats`); },
  getDashboardStats() { return this.request('GET', '/api/dashboard/stats'); },

  // Audit
  getAuditLogs(limit = 50, offset = 0) { return this.request('GET', `/api/audit?limit=${limit}&offset=${offset}`); },

  // Devices
  getDevices() { return this.request('GET', '/api/devices'); },
  getDevice(id) { return this.request('GET', `/api/devices/${id}`); },
  createDevice(data) { return this.request('POST', '/api/devices', data); },
  updateDevice(id, data) { return this.request('PUT', `/api/devices/${id}`, data); },
  deleteDevice(id) { return this.request('DELETE', `/api/devices/${id}`); },
  getDeviceKeys(deviceId) { return this.request('GET', `/api/devices/${deviceId}/keys`); },
  createDeviceKey(deviceId, label) { return this.request('POST', `/api/devices/${deviceId}/keys`, { label }); },
  deleteDeviceKey(deviceId, keyId) { return this.request('DELETE', `/api/devices/${deviceId}/keys/${keyId}`); },

  // Sensor Readings
  getSensorReadings(deviceId, limit = 100, offset = 0, metricId) {
    let url = `/api/sensor/readings/${deviceId}?limit=${limit}&offset=${offset}`;
    if (metricId) url += `&metric_id=${encodeURIComponent(metricId)}`;
    return this.request('GET', url);
  },

  // Webhooks
  getWebhooks() { return this.request('GET', '/api/webhooks'); },
  createWebhook(data) { return this.request('POST', '/api/webhooks', data); },
  updateWebhook(id, data) { return this.request('PUT', `/api/webhooks/${id}`, data); },
  deleteWebhook(id) { return this.request('DELETE', `/api/webhooks/${id}`); },
  getWebhookLogs(id, limit = 50) { return this.request('GET', `/api/webhooks/${id}/logs?limit=${limit}`); },
  testWebhook(id) { return this.request('POST', `/api/webhooks/${id}/test`); },

  // Planting Calendar
  getPlantingCalendar(zone) { return this.request('GET', `/api/planting-calendar${zone ? '?zone=' + zone : ''}`); },
  getPlantingCalendarMonth(month) { return this.request('GET', `/api/planting-calendar/month/${month}`); },
  searchPlantingCrops(q) { return this.request('GET', `/api/planting-calendar/search?q=${encodeURIComponent(q)}`); },
  searchPerenual(q) { return this.request('GET', `/api/planting-calendar/lookup?q=${encodeURIComponent(q)}`); },
  getPerenualDetails(id) { return this.request('GET', `/api/planting-calendar/lookup/${id}`); },
  getPlantingCropByName(name) { return this.request('GET', `/api/planting-calendar/crop/${encodeURIComponent(name)}`); },
  createPlantingCrop(data) { return this.request('POST', '/api/planting-calendar', data); },
  updatePlantingCrop(id, data) { return this.request('PUT', `/api/planting-calendar/${encodeURIComponent(id)}`, data); },
  deletePlantingCrop(id, all) { return this.request('DELETE', `/api/planting-calendar/${encodeURIComponent(id)}${all ? '?all=true' : ''}`); },

  // Export
  exportLogs(gardenId) { return this.download(`/api/export/logs/${gardenId}`); },
  exportPlants(gardenId) { return this.download(`/api/export/plants/${gardenId}`); },
};
