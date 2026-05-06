'use client';
import React, { useEffect } from 'react';
// Protected layout — all dashboard routes must use this to get sidebar + auth guard
import { useRouter } from 'next/navigation';
import { Sidebar } from '@/components/layout/sidebar';
import { useAppStore } from '@/store/app-store';
import { cn } from '@/lib/utils';

export function ProtectedLayout({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, sidebarCollapsed } = useAppStore();
  const router = useRouter();

  useEffect(() => {
    if (!isAuthenticated) router.replace('/login');
  }, [isAuthenticated, router]);

  if (!isAuthenticated) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 dark:bg-slate-950">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-indigo-200 border-t-indigo-600" />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-slate-50 dark:bg-slate-950">
      <Sidebar />
      <main className={cn('flex-1 overflow-hidden transition-all duration-300', sidebarCollapsed ? 'ml-16' : 'ml-60')}>
        {children}
      </main>
    </div>
  );
}
