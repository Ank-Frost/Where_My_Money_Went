import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
  timeout: 15000,
  headers: { 'Content-Type': 'application/json' }
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('username');
      window.location.href = '/login';
    }
    return Promise.reject(err);
  }
);

// Auth
export const authAPI = {
  checkSetup: () => api.get('/auth/check-setup'),
  setup: (data) => api.post('/auth/setup', data),
  login: (data) => api.post('/auth/login', data),
  me: () => api.get('/auth/me'),
  changePassword: (data) => api.put('/auth/change-password', data)
};

// Transactions
export const transactionAPI = {
  getAll: (params) => api.get('/transactions', { params }),
  create: (data) => api.post('/transactions', data),
  update: (id, data) => api.put(`/transactions/${id}`, data),
  delete: (id) => api.delete(`/transactions/${id}`),
  getStats: (params) => api.get('/transactions/stats', { params }),
  search: (params) => api.get('/transactions/search', { params })
};

// Budgets
export const budgetAPI = {
  getAll: (params) => api.get('/budgets', { params }),
  create: (data) => api.post('/budgets', data),
  update: (id, data) => api.put(`/budgets/${id}`, data),
  delete: (id) => api.delete(`/budgets/${id}`)
};

// Tags
export const tagAPI = {
  getAll: () => api.get('/tags'),
  delete: (id) => api.delete(`/tags/${id}`)
};

// Splits
export const splitAPI = {
  getSummary: () => api.get('/splits/summary'),
  getPeople: () => api.get('/splits/people'),
  addPerson: (data) => api.post('/splits/people', data),
  deletePerson: (id) => api.delete(`/splits/people/${id}`),
  getGroups: () => api.get('/splits/groups'),
  createGroup: (data) => api.post('/splits/groups', data),
  getExpenses: (params) => api.get('/splits/expenses', { params }),
  createExpense: (data) => api.post('/splits/expenses', data),
  deleteExpense: (id) => api.delete(`/splits/expenses/${id}`),
  settleShare: (shareId) => api.put(`/splits/shares/${shareId}/settle`)
};

// Split Groups (multi-user)
export const splitGroupAPI = {
  create: (data) => api.post('/split-groups', data),
  getAll: () => api.get('/split-groups'),
  getMembers: (groupId) => api.get(`/split-groups/${groupId}/members`),
  addMember: (groupId, userId) => api.post(`/split-groups/${groupId}/members`, { userId }),
  addExpense: (groupId, data) => api.post(`/split-groups/${groupId}/expenses`, data),
  getExpenses: (groupId) => api.get(`/split-groups/${groupId}/expenses`),
  getBalance: (groupId) => api.get(`/split-groups/${groupId}/balance`),
  settleExpenseSplit: (splitId) => api.put(`/split-groups/splits/${splitId}/settle`)
};

// Users
export const userAPI = {
  getAll: () => api.get('/users'),
  search: (q) => api.get('/users/search', { params: { q } })
};

// Subscriptions
export const subscriptionAPI = {
  getAll: () => api.get('/subscriptions'),
  create: (data) => api.post('/subscriptions', data),
  update: (id, data) => api.put(`/subscriptions/${id}`, data),
  delete: (id) => api.delete(`/subscriptions/${id}`)
};

// Goals
export const goalAPI = {
  getAll: () => api.get('/goals'),
  create: (data) => api.post('/goals', data),
  update: (id, data) => api.put(`/goals/${id}`, data),
  delete: (id) => api.delete(`/goals/${id}`),
  allocate: (data) => api.post('/goals/allocate', data),
  getAllocations: (id) => api.get(`/goals/${id}/allocations`)
};

// Notifications
export const notificationAPI = {
  getVapidKey: () => api.get('/notifications/vapid-key'),
  subscribe: (sub) => api.post('/notifications/subscribe', sub),
  unsubscribe: (endpoint) => api.post('/notifications/unsubscribe', { endpoint }),
  getAll: () => api.get('/notifications'),
  markRead: (id) => api.put(`/notifications/${id}/read`),
  markAllRead: () => api.put('/notifications/read-all'),
  snooze: (id, snoozeMinutes) => api.put(`/notifications/${id}/snooze`, { snoozeMinutes })
};

export default api;
