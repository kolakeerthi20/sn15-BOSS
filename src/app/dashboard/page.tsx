'use client';
import React from 'react';
import {
  FolderKanban, Users, AlertTriangle, TrendingUp, CheckSquare,
  Clock, Target, Activity, Flame, CalendarClock,
} from 'lucide-react';
import { useSession } from 'next-auth/react';
import { Header } from '@/components/layout/header';
import { StatsCard } from '@/components/dashboard/stats-card';
import { ActivityFeed } from '@/components/dashboard/activity-feed';
import { ProjectCard } from '@/components/projects/project-card';
import { TeamProductivityChart, ProjectHealthChart, StatusDistributionChart } from '@/components/analytics/charts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { useProjects } from '@/hooks/use-projects';
import { useTasks } from '@/hooks/use-tasks';
import { useResources } from '@/hooks/use-resources';
import { formatCurrency, getInitials, getUtilizationColor } from '@/lib/utils';

export default function DashboardPage() {
  const { data: session } = useSession();
  const { data: projects = [] } = useProjects();
  const { data: tasks = [] } = useTasks();
  const { data: resources = [] } = useResources();

  const atRiskProjects = projects.filter((p: any) => p.status === 'AT_RISK');
  const blockedTasks = tasks.filter((t: any) => t.status === 'BLOCKED');
  const activeProjects = projects.filter((p: any) => p.status === 'ACTIVE' || p.status === 'AT_RISK');
  const completedTasks = tasks.filter((t: any) => t.status === 'COMPLETED');
  const overdueTasks = tasks.filter((t: any) => {
    const due = t.dueDate ? new Date(t.dueDate) : null;
    return due && due < new Date() && t.status !== 'COMPLETED';
  });
  const avgUtilization = resources.length > 0
    ? Math.round(resources.reduce((a: number, r: any) => a + (r.utilization ?? 0), 0) / resources.length)
    : 0;

  const userName = session?.user?.name?.split(' ')[0] ?? 'there';

  return (
    <div className="flex flex-col min-h-screen">
      <Header title={`Good ${getTimeOfDay()}, ${userName} 👋`} />

      <div className="flex-1 p-6 space-y-6">
        {/* Alert banner */}
        {(atRiskProjects.length > 0 || blockedTasks.length > 0) && (
          <div className="flex items-center gap-3 rounded-xl bg-amber-50 border border-amber-200 px-4 py-3 dark:bg-amber-950/20 dark:border-amber-800">
            <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400 shrink-0" />
            <p className="text-sm text-amber-800 dark:text-amber-300">
              <span className="font-semibold">{atRiskProjects.length} project{atRiskProjects.length !== 1 ? 's' : ''} at risk</span>
              {blockedTasks.length > 0 && <> and <span className="font-semibold">{blockedTasks.length} blocked task{blockedTasks.length !== 1 ? 's' : ''}</span></>}
              {' '}require attention.
            </p>
          </div>
        )}

        {/* KPI Stats Grid */}
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <StatsCard
            title="Active Projects"
            value={activeProjects.length}
            subtitle={`${projects.length} total`}
            icon={FolderKanban}
            iconBg="bg-indigo-50 dark:bg-indigo-950"
            iconColor="text-indigo-600 dark:text-indigo-400"
          />
          <StatsCard
            title="Team Utilization"
            value={`${avgUtilization}%`}
            subtitle={`${resources.filter((r: any) => r.isActive).length}/${resources.length} active`}
            icon={Users}
            iconBg="bg-emerald-50 dark:bg-emerald-950"
            iconColor="text-emerald-600 dark:text-emerald-400"
          />
          <StatsCard
            title="Tasks Completed"
            value={completedTasks.length}
            subtitle="Total completed"
            icon={CheckSquare}
            iconBg="bg-violet-50 dark:bg-violet-950"
            iconColor="text-violet-600 dark:text-violet-400"
          />
          <StatsCard
            title="Overdue Tasks"
            value={overdueTasks.length}
            subtitle={`${blockedTasks.length} blocked`}
            icon={AlertTriangle}
            iconBg="bg-red-50 dark:bg-red-950"
            iconColor="text-red-600 dark:text-red-400"
          />
        </div>

        {/* Secondary stats */}
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <StatsCard
            title="Total Tasks"
            value={tasks.length}
            subtitle="All statuses"
            icon={TrendingUp}
            iconBg="bg-amber-50 dark:bg-amber-950"
            iconColor="text-amber-600 dark:text-amber-400"
          />
          <StatsCard
            title="In Progress"
            value={tasks.filter((t: any) => t.status === 'IN_PROGRESS').length}
            subtitle="Currently active"
            icon={Flame}
            iconBg="bg-orange-50 dark:bg-orange-950"
            iconColor="text-orange-600 dark:text-orange-400"
          />
          <StatsCard
            title="At Risk"
            value={atRiskProjects.length}
            subtitle="Needs attention"
            icon={CalendarClock}
            iconBg="bg-rose-50 dark:bg-rose-950"
            iconColor="text-rose-600 dark:text-rose-400"
          />
          <StatsCard
            title="Team Members"
            value={resources.length}
            subtitle={`${resources.filter((r: any) => r.utilization > 95).length} overloaded`}
            icon={Clock}
            iconBg="bg-cyan-50 dark:bg-cyan-950"
            iconColor="text-cyan-600 dark:text-cyan-400"
          />
        </div>

        {/* Main content grid */}
        <div className="grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <ActivityFeed />
          </div>
          <div>
            <ProjectHealthChart />
          </div>
        </div>

        {/* Charts row */}
        <div className="grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <TeamProductivityChart />
          </div>
          <div>
            <StatusDistributionChart />
          </div>
        </div>

        {/* Projects overview */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">Active Projects</h2>
            <a href="/projects" className="text-sm text-indigo-600 hover:underline dark:text-indigo-400">View all</a>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {activeProjects.slice(0, 6).map((p: any) => (
              <ProjectCard key={p.id} project={p} />
            ))}
          </div>
        </div>

        {/* Resource utilization */}
        {resources.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-sm flex items-center gap-2">
                <Activity className="h-4 w-4 text-indigo-600" />
                Resource Utilization
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {resources.slice(0, 6).map((r: any) => (
                <div key={r.id} className="flex items-center gap-3">
                  <Avatar className="h-7 w-7">
                    <AvatarFallback name={r.name} className="text-xs">{getInitials(r.name)}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-0.5">
                      <p className="text-xs font-medium text-slate-900 dark:text-slate-100 truncate">{r.name}</p>
                      <span className={`text-xs font-bold ${getUtilizationColor(r.utilization ?? 0)}`}>
                        {r.utilization ?? 0}%
                      </span>
                    </div>
                    <Progress
                      value={r.utilization ?? 0}
                      className="h-1.5"
                      indicatorClassName={
                        (r.utilization ?? 0) > 95 ? 'bg-red-500' :
                        (r.utilization ?? 0) > 85 ? 'bg-amber-500' : 'bg-emerald-500'
                      }
                    />
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}

function getTimeOfDay() {
  const h = new Date().getHours();
  if (h < 12) return 'morning';
  if (h < 17) return 'afternoon';
  return 'evening';
}
