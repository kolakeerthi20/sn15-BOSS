'use client';
import React from 'react';
import { useParams } from 'next/navigation';
import { ArrowLeft, Users, CheckCircle2, Clock, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { Header } from '@/components/layout/header';
import { KanbanBoard } from '@/components/tasks/kanban-board';
import { TaskDetail } from '@/components/tasks/task-detail';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { useProject } from '@/hooks/use-projects';
import { useTasks } from '@/hooks/use-tasks';
import { useUIStore } from '@/store/app-store';
import { formatDate, formatCurrency, calcBudgetBurnPercent, daysUntil, getInitials, getStatusColor, getStatusDot, getHealthColor } from '@/lib/utils';
import { cn } from '@/lib/utils';

export default function ProjectDetailPage() {
  const params = useParams();
  const id = params.id as string;
  const { data: project, isLoading } = useProject(id);
  const { data: allTasks = [] } = useTasks({ projectId: id });
  const { selectedTaskId, selectTask } = useUIStore();

  const selectedTask = allTasks.find((t: any) => t.id === selectedTaskId);

  if (isLoading) {
    return (
      <div className="flex flex-col min-h-screen">
        <Header />
        <div className="flex flex-1 items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-indigo-500" />
        </div>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="flex flex-col min-h-screen">
        <Header />
        <div className="flex flex-1 items-center justify-center">
          <p className="text-slate-500 dark:text-slate-400">Project not found.</p>
        </div>
      </div>
    );
  }

  const daysLeft = daysUntil(project.endDate);
  const budgetBurn = calcBudgetBurnPercent(project.spentBudget ?? 0, project.budget ?? 1);

  return (
    <div className="flex h-screen flex-col overflow-hidden">
      <Header />

      <div className="flex flex-1 overflow-hidden">
        <div className="flex flex-1 flex-col overflow-hidden">
          {/* Project header */}
          <div className="border-b border-slate-200 bg-white px-6 py-4 dark:border-slate-800 dark:bg-slate-950">
            <Link href="/projects" className="mb-2 flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200">
              <ArrowLeft className="h-3.5 w-3.5" />
              Back to Projects
            </Link>
            <div className="flex items-start gap-4">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <span className={cn('inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium', getStatusColor(project.status))}>
                    <span className={cn('h-1.5 w-1.5 rounded-full', getStatusDot(project.status))} />
                    {project.status.replace('_', ' ')}
                  </span>
                  {project.healthScore != null && (
                    <span className={cn('text-xs font-medium', getHealthColor(project.healthScore))}>
                      Health: {project.healthScore}/100
                    </span>
                  )}
                </div>
                <h1 className="text-xl font-bold text-slate-900 dark:text-white">{project.name}</h1>
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  {project.client}{project.description ? ` · ${project.description.slice(0, 80)}${project.description.length > 80 ? '...' : ''}` : ''}
                </p>
              </div>

              {/* Stats strip */}
              <div className="hidden lg:flex items-center gap-6">
                <div className="text-center">
                  <p className="text-xs text-slate-500 dark:text-slate-400">Progress</p>
                  <p className="text-lg font-bold text-slate-900 dark:text-white">{project.completionPercent ?? 0}%</p>
                </div>
                <div className="text-center">
                  <p className="text-xs text-slate-500 dark:text-slate-400">Days Left</p>
                  <p className={cn('text-lg font-bold', daysLeft < 0 ? 'text-red-600' : daysLeft < 14 ? 'text-amber-600' : 'text-slate-900 dark:text-white')}>
                    {daysLeft < 0 ? `${Math.abs(daysLeft)}d over` : `${daysLeft}d`}
                  </p>
                </div>
                {project.budget != null && (
                  <div className="text-center">
                    <p className="text-xs text-slate-500 dark:text-slate-400">Budget</p>
                    <p className={cn('text-lg font-bold', budgetBurn > 90 ? 'text-red-600' : 'text-slate-900 dark:text-white')}>{budgetBurn}%</p>
                  </div>
                )}
                {(project.members ?? []).length > 0 && (
                  <div className="text-center">
                    <p className="text-xs text-slate-500 dark:text-slate-400">Team</p>
                    <div className="flex -space-x-1.5 justify-center mt-0.5">
                      {project.members.slice(0, 4).map((m: any) => (
                        <Avatar key={m.userId ?? m.id} className="h-6 w-6 border border-white dark:border-slate-900">
                          <AvatarFallback name={m.user?.name ?? ''} className="text-[9px]">{getInitials(m.user?.name ?? '?')}</AvatarFallback>
                        </Avatar>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="mt-3">
              <Progress value={project.completionPercent ?? 0} className="h-2" />
            </div>

            {/* Milestones */}
            {(project.milestones ?? []).length > 0 && (
              <div className="mt-3 flex flex-wrap gap-2">
                {project.milestones.map((m: any) => (
                  <span
                    key={m.id}
                    className={cn(
                      'inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium',
                      m.status === 'COMPLETED' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400' :
                      m.status === 'MISSED' ? 'bg-red-100 text-red-700' :
                      'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
                    )}
                  >
                    {m.status === 'COMPLETED' ? <CheckCircle2 className="h-3 w-3" /> : <Clock className="h-3 w-3" />}
                    {m.title}
                    <span className="text-[10px] opacity-70">{formatDate(m.dueDate)}</span>
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Tabs */}
          <div className="border-b border-slate-200 bg-white px-6 dark:border-slate-800 dark:bg-slate-950">
            <Tabs defaultValue="board">
              <TabsList className="bg-transparent p-0 gap-0 rounded-none border-0">
                {[
                  { value: 'board', label: 'Board' },
                  { value: 'overview', label: 'Overview' },
                  { value: 'team', label: 'Team' },
                  { value: 'logs', label: 'Activity' },
                ].map(tab => (
                  <TabsTrigger
                    key={tab.value}
                    value={tab.value}
                    className="rounded-none border-b-2 border-transparent px-4 py-2.5 text-sm font-medium text-slate-600 data-[state=active]:border-indigo-600 data-[state=active]:text-indigo-600 data-[state=active]:bg-transparent dark:text-slate-400 dark:data-[state=active]:text-indigo-400 dark:data-[state=active]:border-indigo-400"
                  >
                    {tab.label}
                  </TabsTrigger>
                ))}
              </TabsList>
            </Tabs>
          </div>

          {/* Board content */}
          <div className="flex-1 overflow-auto p-6">
            <KanbanBoard tasks={allTasks} projectId={project.id} />
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
