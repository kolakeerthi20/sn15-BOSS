'use client';
import React from 'react';
import { Download, RefreshCw, TrendingUp, BarChart3, Zap } from 'lucide-react';
import { Header } from '@/components/layout/header';
import {
  TeamProductivityChart,
  BurndownChart,
  VelocityChart,
  StatusDistributionChart,
  ResourceUtilizationChart,
  ProjectHealthChart,
} from '@/components/analytics/charts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { useResources } from '@/hooks/use-resources';
import { useTasks } from '@/hooks/use-tasks';
import { getInitials } from '@/lib/utils';
import { Progress } from '@/components/ui/progress';

const AI_INSIGHTS = [
  { type: 'warning', icon: '⚠️', text: 'Monitor projects approaching their deadline — review burndown trends to identify delays early.' },
  { type: 'info', icon: '📊', text: 'Check resource utilization regularly to prevent overloading team members.' },
  { type: 'success', icon: '🚀', text: 'Teams logging daily stand their highest chance of on-time delivery. Keep the streak going.' },
  { type: 'info', icon: '🔮', text: 'Use velocity trends from recent sprints to set realistic commitments for the next sprint.' },
];

export default function AnalyticsPage() {
  const { data: resources = [] } = useResources();
  const { data: tasks = [] } = useTasks();

  return (
    <div className="flex flex-col min-h-screen">
      <Header title="Analytics & Reporting" />

      <div className="flex-1 p-6 space-y-6">
        {/* Toolbar */}
        <div className="flex items-center justify-between">
          <Tabs defaultValue="overview">
            <TabsList>
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="projects">Projects</TabsTrigger>
              <TabsTrigger value="resources">Resources</TabsTrigger>
              <TabsTrigger value="sprints">Sprints</TabsTrigger>
            </TabsList>
          </Tabs>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" className="gap-1.5">
              <RefreshCw className="h-3.5 w-3.5" />
              Refresh
            </Button>
            <Button variant="outline" size="sm" className="gap-1.5">
              <Download className="h-3.5 w-3.5" />
              Export
            </Button>
          </div>
        </div>

        {/* AI Insights */}
        <Card className="border-indigo-200 bg-gradient-to-r from-indigo-50 to-violet-50 dark:border-indigo-800 dark:from-indigo-950/30 dark:to-violet-950/30">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-sm">
              <Zap className="h-4 w-4 text-indigo-600" />
              AI-Powered Insights
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {AI_INSIGHTS.map((insight, i) => (
              <div
                key={i}
                className={`flex items-start gap-3 rounded-lg p-3 ${
                  insight.type === 'warning' ? 'bg-amber-50 dark:bg-amber-950/20' :
                  insight.type === 'success' ? 'bg-emerald-50 dark:bg-emerald-950/20' :
                  'bg-blue-50 dark:bg-blue-950/20'
                }`}
              >
                <span className="text-sm">{insight.icon}</span>
                <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed">{insight.text}</p>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Charts grid 1 */}
        <div className="grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <TeamProductivityChart />
          </div>
          <StatusDistributionChart />
        </div>

        {/* Charts grid 2 */}
        <div className="grid gap-6 lg:grid-cols-2">
          <BurndownChart />
          <VelocityChart />
        </div>

        {/* Charts grid 3 */}
        <div className="grid gap-6 lg:grid-cols-2">
          <ResourceUtilizationChart />
          <ProjectHealthChart />
        </div>

        {/* Contributor report */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-indigo-600" />
              Employee Contribution Report
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-100 dark:border-slate-800">
                    {['Employee', 'Dept', 'Tasks Done', 'Hours Logged', 'Avg Progress', 'Utilization', 'Score'].map(h => (
                      <th key={h} className="pb-3 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 first:pr-4">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50 dark:divide-slate-800/50">
                  {resources.map((user: any) => {
                    const userTasks = tasks.filter((t: any) => t.assigneeId === user.id);
                    const done = userTasks.filter((t: any) => t.status === 'COMPLETED').length;
                    const hours = userTasks.reduce((a: number, t: any) => a + (t.actualHours ?? 0), 0);
                    const avgProgress = userTasks.length > 0
                      ? Math.round(userTasks.reduce((a: number, t: any) => a + (t.progressPercent ?? 0), 0) / userTasks.length)
                      : 0;
                    const util = user.utilization ?? 0;
                    const score = Math.min(100, Math.round((done * 10) + (util * 0.3) + (avgProgress * 0.2)));
                    return (
                      <tr key={user.id} className="py-3">
                        <td className="py-3 pr-4">
                          <div className="flex items-center gap-2">
                            <Avatar className="h-6 w-6">
                              <AvatarFallback name={user.name} className="text-[9px]">{getInitials(user.name)}</AvatarFallback>
                            </Avatar>
                            <div>
                              <p className="text-xs font-medium text-slate-900 dark:text-slate-100">{user.name}</p>
                              <p className="text-[10px] text-slate-500">{user.designation}</p>
                            </div>
                          </div>
                        </td>
                        <td className="py-3 text-xs text-slate-500 dark:text-slate-400">{user.department ?? '—'}</td>
                        <td className="py-3 text-xs font-semibold text-slate-900 dark:text-slate-100">{done}</td>
                        <td className="py-3 text-xs text-slate-600 dark:text-slate-400">{hours}h</td>
                        <td className="py-3">
                          <div className="flex items-center gap-2">
                            <div className="h-1.5 w-16 rounded-full bg-slate-100 dark:bg-slate-800">
                              <div className="h-full rounded-full bg-indigo-500" style={{ width: `${avgProgress}%` }} />
                            </div>
                            <span className="text-xs text-slate-600 dark:text-slate-400">{avgProgress}%</span>
                          </div>
                        </td>
                        <td className="py-3">
                          <span className={`text-xs font-bold ${util > 95 ? 'text-red-600' : util > 85 ? 'text-amber-600' : 'text-emerald-600'}`}>
                            {util}%
                          </span>
                        </td>
                        <td className="py-3">
                          <div className="flex items-center gap-1.5">
                            <span className="text-sm font-bold text-slate-900 dark:text-slate-100">{score}</span>
                            <TrendingUp className="h-3 w-3 text-emerald-500" />
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                  {resources.length === 0 && (
                    <tr>
                      <td colSpan={7} className="py-8 text-center text-sm text-slate-500">No data yet.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
