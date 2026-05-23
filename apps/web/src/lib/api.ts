import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

export const api = axios.create({
  baseURL: `${API_URL}/api/v1`,
  headers: { 'Content-Type': 'application/json' },
  withCredentials: false,
});

// Request interceptor — attach JWT
api.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('accessToken');
    if (token) config.headers.Authorization = `Bearer ${token}`;

    const tenantSlug = localStorage.getItem('tenantSlug');
    if (tenantSlug) config.headers['X-Tenant-Slug'] = tenantSlug;
  }
  return config;
});

// Response interceptor — auto-refresh on 401
api.interceptors.response.use(
  (response) => response.data,
  async (error: AxiosError) => {
    const original = error.config as any;
    if (error.response?.status === 401 && !original._retry) {
      original._retry = true;
      try {
        const refreshToken = localStorage.getItem('refreshToken');
        if (!refreshToken) throw new Error('No refresh token');

        const response: any = await axios.post(`${API_URL}/api/v1/auth/refresh`, { refreshToken });
        const { accessToken, refreshToken: newRefresh } = response.data;
        localStorage.setItem('accessToken', accessToken);
        localStorage.setItem('refreshToken', newRefresh);
        original.headers.Authorization = `Bearer ${accessToken}`;
        return api(original);
      } catch {
        localStorage.clear();
        window.location.href = '/auth/login';
      }
    }
    return Promise.reject(error);
  },
);

// Typed API helpers
export const authApi = {
  login: (data: { tenantSlug: string; email: string; password: string }) =>
    api.post('/auth/login', data) as any,
  register: (data: any) => api.post('/auth/register', data) as any,
  refresh: (refreshToken: string) => api.post('/auth/refresh', { refreshToken }) as any,
  logout: (token?: string) => {
    const cfg = token ? { headers: { Authorization: `Bearer ${token}` } } : {};
    return api.delete('/auth/logout', cfg) as any;
  },
  me: (token?: string) => {
    const cfg = token ? { headers: { Authorization: `Bearer ${token}` } } : {};
    return api.get('/auth/me', cfg) as any;
  },
  // Role management (Lead / PM only)
  pendingUsers: (token?: string) => {
    const cfg = token ? { headers: { Authorization: `Bearer ${token}` } } : {};
    return api.get('/auth/pending-users', cfg) as any;
  },
  usersWithRoles: (token?: string) => {
    const cfg = token ? { headers: { Authorization: `Bearer ${token}` } } : {};
    return api.get('/auth/users-with-roles', cfg) as any;
  },
  assignRole: (data: { targetUserId: string; newRole: string; note?: string }, token?: string) => {
    const cfg = token ? { headers: { Authorization: `Bearer ${token}` } } : {};
    return api.patch('/auth/assign-role', data, cfg) as any;
  },
};

export const projectsApi = {
  list: (params?: any) => api.get('/projects', { params }) as any,
  get: (id: string) => api.get(`/projects/${id}`) as any,
  stats: (id: string) => api.get(`/projects/${id}/stats`) as any,
  create: (data: any) => api.post('/projects', data) as any,
  update: (id: string, data: any) => api.patch(`/projects/${id}`, data) as any,
  delete: (id: string) => api.delete(`/projects/${id}`) as any,
  addMember: (id: string, data: any) => api.post(`/projects/${id}/members`, data) as any,
  removeMember: (id: string, userId: string) => api.delete(`/projects/${id}/members/${userId}`) as any,
};

export const tasksApi = {
  list: (params?: any) => api.get('/tasks', { params }) as any,
  get: (id: string) => api.get(`/tasks/${id}`) as any,
  getDetail: (id: string) => api.get(`/tasks/${id}`) as any,
  create: (data: any) => api.post('/tasks', data) as any,
  update: (id: string, data: any) => api.patch(`/tasks/${id}`, data) as any,
  delete: (id: string) => api.delete(`/tasks/${id}`) as any,
  logTime: (id: string, data: { hours: number; description?: string; date?: string }) => api.post(`/tasks/${id}/time`, data) as any,
  addComment: (id: string, content: string) => api.post(`/tasks/${id}/comments`, { content }) as any,
  addUpdate: (id: string, data: { content?: string; videoUrl?: string; imageUrls?: string[]; updateType?: string; progressPct?: number }) => api.post(`/tasks/${id}/comments`, data) as any,
};

export const dailyLogsApi = {
  list: (params?: any) => api.get('/daily-logs', { params }) as any,
  get: (id: string) => api.get(`/daily-logs/${id}`) as any,
  teamFeed: (params?: any) => api.get('/daily-logs/team-feed', { params }) as any,
  missing: (date?: string) => api.get('/daily-logs/missing', { params: { date } }) as any,
  heatmap: (userId: string, weeks?: number) =>
    api.get(`/daily-logs/heatmap/${userId}`, { params: { weeks } }) as any,
  createOrUpdate: (data: any) => api.post('/daily-logs', data) as any,
  submit: (id: string) => api.post(`/daily-logs/${id}/submit`) as any,
};

export const reportsApi = {
  executiveDashboard: () => api.get('/reports/executive-dashboard') as any,
  resourceUtilization: (params?: any) => api.get('/reports/resource-utilization', { params }) as any,
  employeeReport: (userId: string, params?: any) =>
    api.get(`/reports/employee/${userId}`, { params }) as any,
  projectVelocity: (projectId: string) => api.get(`/reports/projects/${projectId}/velocity`) as any,
  burndown: (sprintId: string) => api.get(`/reports/sprints/${sprintId}/burndown`) as any,
  timeReport: (params?: any) => api.get('/reports/time', { params }) as any,
  overdueTasks: () => api.get('/reports/overdue-tasks') as any,
  bottlenecks: (projectId?: string) =>
    api.get('/reports/bottlenecks', { params: { projectId } }) as any,
  teamPerformance: (params?: any) => api.get('/reports/team-performance', { params }) as any,
};

export const usersApi = {
  list: (params?: any) => api.get('/users', { params }) as any,
  get: (id: string) => api.get(`/users/${id}`) as any,
  me: () => api.get('/users/me') as any,
  updateMe: (data: any) => api.patch('/users/me', data) as any,
  update: (id: string, data: any) => api.patch(`/users/${id}`, data) as any,
  departments: () => api.get('/users/departments') as any,
};

export const notificationsApi = {
  list: (params?: any) => api.get('/notifications', { params }) as any,
  unreadCount: () => api.get('/notifications/unread-count') as any,
  markRead: (id: string) => api.patch(`/notifications/${id}/read`) as any,
  markAllRead: () => api.patch('/notifications/mark-all-read') as any,
};

export const resourcesApi = {
  capacity: (params?: any) => api.get('/resources/capacity', { params }) as any,
  workload: (params?: any) => api.get('/resources/workload', { params }) as any,
  skills: () => api.get('/resources/skills') as any,
  allocate: (data: any) => api.post('/resources/allocate', data) as any,
};
