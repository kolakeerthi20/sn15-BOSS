'use client';
import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard, FolderKanban, CheckSquare, Users, BarChart3,
  ClipboardList, Settings, ChevronLeft, ChevronRight, Zap,
  Calendar, Bell, LogOut, Shield,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAppStore } from '@/store/app-store';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { getInitials } from '@/lib/utils';

const NAV_ITEMS = [
  { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { label: 'Projects', href: '/projects', icon: FolderKanban },
  { label: 'Tasks', href: '/tasks', icon: CheckSquare },
  { label: 'Resources', href: '/resources', icon: Users },
  { label: 'Daily Log', href: '/daily-log', icon: ClipboardList },
  { label: 'Analytics', href: '/analytics', icon: BarChart3 },
  { label: 'Calendar', href: '/calendar', icon: Calendar },
  { label: 'Automations', href: '/automations', icon: Zap },
];

const BOTTOM_ITEMS = [
  { label: 'Notifications', href: '/notifications', icon: Bell },
  { label: 'Settings', href: '/settings', icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();
  const { sidebarCollapsed, toggleSidebar, currentUser, logout } = useAppStore();

  return (
    <aside
      className={cn(
        'fixed left-0 top-0 z-40 flex h-screen flex-col border-r border-slate-200 bg-white transition-all duration-300 dark:border-slate-800 dark:bg-slate-950',
        sidebarCollapsed ? 'w-16' : 'w-60'
      )}
    >
      {/* Logo */}
      <div className="flex h-14 items-center justify-between border-b border-slate-200 px-4 dark:border-slate-800">
        {!sidebarCollapsed && (
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-600">
              <Shield className="h-4 w-4 text-white" />
            </div>
            <span className="text-base font-bold text-slate-900 dark:text-white">BOSS</span>
          </div>
        )}
        {sidebarCollapsed && (
          <div className="mx-auto flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-600">
            <Shield className="h-4 w-4 text-white" />
          </div>
        )}
        <button
          onClick={toggleSidebar}
          className={cn(
            'rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800 dark:hover:text-slate-300',
            sidebarCollapsed && 'hidden'
          )}
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
      </div>

      {sidebarCollapsed && (
        <button
          onClick={toggleSidebar}
          className="mx-auto mt-2 rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      )}

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto px-2 py-3 space-y-0.5">
        {NAV_ITEMS.map(({ label, href, icon: Icon }) => {
          const active = pathname === href || pathname.startsWith(href + '/');
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                active
                  ? 'bg-indigo-50 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300'
                  : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-100',
                sidebarCollapsed && 'justify-center px-2'
              )}
              title={sidebarCollapsed ? label : undefined}
            >
              <Icon className={cn('h-4 w-4 shrink-0', active && 'text-indigo-600 dark:text-indigo-400')} />
              {!sidebarCollapsed && label}
            </Link>
          );
        })}
      </nav>

      {/* Bottom */}
      <div className="border-t border-slate-200 px-2 py-2 space-y-0.5 dark:border-slate-800">
        {BOTTOM_ITEMS.map(({ label, href, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            className={cn(
              'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-100',
              sidebarCollapsed && 'justify-center px-2'
            )}
            title={sidebarCollapsed ? label : undefined}
          >
            <Icon className="h-4 w-4 shrink-0" />
            {!sidebarCollapsed && label}
          </Link>
        ))}

        {/* User */}
        {currentUser && (
          <div className={cn('flex items-center gap-3 rounded-lg p-2 mt-1', sidebarCollapsed && 'justify-center')}>
            <Avatar className="h-7 w-7 shrink-0">
              <AvatarFallback name={currentUser.name} className="text-xs">
                {getInitials(currentUser.name)}
              </AvatarFallback>
            </Avatar>
            {!sidebarCollapsed && (
              <div className="min-w-0 flex-1">
                <p className="truncate text-xs font-medium text-slate-900 dark:text-slate-100">{currentUser.name}</p>
                <p className="truncate text-xs text-slate-500 dark:text-slate-400">{currentUser.role.replace('_', ' ')}</p>
              </div>
            )}
            {!sidebarCollapsed && (
              <button
                onClick={logout}
                className="shrink-0 text-slate-400 hover:text-red-500"
                title="Sign out"
              >
                <LogOut className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        )}
      </div>
    </aside>
  );
}
