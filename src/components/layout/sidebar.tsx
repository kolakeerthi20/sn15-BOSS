'use client';
import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { signOut, useSession } from 'next-auth/react';
import {
  LayoutDashboard, FolderKanban, CheckSquare, Users, BarChart3,
  ClipboardList, Settings, ChevronLeft, ChevronRight, Zap,
  Calendar, Bell, LogOut, Shield, UserCog,
} from 'lucide-react';
import { cn, getInitials } from '@/lib/utils';
import { useUIStore } from '@/store/app-store';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

const NAV_ITEMS = [
  { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard, roles: ['ADMIN', 'PROJECT_MANAGER', 'TEAM_LEAD', 'EMPLOYEE', 'CLIENT_VIEWER'] },
  { label: 'Projects', href: '/projects', icon: FolderKanban, roles: ['ADMIN', 'PROJECT_MANAGER', 'TEAM_LEAD', 'EMPLOYEE', 'CLIENT_VIEWER'] },
  { label: 'Tasks', href: '/tasks', icon: CheckSquare, roles: ['ADMIN', 'PROJECT_MANAGER', 'TEAM_LEAD', 'EMPLOYEE'] },
  { label: 'Resources', href: '/resources', icon: Users, roles: ['ADMIN', 'PROJECT_MANAGER', 'TEAM_LEAD'] },
  { label: 'Daily Log', href: '/daily-log', icon: ClipboardList, roles: ['ADMIN', 'PROJECT_MANAGER', 'TEAM_LEAD', 'EMPLOYEE'] },
  { label: 'Analytics', href: '/analytics', icon: BarChart3, roles: ['ADMIN', 'PROJECT_MANAGER', 'TEAM_LEAD'] },
  { label: 'Calendar', href: '/calendar', icon: Calendar, roles: ['ADMIN', 'PROJECT_MANAGER', 'TEAM_LEAD', 'EMPLOYEE'] },
  { label: 'Automations', href: '/automations', icon: Zap, roles: ['ADMIN', 'PROJECT_MANAGER'] },
];

const BOTTOM_ITEMS = [
  { label: 'Notifications', href: '/notifications', icon: Bell, roles: ['ADMIN', 'PROJECT_MANAGER', 'TEAM_LEAD', 'EMPLOYEE'] },
  { label: 'Roles & Access', href: '/settings/roles', icon: UserCog, roles: ['ADMIN'] },
  { label: 'Settings', href: '/settings', icon: Settings, roles: ['ADMIN', 'PROJECT_MANAGER', 'TEAM_LEAD', 'EMPLOYEE'] },
];

export function Sidebar() {
  const pathname = usePathname();
  const { sidebarCollapsed, toggleSidebar } = useUIStore();
  const { data: session } = useSession();
  const userRole = session?.user?.role ?? 'EMPLOYEE';

  const visibleNavItems = NAV_ITEMS.filter(item => item.roles.includes(userRole));
  const visibleBottomItems = BOTTOM_ITEMS.filter(item => item.roles.includes(userRole));

  return (
    <aside className={cn(
      'fixed left-0 top-0 z-40 flex h-screen flex-col border-r border-slate-200 bg-white transition-all duration-300 dark:border-slate-800 dark:bg-slate-950',
      sidebarCollapsed ? 'w-16' : 'w-60'
    )}>
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
        {!sidebarCollapsed && (
          <button onClick={toggleSidebar} className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800 dark:hover:text-slate-300">
            <ChevronLeft className="h-4 w-4" />
          </button>
        )}
      </div>

      {sidebarCollapsed && (
        <button onClick={toggleSidebar} className="mx-auto mt-2 rounded-lg p-1 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800">
          <ChevronRight className="h-4 w-4" />
        </button>
      )}

      {/* Role badge */}
      {!sidebarCollapsed && session?.user && (
        <div className="mx-3 mt-2 rounded-lg bg-indigo-50 px-3 py-1.5 dark:bg-indigo-950/40">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
            {userRole.replace('_', ' ')}
          </p>
        </div>
      )}

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto px-2 py-3 space-y-0.5">
        {visibleNavItems.map(({ label, href, icon: Icon }) => {
          const active = pathname === href || (href !== '/dashboard' && pathname.startsWith(href + '/'));
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
        {visibleBottomItems.map(({ label, href, icon: Icon }) => (
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
        {session?.user && (
          <div className={cn('flex items-center gap-2 rounded-lg p-2 mt-1', sidebarCollapsed && 'justify-center')}>
            <Avatar className="h-7 w-7 shrink-0">
              {session.user.image && <AvatarImage src={session.user.image} alt={session.user.name ?? ''} />}
              <AvatarFallback name={session.user.name ?? ''} className="text-xs">
                {getInitials(session.user.name ?? session.user.email ?? '?')}
              </AvatarFallback>
            </Avatar>
            {!sidebarCollapsed && (
              <>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs font-medium text-slate-900 dark:text-slate-100">{session.user.name}</p>
                  <p className="truncate text-[10px] text-slate-500 dark:text-slate-400">{session.user.email}</p>
                </div>
                <button
                  onClick={() => signOut({ callbackUrl: '/login' })}
                  className="shrink-0 text-slate-400 hover:text-red-500 transition-colors"
                  title="Sign out"
                >
                  <LogOut className="h-3.5 w-3.5" />
                </button>
              </>
            )}
          </div>
        )}
      </div>
    </aside>
  );
}
