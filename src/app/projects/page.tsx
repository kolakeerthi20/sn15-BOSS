'use client';
import React, { useState } from 'react';
import { Plus, Search, Grid3X3, List, SlidersHorizontal, Loader2 } from 'lucide-react';
import { useSession } from 'next-auth/react';
import { Header } from '@/components/layout/header';
import { ProjectCard } from '@/components/projects/project-card';
import { Button } from '@/components/ui/button';
import { useProjects } from '@/hooks/use-projects';
import { getStatusColor, getStatusDot, formatDate, formatCurrency } from '@/lib/utils';
import { cn } from '@/lib/utils';
import Link from 'next/link';

const STATUS_FILTERS = [
  { value: 'ALL', label: 'All' },
  { value: 'ACTIVE', label: 'Active' },
  { value: 'AT_RISK', label: 'At Risk' },
  { value: 'PLANNING', label: 'Planning' },
  { value: 'COMPLETED', label: 'Completed' },
  { value: 'ON_HOLD', label: 'On Hold' },
];

export default function ProjectsPage() {
  const { data: session } = useSession();
  const { data: projects = [], isLoading } = useProjects();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [view, setView] = useState<'grid' | 'list'>('grid');

  const filtered = projects.filter((p: any) => {
    const matchSearch = p.name.toLowerCase().includes(search.toLowerCase()) ||
      (p.client ?? '').toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === 'ALL' || p.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const isManager = session?.user?.role === 'PROJECT_MANAGER' || session?.user?.role === 'ADMIN';

  return (
    <div className="flex flex-col min-h-screen">
      <Header title="Projects" />

      <div className="flex-1 p-6 space-y-5">
        {/* Toolbar */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search projects..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="h-9 w-56 rounded-lg border border-slate-200 bg-white pl-9 pr-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
              />
            </div>
            <Button variant="outline" size="sm" className="gap-1.5">
              <SlidersHorizontal className="h-3.5 w-3.5" />
              Filter
            </Button>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex rounded-lg border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900">
              <button
                onClick={() => setView('grid')}
                className={cn('rounded-l-lg p-2 transition-colors', view === 'grid' ? 'bg-indigo-50 text-indigo-600 dark:bg-indigo-950 dark:text-indigo-400' : 'text-slate-500 hover:text-slate-700 dark:text-slate-400')}
              >
                <Grid3X3 className="h-4 w-4" />
              </button>
              <button
                onClick={() => setView('list')}
                className={cn('rounded-r-lg p-2 transition-colors', view === 'list' ? 'bg-indigo-50 text-indigo-600 dark:bg-indigo-950 dark:text-indigo-400' : 'text-slate-500 hover:text-slate-700 dark:text-slate-400')}
              >
                <List className="h-4 w-4" />
              </button>
            </div>
            {isManager && (
              <Button size="sm" className="gap-1.5">
                <Plus className="h-3.5 w-3.5" />
                New Project
              </Button>
            )}
          </div>
        </div>

        {/* Status filter pills */}
        <div className="flex gap-2 overflow-x-auto pb-1">
          {STATUS_FILTERS.map(f => (
            <button
              key={f.value}
              onClick={() => setStatusFilter(f.value)}
              className={cn(
                'shrink-0 rounded-full px-3 py-1.5 text-xs font-medium transition-colors',
                statusFilter === f.value
                  ? 'bg-indigo-600 text-white'
                  : 'bg-white text-slate-600 border border-slate-200 hover:border-indigo-300 hover:text-indigo-600 dark:bg-slate-900 dark:text-slate-400 dark:border-slate-700'
              )}
            >
              {f.label}
              <span className={cn('ml-1.5 rounded-full px-1.5 text-[10px]', statusFilter === f.value ? 'bg-white/20' : 'bg-slate-100 dark:bg-slate-800')}>
                {f.value === 'ALL' ? projects.length : projects.filter((p: any) => p.status === f.value).length}
              </span>
            </button>
          ))}
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="h-6 w-6 animate-spin text-indigo-500" />
          </div>
        ) : (
          <>
            <p className="text-xs text-slate-500 dark:text-slate-400">{filtered.length} project{filtered.length !== 1 ? 's' : ''}</p>

            {view === 'grid' ? (
              <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
                {filtered.map((p: any) => <ProjectCard key={p.id} project={p} />)}
              </div>
            ) : (
              <div className="overflow-hidden rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-slate-100 dark:border-slate-800">
                      {['Project', 'Client', 'Status', 'Progress', 'Budget', 'Due Date', 'Team'].map(h => (
                        <th key={h} className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((p: any, i: number) => (
                      <tr key={p.id} className={cn('border-b border-slate-50 hover:bg-slate-50/50 dark:border-slate-800/50 dark:hover:bg-slate-800/30', i === filtered.length - 1 && 'border-0')}>
                        <td className="px-4 py-3">
                          <Link href={`/projects/${p.id}`} className="text-sm font-medium text-slate-900 dark:text-slate-100 hover:text-indigo-600 dark:hover:text-indigo-400">
                            {p.name}
                          </Link>
                        </td>
                        <td className="px-4 py-3 text-sm text-slate-500 dark:text-slate-400">{p.client}</td>
                        <td className="px-4 py-3">
                          <span className={cn('inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium', getStatusColor(p.status))}>
                            <span className={cn('h-1.5 w-1.5 rounded-full', getStatusDot(p.status))} />
                            {p.status.replace('_', ' ')}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <div className="h-1.5 w-20 rounded-full bg-slate-100 dark:bg-slate-800">
                              <div className="h-full rounded-full bg-indigo-500" style={{ width: `${p.completionPercent ?? 0}%` }} />
                            </div>
                            <span className="text-xs text-slate-600 dark:text-slate-400">{p.completionPercent ?? 0}%</span>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-xs text-slate-600 dark:text-slate-400">
                          {p.spentBudget != null ? formatCurrency(p.spentBudget) : '—'} / {p.budget != null ? formatCurrency(p.budget) : '—'}
                        </td>
                        <td className="px-4 py-3 text-xs text-slate-600 dark:text-slate-400">{formatDate(p.endDate)}</td>
                        <td className="px-4 py-3 text-xs text-slate-600 dark:text-slate-400">{p.members?.length ?? 0} members</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {filtered.length === 0 && !isLoading && (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <p className="text-sm font-medium text-slate-700 dark:text-slate-300">No projects found</p>
                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                  {isManager ? 'Create your first project to get started.' : 'No projects have been assigned to you yet.'}
                </p>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
