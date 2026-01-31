const API = {
  async request(method, url, body) {
    const opts = { method, headers: { 'Content-Type': 'application/json' }, credentials: 'same-origin' };
    if (body) opts.body = JSON.stringify(body);
    const res = await fetch(url, opts);
    if (res.status === 401) {
      window._handleAuthError && window._handleAuthError();
      throw new Error('Unauthorized');
    }
    return res.json();
  },

  // Auth
  authStatus() { return this.request('GET', '/api/auth/status'); },
  setup(data) { return this.request('POST', '/api/auth/setup', data); },
  login(username, password) { return this.request('POST', '/api/auth/login', { username, password }); },
  logout() { return this.request('POST', '/api/auth/logout'); },
  me() { return this.request('GET', '/api/auth/me'); },
  changePassword(current_password, new_password) { return this.request('POST', '/api/auth/change-password', { current_password, new_password }); },

  // Admin
  getUsers() { return this.request('GET', '/api/admin/users'); },
  createUser(data) { return this.request('POST', '/api/admin/users', data); },
  setUserActive(id, is_active) { return this.request('PATCH', `/api/admin/users/${id}/active`, { is_active }); },
  resetUserPassword(id, password) { return this.request('POST', `/api/admin/users/${id}/reset-password`, { password }); },

  // Gardens
  getGardens() { return this.request('GET', '/api/gardens'); },
  createGarden(data) { return this.request('POST', '/api/gardens', data); },
  updateGarden(id, data) { return this.request('PUT', `/api/gardens/${id}`, data); },
  deleteGarden(id) { return this.request('DELETE', `/api/gardens/${id}`); },

  // Logs
  getLogs(gardenId, limit = 100) { return this.request('GET', `/api/gardens/${gardenId}/logs?limit=${limit}`); },
  createLog(gardenId, data) { return this.request('POST', `/api/gardens/${gardenId}/logs`, data); },
  deleteLog(id) { return this.request('DELETE', `/api/logs/${id}`); },

  // Tasks
  getTasks(gardenId) { return this.request('GET', `/api/gardens/${gardenId}/tasks`); },
  createTask(gardenId, data) { return this.request('POST', `/api/gardens/${gardenId}/tasks`, data); },
  updateTask(id, data) { return this.request('PUT', `/api/tasks/${id}`, data); },
  toggleTask(id) { return this.request('PATCH', `/api/tasks/${id}/toggle`); },
  deleteTask(id) { return this.request('DELETE', `/api/tasks/${id}`); },

  // Plants
  getPlants(gardenId) { return this.request('GET', `/api/gardens/${gardenId}/plants`); },
  createPlant(gardenId, data) { return this.request('POST', `/api/gardens/${gardenId}/plants`, data); },
  updatePlant(id, data) { return this.request('PUT', `/api/plants/${id}`, data); },
  deletePlant(id) { return this.request('DELETE', `/api/plants/${id}`); },

  // Stats
  getStats(gardenId) { return this.request('GET', `/api/gardens/${gardenId}/stats`); },

  // Audit
  getAuditLogs(limit = 50, offset = 0) { return this.request('GET', `/api/audit?limit=${limit}&offset=${offset}`); },
};
