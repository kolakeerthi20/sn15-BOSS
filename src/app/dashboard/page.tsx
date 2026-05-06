'use client';
import React from 'react';
import {
  FolderKanban, Users, AlertTriangle, TrendingUp, CheckSquare,
  Clock, Target, Activity, Flame, CalendarClock,
} from 'lucide-react';
import { Header } from '@/components/layout/header';
import { StatsCard } from '@/components/dashboard/stats-card';
import { ActivityFeed } from '@/components/dashboard/activity-feed';
import { ProjectCard } from '@/components/projects/project-card';
import { TeamProductivityChart, ProjectHealthChart, StatusDistributionChart } from '@/components/analytics/charts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { useAppStore } from '@/store/app-store';
import { MOCK_DASHBOARD_STATS, MOCK_ANALYTICS } from '@/lib/mock-data';
import { formatCurrency, getInitials, getUtilizationColor } from '@/lib/utils';

export default function DashboardPage() {
  const { projects, tasks, currentUser } = useAppStore();
  const stats = MOCK_DASHBOARD_STATS;
  const isManager = currentUser?.role === 'PROJECT_MANAGER' || currentUser?.role === 'ADMIN';
  const atRiskProjects = projects.filter(p => p.status === 'AT_RISK');
  const blockedTasks = tasks.filter(t => t.status === 'BLOCKED');

  return (
    <div className="flex flex-col min-h-screen">
      <Header title={`Good ${getTimeOfDay()}, ${currentUser?.name.split(' ')[0]} 👋`} />

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
            value={stats.activeProjects}
            subtitle={`${stats.totalProjects} total`}
            icon={FolderKanban}
            iconBg="bg-indigo-50 dark:bg-indigo-950"
            iconColor="text-indigo-600 dark:text-indigo-400"
            trend={{ value: 12, direction: 'up', label: 'vs last month' }}
          />
          <StatsCard
            title="Team Utilization"
            value={`${stats.avgUtilization.toFixed(0)}%`}
            subtitle={`${stats.activeResources}/${stats.totalResources} active`}
            icon={Users}
            iconBg="bg-emerald-50 dark:bg-emerald-950"
            iconColor="text-emerald-600 dark:text-emerald-400"
            trend={{ value: 5, direction: 'up', label: 'vs last week' }}
          />
          <StatsCard
            title="Tasks Completed"
            value={stats.tasksCompletedToday}
            subtitle="Today's output"
            icon={CheckSquare}
            iconBg="bg-violet-50 dark:bg-violet-950"
            iconColor="text-violet-600 dark:text-violet-400"
            trend={{ value: 8, direction: 'up', label: 'vs yesterday' }}
          />
          <StatsCard
            title="Overdue Tasks"
            value={stats.overdueTasks}
            subtitle={`${stats.upcomingDeadlines} due this week`}
            icon={AlertTriangle}
            iconBg="bg-red-50 dark:bg-red-950"
            iconColor="text-red-600 dark:text-red-400"
            trend={{ value: 2, direction: 'down', label: 'vs last week' }}
          />
        </div>

        {/* Secondary stats */}
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <StatsCard
            title="Productivity Score"
            value={`${stats.productivityScore}/100`}
            subtitle="Team-wide average"
            icon={TrendingUp}
            iconBg="bg-amber-50 dark:bg-amber-950"
            iconColor="text-amber-600 dark:text-amber-400"
          />
          <StatsCard
            title="Monthly Burn Rate"
            value={formatCurrency(stats.burnRate)}
            subtitle="Across all projects"
            icon={Flame}
            iconBg="bg-orange-50 dark:bg-orange-950"
            iconColor="text-orange-600 dark:text-orange-400"
          />
          <StatsCard
            title="Delayed Projects"
            value={stats.delayedProjects}
            subtitle="Needs escalation"
            icon={CalendarClock}
            iconBg="bg-rose-50 dark:bg-rose-950"
            iconColor="text-rose-600 dark:text-rose-400"
          />
          <StatsCard
            title="Upcoming Deadlines"
            value={stats.upcomingDeadlines}
            subtitle="Next 7 days"
            icon={Clock}
            iconBg="bg-cyan-50 dark:bg-cyan-950"
            iconColor="text-cyan-600 dark:text-cyan-400"
          />
        </div>

        {/* Main content grid */}
        <div className="grid gap-6 lg:grid-cols-3">
          {/* Activity feed */}
          <div className="lg:col-span-2">
            <ActivityFeed />
          </div>

          {/* Project health */}
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
            {projects.filter(p => p.status === 'ACTIVE' || p.status === 'AT_RISK').map(p => (
              <ProjectCard key={p.id} project={p} />
            ))}
          </div>
        </div>

        {/* Top performers */}
        <div className="grid gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm flex items-center gap-2">
                <Target className="h-4 w-4 text-indigo-600" />
                Top Performers This Week
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {MOCK_ANALYTICS.topPerformers.map((p, i) => (
                <div key={p.user.id} className="flex items-center gap-3">
                  <span className="w-4 text-xs font-bold text-slate-400">{i + 1}</span>
                  <Avatar className="h-7 w-7">
                    <AvatarFallback name={p.user.name} className="text-xs">{getInitials(p.user.name)}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-slate-900 dark:text-slate-100 truncate">{p.user.name}</p>
                    <p className="text-[10px] text-slate-500">{p.user.designation}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs font-bold text-indigo-600 dark:text-indigo-400">{p.score}</p>
                    <p className="text-[10px] text-slate-400">{p.tasksCompleted} tasks</p>
                  </div>
                  <div className="w-16">
                    <Progress value={p.score} className="h-1.5" indicatorClassName="bg-indigo-500" />
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm flex items-center gap-2">
                <Activity className="h-4 w-4 text-indigo-600" />
                Resource Utilization
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {MOCK_ANALYTICS.resourceUtilization.slice(0, 6).map(r => (
                <div key={r.userId} className="flex items-center gap-3">
                  <Avatar className="h-7 w-7">
                    <AvatarFallback name={r.user.name} className="text-xs">{getInitials(r.user.name)}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-0.5">
                      <p className="text-xs font-medium text-slate-900 dark:text-slate-100 truncate">{r.user.name}</p>
                      <span className={`text-xs font-bold ${getUtilizationColor(r.utilizationPercent)}`}>
                        {r.utilizationPercent}%
                      </span>
                    </div>
                    <Progress
                      value={r.utilizationPercent}
                      className="h-1.5"
                      indicatorClassName={
                        r.utilizationPercent > 95 ? 'bg-red-500' :
                        r.utilizationPercent > 85 ? 'bg-amber-500' : 'bg-emerald-500'
                      }
                    />
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
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
