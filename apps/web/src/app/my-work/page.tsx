'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import {
  CheckCircle2, Clock, Layers, TrendingUp, Plus, Calendar,
  AlertCircle, Flame, BarChart3, FolderKanban,
} from 'lucide-react';
import { AppLayout } from '@/components/layout/app-layout';
import { tasksApi, reportsApi, projectsApi } from '@/lib/api';
import { useAuthStore } from '@/store/auth.store';
import {
  cn, statusConfig, priorityConfig, formatDate, isOverdue, isDueSoon,
  getAvatarColor, getInitials, formatPercent,
} from '@/lib/utils';
import { toast } from 'sonner';

const COLUMNS = [
  {
    key: 'todo',
    label: 'To Do',
    statuses: ['not_started'],
    color: 'text-slate-600',
    dot: 'bg-slate-400',
  },
  {
    key: 'in_progress',
    label: 'In Progress',
    statuses: ['in_progress', 'in_review', 'blocked'],
    color: 'text-blue-700',
    dot: 'bg-blue-500',
  },
  {
    key: 'done',
    label: 'Done',
    statuses: ['completed'],
    color: 'text-green-700',
    dot: 'bg-green-500',
    limitDays: 7,
  },
];

function getWeekStart() {
  const d = new Date();
  d.setDate(d.getDate() - d.getDay());
  d.setHours(0, 0, 0, 0);
  return d;
}

function get30DaysAgo() {
  return new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
}

