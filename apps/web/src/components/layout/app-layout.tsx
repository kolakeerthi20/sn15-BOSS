'use client';

import { useState, useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LayoutDashboard, FolderKanban, CheckSquare, Users, BarChart3,
  Bell, Settings, Search, Menu, X, Zap, Sun, Moon, LogOut,
  ChevronDown, ClipboardList, UserCheck, Grid3X3, Trophy,
} from 'lucide-react';
import { useAuthStore } from '@/store/auth.store';
import { cn, getInitials, getAvatarColor } from '@/lib/utils';
import { useTheme } from 'next-themes';
import { notificationsApi } from '@/lib/api';
import { useQuery } from '@tanstack/react-query';

const navItems = [
  { href: '/my-work',     icon: Grid3X3,         label: 'My Work' },
  { href: '/dashboard',   icon: LayoutDashboard, label: 'Dashboard' },
  { href: '/projects',    icon: FolderKanban,    label: 'Projects' },
  { href: '/tasks',       icon: CheckSquare,     label: 'Tasks' },
  { href: '/daily-logs',  icon: ClipboardList,   label: 'Daily Logs' },
  { href: '/resources',   icon: UserCheck,       label: 'Resources' },
  { href: '/reports',     icon: BarChart3,       label: 'Reports & Analytics' },
  { href: '/team',        icon: Users,           label: 'Team' },
  { href: '/settings',    icon: Settings,        label: 'Settings' },
];

const managerOnlyNav = ['resources', 'reports', 'team'];

export function AppLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout } = useAuthStore();
  const { theme, setTheme } = useTheme();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [profileOpen, setProfileOpen] = useState(false);

  const isManager = !!(user?.role && ['project_manager', 'lead'].includes(user.role));

  const { data: unreadData } = useQuery({
    queryKey: ['notifications', 'unread'],
    queryFn: () => notificationsApi.unreadCount(),
    refetchInterval: 30000,
    enabled: !!user,
  });

  const unreadCount = unreadData?.data?.count || 0;

  // Pending-users badge count for sidebar (separate key from team page list)
  const { data: pendingData } = useQuery({
    queryKey: ['pending-users-count'],
    queryFn: async () => {
      const { authApi } = await import('@/lib/api');
      return authApi.pendingUsers();
    },
    refetchInterval: 60000,
    enabled: isManager,
  });
  const pendingCount: number = (pendingData as any)?.data?.length ?? 0;

  const visibleNav = navItems.filter((item) => {
    const segment = item.href.split('/')[1];
    if (managerOnlyNav.includes(segment) && !isManager) return false;
    return true;
  });

  const handleLogout = async () => {
    try { await fetch('/api/v1/auth/logout', { method: 'DELETE' }); } catch {}
    logout();
    router.push('/auth/login');
  };

  // Redirect pending users — they shouldn't see the main app
  useEffect(() => {
    if (user?.role === 'pending' && !pathname.startsWith('/auth/')) {
      router.replace('/auth/pending');
    }
  }, [user, pathname, router]);

  if (!user) return null;
  if (user.role === 'pending') return null;

  return (
    <div className="h-screen flex overflow-hidden bg-background">
      {/* Sidebar */}
      <AnimatePresence>
        {sidebarOpen && (
          <motion.aside
            initial={{ width: 0, opacity: 0 }}
            animate={{ width: 240, opacity: 1 }}
            exit={{ width: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="flex-shrink-0 border-r border-border bg-card flex flex-col overflow-hidden"
          >
            {/* Logo */}
            <div className="h-14 flex items-center px-4 border-b border-border">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 bg-brand-500 rounded-lg flex items-center justify-center">
                  <Zap className="w-4 h-4 text-white" />
                </div>
                <span className="font-bold text-foreground">BOSS</span>
              </div>
            </div>

            {/* Nav */}
            <nav className="flex-1 p-3 space-y-0.5 overflow-y-auto scrollbar-thin">
              {visibleNav.map((item) => {
                const isActive = pathname.startsWith(item.href);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      'sidebar-item',
                      isActive ? 'sidebar-item-active' : 'sidebar-item-inactive',
                    )}
                  >
                    <item.icon size={18} />
                    <span>{item.label}</span>
                    {item.href === '/notifications' && unreadCount > 0 && (
                      <span className="ml-auto bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                        {unreadCount > 9 ? '9+' : unreadCount}
                      </span>
                    )}
                    {item.href === '/team' && pendingCount > 0 && (
                      <span className="ml-auto bg-amber-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                        {pendingCount > 9 ? '9+' : pendingCount}
                      </span>
                    )}
                  </Link>
                );
              })}
            </nav>

            {/* User */}
            <div className="p-3 border-t border-border">
              <div className="relative">
                <button
                  onClick={() => setProfileOpen(!profileOpen)}
                  className="w-full flex items-center gap-3 rounded-lg px-3 py-2 hover:bg-accent transition-colors"
                >
                  <div className={cn(
                    'w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-medium flex-shrink-0',
                    getAvatarColor(`${user.first_name} ${user.last_name}`),
                  )}>
                    {getInitials(`${user.first_name} ${user.last_name}`)}
                  </div>
                  <div className="flex-1 min-w-0 text-left">
                    <div className="text-sm font-medium text-foreground truncate">
                      {user.first_name} {user.last_name}
                    </div>
                    <div className="text-xs text-muted-foreground truncate capitalize">
                      {user.role?.replace(/_/g, ' ')}
                    </div>
                  </div>
                  <ChevronDown size={14} className="text-muted-foreground flex-shrink-0" />
                </button>

                {profileOpen && (
                  <div className="absolute bottom-full left-0 right-0 mb-1 bg-popover border border-border rounded-lg shadow-lg py-1 z-50">
                    <button
                      onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
                      className="w-full flex items-center gap-3 px-3 py-2 text-sm hover:bg-accent transition-colors"
                    >
                      {theme === 'dark' ? <Sun size={15} /> : <Moon size={15} />}
                      {theme === 'dark' ? 'Light mode' : 'Dark mode'}
                    </button>
                    <button
                      onClick={handleLogout}
                      className="w-full flex items-center gap-3 px-3 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors"
                    >
                      <LogOut size={15} />
                      Sign out
                    </button>
                  </div>
                )}
              </div>
            </div>
          </motion.aside>
        )}
      </AnimatePresence>

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Topbar */}
        <header className="h-14 flex items-center justify-between px-4 border-b border-border bg-card flex-shrink-0">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="p-1.5 rounded-lg hover:bg-accent text-muted-foreground"
            >
              {sidebarOpen ? <X size={18} /> : <Menu size={18} />}
            </button>

            {/* Breadcrumb */}
            <div className="text-sm text-muted-foreground">
              <span className="font-medium text-foreground capitalize">
                {pathname.split('/')[1] || 'Dashboard'}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Search */}
            <button className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-muted text-muted-foreground text-sm hover:bg-accent transition">
              <Search size={14} />
              <span className="hidden sm:block">Search...</span>
              <kbd className="hidden sm:block text-xs bg-background px-1.5 py-0.5 rounded border border-border">
                ⌘K
              </kbd>
            </button>

            {/* Notifications */}
            <Link
              href="/notifications"
              className="relative p-1.5 rounded-lg hover:bg-accent text-muted-foreground"
            >
              <Bell size={18} />
              {unreadCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 bg-red-500 text-white text-xs rounded-full w-4 h-4 flex items-center justify-center">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </Link>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-auto scrollbar-thin">
          {children}
        </main>
      </div>
    </div>
  );
}
