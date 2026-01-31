const API = {
  async request(method, url, body) {
    const opts = { method, headers: { 'Content-Type': 'application/json' } };
    if (body) opts.body = JSON.stringify(body);
    const res = await fetch(url, opts);
    return res.json();
  },

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
};
