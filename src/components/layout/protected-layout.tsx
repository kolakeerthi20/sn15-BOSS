'use client';
import React, { useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { Sidebar } from '@/components/layout/sidebar';
import { useUIStore } from '@/store/app-store';
import { cn } from '@/lib/utils';
import { Shield } from 'lucide-react';

export function ProtectedLayout({ children }: { children: React.ReactNode }) {
  const { status } = useSession();
  const router = useRouter();
  const sidebarCollapsed = useUIStore(s => s.sidebarCollapsed);

  useEffect(() => {
    if (status === 'unauthenticated') router.replace('/login');
  }, [status, router]);

  if (status === 'loading') {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-3 bg-slate-50 dark:bg-slate-950">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-600">
          <Shield className="h-5 w-5 text-white" />
        </div>
        <div className="h-1 w-24 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800">
          <div className="h-full animate-[loading_1.2s_ease-in-out_infinite] rounded-full bg-indigo-500" />
        </div>
      </div>
    );
  }

  if (status === 'unauthenticated') return null;

  return (
    <div className="flex min-h-screen bg-slate-50 dark:bg-slate-950">
      <Sidebar />
      <main className={cn('flex-1 overflow-hidden transition-all duration-300', sidebarCollapsed ? 'ml-16' : 'ml-60')}>
        {children}
      </main>
    </div>
  );
}
