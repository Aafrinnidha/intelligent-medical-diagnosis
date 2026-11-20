import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || '/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('cdss_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('cdss_token');
      localStorage.removeItem('cdss_doctor');
      if (
        !window.location.pathname.startsWith('/login') &&
        !window.location.pathname.startsWith('/register')
      ) {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

export const authAPI = {
  register: (payload) => api.post('/auth/register', payload),
  login: (payload) => api.post('/auth/login', payload),
  me: () => api.get('/auth/me'),
  logout: () => api.post('/auth/logout'),
};

export const dashboardAPI = {
  getSummary: () => api.get('/dashboard/summary'),
};

export const patientsAPI = {
  list: (params) => api.get('/patients', { params }),
  getById: (id) => api.get(`/patients/${id}`),
  create: (payload) => api.post('/patients', payload),
  update: (id, payload) => api.put(`/patients/${id}`, payload),
};

export const emergencyAPI = {
  evaluate: (payload) => api.post('/emergency/evaluate', payload),
};

export const diagnosesAPI = {
  create: (payload) => api.post('/diagnoses', payload),
  list: (params) => api.get('/diagnoses', { params }),
  getById: (id) => api.get(`/diagnoses/${id}`),
  verify: (id, payload) => api.patch(`/diagnoses/${id}/verify`, payload),
  downloadServerPdf: (id) =>
    api.get(`/diagnoses/${id}/report`, {
      responseType: 'blob',
    }),
};

export const knowledgeBaseAPI = {
  listDiseases: (params) => api.get('/knowledge-base/diseases', { params }),
  createDisease: (payload) => api.post('/knowledge-base/diseases', payload),
  updateDisease: (id, payload) => api.put(`/knowledge-base/diseases/${id}`, payload),
  deleteDisease: (id) => api.delete(`/knowledge-base/diseases/${id}`),
  listRules: (params) => api.get('/knowledge-base/rules', { params }),
  createRule: (payload) => api.post('/knowledge-base/rules', payload),
  updateRule: (id, payload) => api.put(`/knowledge-base/rules/${id}`, payload),
  deleteRule: (id) => api.delete(`/knowledge-base/rules/${id}`),
};

export default api;
