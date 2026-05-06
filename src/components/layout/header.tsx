'use client';
import React, { useState } from 'react';
import { Search, Bell, Sun, Moon, Plus, ChevronDown } from 'lucide-react';
import { useSession } from 'next-auth/react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { getInitials, formatRelativeTime } from '@/lib/utils';
import { cn } from '@/lib/utils';
import { useUIStore } from '@/store/app-store';
import { useNotifications, useMarkNotificationRead, useMarkAllNotificationsRead } from '@/hooks/use-notifications';

export function Header({ title }: { title?: string }) {
  const { data: session } = useSession();
  const { darkMode, toggleDarkMode } = useUIStore();
  const { data: notifications = [] } = useNotifications();
  const markRead = useMarkNotificationRead();
  const markAllRead = useMarkAllNotificationsRead();
  const [notifOpen, setNotifOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const unread = notifications.filter((n: any) => !n.isRead);

  return (
    <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-slate-200 bg-white/95 px-6 backdrop-blur-sm dark:border-slate-800 dark:bg-slate-950/95">
      <div className="flex items-center gap-4">
        {title && (
          <h1 className="text-base font-semibold text-slate-900 dark:text-white">{title}</h1>
        )}
      </div>

      <div className="flex items-center gap-3">
        {/* Search */}
        <div className="relative hidden md:block">
          <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search tasks, projects, people..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="h-8 w-64 rounded-lg border border-slate-200 bg-slate-50 pl-9 pr-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:placeholder:text-slate-500"
          />
          <kbd className="absolute right-2 top-1/2 -translate-y-1/2 hidden items-center gap-0.5 rounded border border-slate-200 bg-white px-1 py-0.5 text-[10px] text-slate-400 lg:flex dark:border-slate-700 dark:bg-slate-900">
            ⌘K
          </kbd>
        </div>

        {/* Dark mode */}
        <button
          onClick={toggleDarkMode}
          className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-300"
        >
          {darkMode ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
        </button>

        {/* Notifications */}
        <div className="relative">
          <button
            onClick={() => setNotifOpen(!notifOpen)}
            className="relative rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-300"
          >
            <Bell className="h-4 w-4" />
            {unread.length > 0 && (
              <span className="absolute -right-0.5 -top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white">
                {unread.length}
              </span>
            )}
          </button>

          {notifOpen && (
            <div className="absolute right-0 top-10 z-50 w-80 rounded-xl border border-slate-200 bg-white shadow-xl dark:border-slate-800 dark:bg-slate-900">
              <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3 dark:border-slate-800">
                <span className="text-sm font-semibold text-slate-900 dark:text-slate-100">Notifications</span>
                <button
                  onClick={() => markAllRead.mutate(undefined)}
                  className="text-xs text-indigo-600 hover:underline dark:text-indigo-400"
                >
                  Mark all read
                </button>
              </div>
              <div className="max-h-80 overflow-y-auto">
                {notifications.length === 0 ? (
                  <p className="px-4 py-6 text-center text-sm text-slate-500">No notifications</p>
                ) : (
                  notifications.slice(0, 8).map((n: any) => (
                    <div
                      key={n.id}
                      onClick={() => markRead.mutate(n.id)}
                      className={cn(
                        'cursor-pointer border-b border-slate-100 px-4 py-3 hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-800/50',
                        !n.isRead && 'bg-indigo-50/50 dark:bg-indigo-950/20'
                      )}
                    >
                      <div className="flex items-start gap-2">
                        {!n.isRead && <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-indigo-500" />}
                        <div className={cn(!n.isRead ? 'ml-0' : 'ml-3.5')}>
                          <p className="text-xs font-medium text-slate-900 dark:text-slate-100">{n.title}</p>
                          <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400 line-clamp-2">{n.message}</p>
                          <p className="mt-1 text-[10px] text-slate-400">{formatRelativeTime(n.createdAt)}</p>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        {/* Quick Create */}
        <Button size="sm" className="gap-1.5">
          <Plus className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">New</span>
        </Button>

        {/* User Avatar */}
        {session?.user && (
          <div className="flex items-center gap-2 cursor-pointer rounded-lg px-2 py-1 hover:bg-slate-100 dark:hover:bg-slate-800">
            <Avatar className="h-7 w-7">
              {session.user.image && <AvatarImage src={session.user.image} alt={session.user.name ?? ''} />}
              <AvatarFallback name={session.user.name ?? ''} className="text-xs">
                {getInitials(session.user.name ?? session.user.email ?? '?')}
              </AvatarFallback>
            </Avatar>
            <span className="hidden text-xs font-medium text-slate-700 dark:text-slate-300 lg:block">
              {session.user.name?.split(' ')[0]}
            </span>
            <ChevronDown className="h-3 w-3 text-slate-400" />
          </div>
        )}
      </div>

      {notifOpen && (
        <div className="fixed inset-0 z-40" onClick={() => setNotifOpen(false)} />
      )}
    </header>
  );
}