export default function MyWorkPage() {
  const { user } = useAuthStore();

  const { data: tasksData, isLoading } = useQuery({
    queryKey: ['my-work-tasks', user?.id],
    queryFn: () => tasksApi.list({ assigneeId: user?.id, limit: 100 }),
    enabled: !!user?.id,
  });

  const { data: reportData } = useQuery({
    queryKey: ['my-work-report', user?.id],
    queryFn: () => reportsApi.employeeReport(user!.id, { startDate: get30DaysAgo() }),
    enabled: !!user?.id,
  });

  const { data: projectsData } = useQuery({
    queryKey: ['my-work-projects'],
    queryFn: () => projectsApi.list({ limit: 20 }),
  });

  const allTasks: any[] = tasksData?.data?.data || [];
  const projects: any[] = projectsData?.data?.data || [];
  const summary = reportData?.data?.summary;

  const weekStart = getWeekStart();

  // Stats
  const tasksDoneThisWeek = allTasks.filter(
    (t) => t.status === 'completed' && t.completed_at && new Date(t.completed_at) >= weekStart,
  ).length;

  const hoursThisWeek = reportData?.data?.dailyBreakdown?.filter((d: any) => {
    const date = new Date(d.log_date);
    return date >= weekStart;
  }).reduce((sum: number, d: any) => sum + (parseFloat(d.hours) || 0), 0) || 0;

  const activeProjects = projects.filter((p) => p.status === 'active').length;

  const streak = reportData?.data?.dailyBreakdown
    ? (() => {
        const submitted = reportData.data.dailyBreakdown
          .filter((d: any) => d.is_submitted)
          .map((d: any) => d.log_date?.split?.('T')?.[0] || d.log_date)
          .sort()
          .reverse();

        let s = 0;
        const today = new Date().toISOString().split('T')[0];
        let checkDate = today;
        for (const date of submitted) {
          if (date === checkDate) {
            s++;
            const d = new Date(checkDate);
            d.setDate(d.getDate() - 1);
            checkDate = d.toISOString().split('T')[0];
          } else {
            break;
          }
        }
        return s;
      })()
    : 0;

  // Column tasks
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const columnTasks: Record<string, any[]> = {};
  COLUMNS.forEach((col) => {
    let tasks = allTasks.filter((t) => col.statuses.includes(t.status));
    if (col.limitDays) {
      tasks = tasks.filter(
        (t) => !t.completed_at || new Date(t.completed_at) >= sevenDaysAgo,
      );
    }
    columnTasks[col.key] = tasks;
  });

  if (!user) return null;

  return (
    <AppLayout>
      <div className="p-6 max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-foreground">
              My Work
              <span className="ml-2 text-lg font-normal text-muted-foreground">
                — {user.first_name}
              </span>
            </h1>
            <p className="text-sm text-muted-foreground mt-0.5">Your personal command center</p>
          </div>
          <button
            onClick={() => toast.info('Open daily log')}
            className="flex items-center gap-2 px-4 py-2 bg-brand-500 hover:bg-brand-600 text-white rounded-lg text-sm font-medium transition"
          >
            <Plus size={15} />
            Quick Log
          </button>
        </div>

        {/* Stats Bar */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
          {[
            {
              label: 'Done This Week',
              value: tasksDoneThisWeek,
              icon: CheckCircle2,
              color: 'text-green-600',
              bg: 'bg-green-50 border-green-200',
            },
            {
              label: 'Hours This Week',
              value: `${hoursThisWeek.toFixed(1)}h`,
              icon: Clock,
              color: 'text-blue-600',
              bg: 'bg-blue-50 border-blue-200',
            },
            {
              label: 'Active Projects',
              value: activeProjects,
              icon: FolderKanban,
              color: 'text-purple-600',
              bg: 'bg-purple-50 border-purple-200',
            },
            {
              label: 'Day Streak',
              value: streak,
              icon: Flame,
              color: 'text-orange-600',
              bg: 'bg-orange-50 border-orange-200',
              suffix: streak > 0 ? '🔥' : '',
            },
          ].map((stat) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className={cn('bg-card border rounded-xl p-4', stat.bg)}
            >
              <div className="flex items-center gap-2 mb-1">
                <stat.icon size={16} className={stat.color} />
                <span className="text-xs text-muted-foreground">{stat.label}</span>
              </div>
              <div className={cn('text-2xl font-bold', stat.color)}>
                {stat.value}{stat.suffix && <span className="ml-1">{stat.suffix}</span>}
              </div>
            </motion.div>
          ))}
        </div>

        <div className="flex gap-6">
          {/* Kanban columns */}
          <div className="flex-1 min-w-0">
            <div className="flex gap-4 overflow-x-auto pb-2 scrollbar-thin">
              {COLUMNS.map((col) => {
                const tasks = columnTasks[col.key] || [];
                return (
                  <div key={col.key} className="flex-shrink-0 w-72">
                    <div className="flex items-center gap-2 mb-3 px-1">
                      <span className={cn('w-2.5 h-2.5 rounded-full', col.dot)} />
                      <span className="text-sm font-semibold text-foreground">{col.label}</span>
                      <span className="ml-auto text-xs bg-muted text-muted-foreground px-2 py-0.5 rounded-full">
                        {tasks.length}
                      </span>
                    </div>

                    <div className="space-y-2 min-h-[120px]">
                      {isLoading ? (
                        [...Array(3)].map((_, i) => (
                          <div key={i} className="h-24 skeleton rounded-xl" />
                        ))
                      ) : tasks.length === 0 ? (
                        <div className="border border-dashed border-border rounded-xl p-4 text-center">
                          <p className="text-xs text-muted-foreground">
                            {col.key === 'done' ? 'Nothing completed this week' : 'No tasks here'}
                          </p>
                        </div>
                      ) : (
                        tasks.map((task, i) => (
                          <motion.div
                            key={task.id}
                            initial={{ opacity: 0, y: 4 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: i * 0.03 }}
                          >
                            <TaskCard task={task} />
                          </motion.div>
                        ))
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Right sidebar */}
          <div className="w-64 flex-shrink-0 space-y-4">
            {/* My Projects */}
            <div className="bg-card border border-border rounded-xl p-4">
              <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
                <FolderKanban size={14} />
                My Projects
              </h3>
              {projects.length === 0 ? (
                <p className="text-xs text-muted-foreground text-center py-3">No projects</p>
              ) : (
                <div className="space-y-2.5">
                  {projects.slice(0, 8).map((p: any) => (
                    <Link key={p.id} href={`/projects/${p.id}`} className="block group">
                      <div className="flex items-center gap-2 mb-1">
                        <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: p.color || '#6366f1' }} />
                        <span className="text-xs font-medium text-foreground group-hover:text-brand-600 transition truncate flex-1">
                          {p.name}
                        </span>
                        <span className="text-xs text-muted-foreground">{p.completion_pct || 0}%</span>
                      </div>
                      <div className="h-1 bg-muted rounded-full overflow-hidden ml-4">
                        <div
                          className="h-full rounded-full"
                          style={{
                            width: `${p.completion_pct || 0}%`,
                            background: p.color || '#6366f1',
                          }}
                        />
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </div>

            {/* Contribution summary */}
            {summary && (
              <div className="bg-card border border-border rounded-xl p-4">
                <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
                  <BarChart3 size={14} />
                  Last 30 Days
                </h3>
                <div className="space-y-2">
                  {[
                    { label: 'Hours logged', value: `${parseFloat(summary.total_hours || 0).toFixed(0)}h` },
                    { label: 'Tasks done', value: summary.tasks_completed || 0 },
                    { label: 'Days active', value: summary.days_logged || 0 },
                    { label: 'Projects', value: summary.projects_contributed || 0 },
                  ].map((s) => (
                    <div key={s.label} className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">{s.label}</span>
                      <span className="font-semibold text-foreground">{s.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </AppLayout>
  );
}

function TaskCard({ task }: { task: any }) {
  const priority = priorityConfig[task.priority];
  const overdue = isOverdue(task.due_date, task.status);
  const dueSoon = isDueSoon(task.due_date);

  return (
    <Link href={`/tasks/${task.id}`}>
      <div className={cn(
        'bg-card border rounded-xl p-3 hover:shadow-md transition-all cursor-pointer',
        overdue ? 'border-red-200' : 'border-border',
      )}>
        {/* Project badge */}
        {task.project_name && (
          <div className="flex items-center gap-1.5 mb-2">
            <div className="w-1.5 h-1.5 rounded-full" style={{ background: task.project_color || '#6366f1' }} />
            <span className="text-xs text-muted-foreground truncate">{task.project_name}</span>
          </div>
        )}

        {/* Title */}
        <p className={cn(
          'text-sm font-medium leading-snug mb-2',
          task.status === 'completed' ? 'line-through text-muted-foreground' : 'text-foreground',
        )}>
          {task.title}
        </p>

        {/* Progress */}
        {task.progress_pct > 0 && (
          <div className="flex items-center gap-2 mb-2">
            <div className="flex-1 h-1 bg-muted rounded-full overflow-hidden">
              <div className="h-full bg-brand-500 rounded-full" style={{ width: `${task.progress_pct}%` }} />
            </div>
            <span className="text-xs text-muted-foreground">{Math.round(task.progress_pct)}%</span>
          </div>
        )}

        {/* Bottom row */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            {priority && (
              <span className={cn('text-xs font-medium', priority.color)}>{priority.icon}</span>
            )}
            {task.due_date && (
              <span className={cn(
                'flex items-center gap-0.5 text-xs',
                overdue ? 'text-red-600 font-medium' :
                dueSoon ? 'text-amber-600' : 'text-muted-foreground',
              )}>
                <Calendar size={10} />
                {formatDate(task.due_date, 'MMM d')}
              </span>
            )}
          </div>
          {overdue && (
            <span className="flex items-center gap-0.5 text-xs text-red-500">
              <AlertCircle size={11} />
              Overdue
            </span>
          )}
        </div>
      </div>
    </Link>
  );
}
