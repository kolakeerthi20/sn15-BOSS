// ============================================================
// Zustand Global Store — Client State Management
// ============================================================
import { create } from 'zustand';
import { User, Project, Task, DailyLog, Notification } from '@/types';
import { MOCK_USERS, MOCK_PROJECTS, MOCK_TASKS, MOCK_DAILY_LOGS, MOCK_NOTIFICATIONS } from '@/lib/mock-data';

interface AppState {
  // Auth
  currentUser: User | null;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<boolean>;
  logout: () => void;

  // UI
  sidebarCollapsed: boolean;
  darkMode: boolean;
  activeView: 'kanban' | 'list' | 'gantt' | 'calendar';
  toggleSidebar: () => void;
  toggleDarkMode: () => void;
  setActiveView: (view: 'kanban' | 'list' | 'gantt' | 'calendar') => void;

  // Data
  projects: Project[];
  tasks: Task[];
  users: User[];
  dailyLogs: DailyLog[];
  notifications: Notification[];
  selectedProjectId: string | null;
  selectedTaskId: string | null;

  // Actions
  setProjects: (projects: Project[]) => void;
  addProject: (project: Project) => void;
  updateProject: (id: string, updates: Partial<Project>) => void;
  deleteProject: (id: string) => void;
  setTasks: (tasks: Task[]) => void;
  addTask: (task: Task) => void;
  updateTask: (id: string, updates: Partial<Task>) => void;
  deleteTask: (id: string) => void;
  addDailyLog: (log: DailyLog) => void;
  markNotificationRead: (id: string) => void;
  markAllNotificationsRead: () => void;
  selectProject: (id: string | null) => void;
  selectTask: (id: string | null) => void;

  // Computed helpers
  getProjectById: (id: string) => Project | undefined;
  getTasksByProject: (projectId: string) => Task[];
  getTasksByUser: (userId: string) => Task[];
  getLogsForToday: (userId: string) => DailyLog[];
  getUnreadNotifications: () => Notification[];
}

const DEMO_CREDENTIALS: Record<string, string> = {
  'sarah@boss.dev': 'demo123',
  'marcus@boss.dev': 'demo123',
  'priya@boss.dev': 'demo123',
  'james@boss.dev': 'demo123',
  'aisha@boss.dev': 'demo123',
  'liam@boss.dev': 'demo123',
  'elena@boss.dev': 'demo123',
  'david@boss.dev': 'demo123',
};

export const useAppStore = create<AppState>((set, get) => ({
  // Auth
  currentUser: null,
  isAuthenticated: false,

  login: async (email: string, password: string) => {
    await new Promise(r => setTimeout(r, 800)); // simulate network
    if (DEMO_CREDENTIALS[email.toLowerCase()] === password) {
      const user = MOCK_USERS.find(u => u.email === email.toLowerCase());
      if (user) {
        set({ currentUser: user, isAuthenticated: true });
        return true;
      }
    }
    return false;
  },

  logout: () => set({ currentUser: null, isAuthenticated: false }),

  // UI
  sidebarCollapsed: false,
  darkMode: false,
  activeView: 'kanban',
  toggleSidebar: () => set(s => ({ sidebarCollapsed: !s.sidebarCollapsed })),
  toggleDarkMode: () => {
    set(s => {
      const next = !s.darkMode;
      if (next) document.documentElement.classList.add('dark');
      else document.documentElement.classList.remove('dark');
      return { darkMode: next };
    });
  },
  setActiveView: (view) => set({ activeView: view }),

  // Data
  projects: MOCK_PROJECTS,
  tasks: MOCK_TASKS,
  users: MOCK_USERS,
  dailyLogs: MOCK_DAILY_LOGS,
  notifications: MOCK_NOTIFICATIONS,
  selectedProjectId: null,
  selectedTaskId: null,

  // Actions
  setProjects: (projects) => set({ projects }),
  addProject: (project) => set(s => ({ projects: [...s.projects, project] })),
  updateProject: (id, updates) => set(s => ({
    projects: s.projects.map(p => p.id === id ? { ...p, ...updates } : p),
  })),
  deleteProject: (id) => set(s => ({ projects: s.projects.filter(p => p.id !== id) })),

  setTasks: (tasks) => set({ tasks }),
  addTask: (task) => set(s => ({ tasks: [...s.tasks, task] })),
  updateTask: (id, updates) => set(s => ({
    tasks: s.tasks.map(t => t.id === id ? { ...t, ...updates } : t),
  })),
  deleteTask: (id) => set(s => ({ tasks: s.tasks.filter(t => t.id !== id) })),

  addDailyLog: (log) => set(s => ({ dailyLogs: [log, ...s.dailyLogs] })),

  markNotificationRead: (id) => set(s => ({
    notifications: s.notifications.map(n => n.id === id ? { ...n, isRead: true } : n),
  })),
  markAllNotificationsRead: () => set(s => ({
    notifications: s.notifications.map(n => ({ ...n, isRead: true })),
  })),

  selectProject: (id) => set({ selectedProjectId: id }),
  selectTask: (id) => set({ selectedTaskId: id }),

  // Computed
  getProjectById: (id) => get().projects.find(p => p.id === id),
  getTasksByProject: (projectId) => get().tasks.filter(t => t.projectId === projectId),
  getTasksByUser: (userId) => get().tasks.filter(t => t.assigneeId === userId),
  getLogsForToday: (userId) => {
    const today = new Date().toISOString().split('T')[0];
    return get().dailyLogs.filter(l => l.userId === userId && l.date === today);
  },
  getUnreadNotifications: () => get().notifications.filter(n => !n.isRead),
}));
