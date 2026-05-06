'use client';
import React, { useState } from 'react';
import { Plus, Search, Kanban, List, X } from 'lucide-react';
import { Header } from '@/components/layout/header';
import { KanbanBoard } from '@/components/tasks/kanban-board';
import { TaskDetail } from '@/components/tasks/task-detail';
import { Button } from '@/components/ui/button';
import { useAppStore } from '@/store/app-store';
import { getStatusColor, getStatusDot, getPriorityColor, formatDate } from '@/lib/utils';
import { cn } from '@/lib/utils';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { getInitials } from '@/lib/utils';

export default function TasksPage() {
  const { tasks, projects, selectedTaskId, selectTask } = useAppStore();
  const [search, setSearch] = useState('');
  const [projectFilter, setProjectFilter] = useState('ALL');
  const [view, setView] = useState<'kanban' | 'list'>('kanban');

  const selectedTask = tasks.find(t => t.id === selectedTaskId);

  const filtered = tasks.filter(t => {
    const matchSearch = t.title.toLowerCase().includes(search.toLowerCase());
    const matchProject = projectFilter === 'ALL' || t.projectId === projectFilter;
    return matchSearch && matchProject;
  });

  return (
    <div className="flex h-screen flex-col overflow-hidden">
      <Header title="Tasks" />

      <div className="flex flex-1 overflow-hidden">
        {/* Main content */}
        <div className={cn('flex flex-1 flex-col overflow-hidden transition-all', selectedTask ? 'mr-0' : '')}>
          {/* Toolbar */}
          <div className="flex items-center gap-3 border-b border-slate-200 px-6 py-3 dark:border-slate-800">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search tasks..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="h-8 w-48 rounded-lg border border-slate-200 bg-white pl-9 pr-3 text-sm placeholder:text-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
              />
            </div>

            <select
              value={projectFilter}
              onChange={e => setProjectFilter(e.target.value)}
              className="h-8 rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-700 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
            >
              <option value="ALL">All Projects</option>
              {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>

            <div className="ml-auto flex items-center gap-2">
              <div className="flex rounded-lg border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900">
                <button
                  onClick={() => setView('kanban')}
                  className={cn('rounded-l-lg px-3 py-1.5 text-xs font-medium transition-colors', view === 'kanban' ? 'bg-indigo-50 text-indigo-600 dark:bg-indigo-950 dark:text-indigo-400' : 'text-slate-500')}
                >
                  <Kanban className="h-3.5 w-3.5" />
                </button>
                <button
                  onClick={() => setView('list')}
                  className={cn('rounded-r-lg px-3 py-1.5 text-xs font-medium transition-colors', view === 'list' ? 'bg-indigo-50 text-indigo-600 dark:bg-indigo-950 dark:text-indigo-400' : 'text-slate-500')}
                >
                  <List className="h-3.5 w-3.5" />
                </button>
              </div>
              <Button size="sm" className="gap-1.5">
                <Plus className="h-3.5 w-3.5" />
                Add Task
              </Button>
            </div>
          </div>

          {/* Board */}
          <div className="flex-1 overflow-auto p-6">
            {view === 'kanban' ? (
              <KanbanBoard tasks={filtered} />
            ) : (
              <div className="overflow-hidden rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-slate-100 dark:border-slate-800">
                      {['Task', 'Project', 'Assignee', 'Status', 'Priority', 'Progress', 'Due'].map(h => (
                        <th key={h} className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((t, i) => {
                      const proj = projects.find(p => p.id === t.projectId);
                      return (
                        <tr
                          key={t.id}
                          onClick={() => selectTask(t.id)}
                          className={cn('cursor-pointer border-b border-slate-50 hover:bg-slate-50/50 dark:border-slate-800/50 dark:hover:bg-slate-800/30', i === filtered.length - 1 && 'border-0')}
                        >
                          <td className="px-4 py-3 text-sm font-medium text-slate-900 dark:text-slate-100 max-w-[200px] truncate">{t.title}</td>
                          <td className="px-4 py-3 text-xs text-slate-500 dark:text-slate-400 max-w-[120px] truncate">{proj?.name}</td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-1.5">
                              <Avatar className="h-5 w-5">
                                <AvatarFallback name={t.assignee.name} className="text-[8px]">{getInitials(t.assignee.name)}</AvatarFallback>
                              </Avatar>
                              <span className="text-xs text-slate-600 dark:text-slate-400">{t.assignee.name.split(' ')[0]}</span>
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <span className={cn('inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium', getStatusColor(t.status))}>
                              <span className={cn('h-1.5 w-1.5 rounded-full', getStatusDot(t.status))} />
                              {t.status.replace('_', ' ')}
                            </span>
                          </td>
                          <td className={cn('px-4 py-3 text-xs font-medium', getPriorityColor(t.priority))}>{t.priority}</td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              <div className="h-1.5 w-16 rounded-full bg-slate-100 dark:bg-slate-800">
                                <div className="h-full rounded-full bg-indigo-500" style={{ width: `${t.progressPercent}%` }} />
                              </div>
                              <span className="text-xs text-slate-500">{t.progressPercent}%</span>
                            </div>
                          </td>
                          <td className="px-4 py-3 text-xs text-slate-500 dark:text-slate-400">{formatDate(t.dueDate)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* Task detail panel */}
        {selectedTask && (
          <div className="w-96 shrink-0 overflow-auto border-l border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
            <TaskDetail task={selectedTask} onClose={() => selectTask(null)} />
          </div>
        )}
      </div>
    </div>
  );
}
