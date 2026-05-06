// ============================================================
// Typed API client — all frontend → API calls go through here
// ============================================================

async function fetchJSON<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    ...init,
    headers: { 'Content-Type': 'application/json', ...init?.headers },
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error ?? `Request failed: ${res.status}`);
  }
  return res.json() as Promise<T>;
}

// Projects
export const api = {
  projects: {
    list: (params?: Record<string, string>) =>
      fetchJSON<any[]>(`/api/projects?${new URLSearchParams(params)}`),
    get: (id: string) => fetchJSON<any>(`/api/projects/${id}`),
    create: (data: any) => fetchJSON<any>('/api/projects', { method: 'POST', body: JSON.stringify(data) }),
    update: (id: string, data: any) => fetchJSON<any>(`/api/projects/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
    delete: (id: string) => fetchJSON<void>(`/api/projects/${id}`, { method: 'DELETE' }),
  },
  tasks: {
    list: (params?: Record<string, string>) =>
      fetchJSON<any[]>(`/api/tasks?${new URLSearchParams(params)}`),
    get: (id: string) => fetchJSON<any>(`/api/tasks/${id}`),
    create: (data: any) => fetchJSON<any>('/api/tasks', { method: 'POST', body: JSON.stringify(data) }),
    update: (id: string, data: any) => fetchJSON<any>(`/api/tasks/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
    delete: (id: string) => fetchJSON<void>(`/api/tasks/${id}`, { method: 'DELETE' }),
  },
  dailyLogs: {
    list: (params?: Record<string, string>) =>
      fetchJSON<any[]>(`/api/daily-logs?${new URLSearchParams(params)}`),
    create: (data: any) => fetchJSON<any>('/api/daily-logs', { method: 'POST', body: JSON.stringify(data) }),
  },
  resources: {
    list: () => fetchJSON<any[]>('/api/resources'),
    get: (id: string) => fetchJSON<any>(`/api/resources/${id}`),
    updateRole: (id: string, role: string) =>
      fetchJSON<any>(`/api/resources/${id}`, { method: 'PATCH', body: JSON.stringify({ role }) }),
  },
  analytics: {
    overview: () => fetchJSON<any>('/api/analytics/overview'),
    productivity: () => fetchJSON<any>('/api/analytics/productivity'),
  },
  roles: {
    list: () => fetchJSON<any[]>('/api/roles'),
    upsert: (data: { email: string; role: string; notes?: string }) =>
      fetchJSON<any>('/api/roles', { method: 'POST', body: JSON.stringify(data) }),
    delete: (email: string) =>
      fetchJSON<void>(`/api/roles?email=${encodeURIComponent(email)}`, { method: 'DELETE' }),
  },
  notifications: {
    list: () => fetchJSON<any[]>('/api/notifications'),
    markRead: (id: string) =>
      fetchJSON<any>(`/api/notifications/${id}`, { method: 'PATCH', body: JSON.stringify({ isRead: true }) }),
    markAllRead: () =>
      fetchJSON<any>('/api/notifications/read-all', { method: 'POST' }),
  },
};
