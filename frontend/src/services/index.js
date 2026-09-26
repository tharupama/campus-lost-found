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
  async getMyItems(type = '', page = 1, pageSize = 12) {
    const { data } = await api.get('/items/mine', { params: { page, pageSize, ...(type ? { type } : {}) } });
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
  async getMyClaims(page = 1, pageSize = 10) {
    const { data } = await api.get('/claims/mine', { params: { page, pageSize } });
    return data;
  },
};

export const notificationService = {
  async getMine(page = 1, pageSize = 10) {
    const { data } = await api.get('/notifications', { params: { page, pageSize } });
    return data;
  },
  async markAllRead() {
    const { data } = await api.patch('/notifications/read');
    return data;
  },
};

export const contactService = {
  async send(payload) {
    const { data } = await api.post('/contact', payload);
    return data;
  },
  async getStaff() {
    const { data } = await api.get('/contact/staff');
    return data;
  },
};

export const feedbackService = {
  async submit(payload) {
    const { data } = await api.post('/feedback', payload);
    return data;
  },
  async getMine(page = 1, pageSize = 10) {
    const { data } = await api.get('/feedback/mine', { params: { page, pageSize } });
    return data;
  },
};

export const chatService = {
  async send(messages) {
    const { data } = await api.post('/chat', { messages });
    return data;
  },
};

export const adminService = {
  async getClaims(status = '', search = '', page = 1, pageSize = 10) {
    const { data } = await api.get('/admin/claims', { params: { ...(status ? { status } : {}), ...(search ? { search } : {}), page, pageSize } });
    return data;
  },
  async reviewClaim(id, status) {
    const { data } = await api.patch(`/admin/claims/${id}`, { status });
    return data;
  },
  async getVault(search = '', view = 'all', page = 1, pageSize = 12) {
    const { data } = await api.get('/admin/vault', { params: { ...(search ? { search } : {}), ...(view !== 'all' ? { view } : {}), page, pageSize } });
    return data;
  },
  async getItems(search = '', page = 1, pageSize = 12) {
    const { data } = await api.get('/admin/items', { params: { ...(search ? { search } : {}), page, pageSize } });
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
  async getUsers(search = '', page = 1, pageSize = 10) {
    const { data } = await api.get('/admin/users', { params: { ...(search ? { search } : {}), page, pageSize } });
    return data;
  },
  async createUser(payload) {
    const { data } = await api.post('/admin/users', payload);
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
  async getStats(range = 30) {
    const { data } = await api.get('/admin/stats', { params: { range } });
    return data;
  },
  async getFeedback(status = '', category = '', search = '', page = 1, pageSize = 10) {
    const { data } = await api.get('/admin/feedback', {
      params: {
        ...(status ? { status } : {}),
        ...(category ? { category } : {}),
        ...(search ? { search } : {}),
        page,
        pageSize,
      },
    });
    return data;
  },
  async updateFeedback(id, status) {
    const { data } = await api.patch(`/admin/feedback/${id}`, { status });
    return data;
  },
  async deleteFeedback(id) {
    const { data } = await api.delete(`/admin/feedback/${id}`);
    return data;
  },
};