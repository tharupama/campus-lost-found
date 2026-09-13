import api from './apiClient';

export const authService = {
  async register(payload) {
    const { data } = await api.post('/auth/register', payload);
    return data;
  },
  async googleLogin(credential) {
    const { data } = await api.post('/auth/google', { credential });
    return data;
  },
  async login(email, password) {
    const { data } = await api.post('/auth/login', { email, password });
    return data;
  },
  async getMe() {
    const { data } = await api.get('/auth/me');
    return data;
  },
  async forgotPassword(email) {
    const { data } = await api.post('/auth/forgot-password', { email });
    return data;
  },
  async resetPassword(token, password) {
    const { data } = await api.post('/auth/reset-password', { token, password });
    return data;
  },
  async updateProfile(formData) {
    const { data } = await api.put('/auth/profile', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
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
  async getMyItems(type = '') {
    const { data } = await api.get('/items/mine', { params: type ? { type } : {} });
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
  async getItems(search = '') {
    const { data } = await api.get('/admin/items', { params: search ? { search } : {} });
    return data;
  },
  async updateItem(id, payload) {
    const { data } = await api.put(`/admin/items/${id}`, payload);
    return data;
  },
  async deleteItem(id) {
    const { data } = await api.delete(`/admin/items/${id}`);
    return data;
  },
  async markItemAvailable(id) {
    const { data } = await api.patch(`/admin/items/${id}/available`);
    return data;
  },
  async handover(payload) {
    const { data } = await api.post('/admin/handover', payload);
    return data;
  },
  async getUsers(search = '') {
    const { data } = await api.get('/admin/users', { params: search ? { search } : {} });
    return data;
  },
  async updateUser(id, payload) {
    const { data } = await api.put(`/admin/users/${id}`, payload);
    return data;
  },
  async deleteUser(id) {
    const { data } = await api.delete(`/admin/users/${id}`);
    return data;
  },
};