// ============================================================
// Zustand UI State Store (client-only)
// Server data is managed by React Query hooks — not here.
// ============================================================
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface UIState {
  sidebarCollapsed: boolean;
  darkMode: boolean;
  activeView: 'kanban' | 'list' | 'gantt' | 'calendar';
  selectedTaskId: string | null;
  selectedProjectId: string | null;

  toggleSidebar: () => void;
  toggleDarkMode: () => void;
  setActiveView: (view: 'kanban' | 'list' | 'gantt' | 'calendar') => void;
  selectTask: (id: string | null) => void;
  selectProject: (id: string | null) => void;
}

export const useUIStore = create<UIState>()(
  persist(
    (set) => ({
      sidebarCollapsed: false,
      darkMode: false,
      activeView: 'kanban',
      selectedTaskId: null,
      selectedProjectId: null,

      toggleSidebar: () => set(s => ({ sidebarCollapsed: !s.sidebarCollapsed })),

      toggleDarkMode: () => set(s => {
        const next = !s.darkMode;
        if (typeof document !== 'undefined') {
          if (next) document.documentElement.classList.add('dark');
          else document.documentElement.classList.remove('dark');
        }
        return { darkMode: next };
      }),

      setActiveView: (view) => set({ activeView: view }),
      selectTask: (id) => set({ selectedTaskId: id }),
      selectProject: (id) => set({ selectedProjectId: id }),
    }),
    {
      name: 'boss-ui-store',
      partialize: (s) => ({ sidebarCollapsed: s.sidebarCollapsed, darkMode: s.darkMode, activeView: s.activeView }),
    }
  )
);
