import api from './apiClient';

export const authService = {
  async login(email, password) {
    const { data } = await api.post('/auth/login', { email, password });
    return data;
  },
  async getMe() {
    const { data } = await api.get('/auth/me');
    return data;
  },
};

export const itemService = {
  async getItems(params = {}) {
    const { data } = await api.get('/items', { params });
    return data;
  },
  async getItem(id) {
    const { data } = await api.get(`/items/${id}`);
    return data;
  },
  async createItem(formData) {
    const { data } = await api.post('/items', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return data;
  },
};

export const claimService = {
  async createClaim(payload) {
    const { data } = await api.post('/claims', payload);
    return data;
  },
  async getMyClaims() {
    const { data } = await api.get('/claims/mine');
    return data;
  },
};

export const notificationService = {
  async getMine() {
    const { data } = await api.get('/notifications');
    return data;
  },
  async markAllRead() {
    const { data } = await api.patch('/notifications/read');
    return data;
  },
};

export const adminService = {
  async getClaims(status = '') {
    const { data } = await api.get('/admin/claims', { params: status ? { status } : {} });
    return data;
  },
  async reviewClaim(id, status) {
    const { data } = await api.patch(`/admin/claims/${id}`, { status });
    return data;
  },
  async getVault() {
    const { data } = await api.get('/admin/vault');
    return data;
  },
  async handover(payload) {
    const { data } = await api.post('/admin/handover', payload);
    return data;
  },
};