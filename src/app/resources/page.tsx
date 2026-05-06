'use client';
import React, { useState } from 'react';
import { Search, Briefcase, Clock, TrendingUp, Award } from 'lucide-react';
import { Header } from '@/components/layout/header';
import { ResourceUtilizationChart } from '@/components/analytics/charts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { useAppStore } from '@/store/app-store';
import { getInitials, getUtilizationColor } from '@/lib/utils';
import { cn } from '@/lib/utils';

export default function ResourcesPage() {
  const { users, tasks } = useAppStore();
  const [search, setSearch] = useState('');
  const [dept, setDept] = useState('ALL');

  const departments = ['ALL', ...Array.from(new Set(users.map(u => u.department)))];

  const filtered = users.filter(u => {
    const matchSearch = u.name.toLowerCase().includes(search.toLowerCase()) ||
      u.designation.toLowerCase().includes(search.toLowerCase());
    const matchDept = dept === 'ALL' || u.department === dept;
    return matchSearch && matchDept;
  });

  return (
    <div className="flex flex-col min-h-screen">
      <Header title="Resources" />
      <div className="flex-1 p-6 space-y-6">
        {/* Summary cards */}
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {[
            { label: 'Total Resources', value: users.length, icon: Briefcase, color: 'text-indigo-600', bg: 'bg-indigo-50 dark:bg-indigo-950' },
            { label: 'Avg Utilization', value: `${Math.round(users.reduce((a, u) => a + u.utilization, 0) / users.length)}%`, icon: TrendingUp, color: 'text-emerald-600', bg: 'bg-emerald-50 dark:bg-emerald-950' },
            { label: 'Overloaded', value: users.filter(u => u.utilization > 95).length, icon: Clock, color: 'text-red-600', bg: 'bg-red-50 dark:bg-red-950' },
            { label: 'Departments', value: departments.length - 1, icon: Award, color: 'text-violet-600', bg: 'bg-violet-50 dark:bg-violet-950' },
          ].map(s => (
            <Card key={s.label}>
              <CardContent className="p-5 flex items-center gap-4">
                <div className={cn('flex h-10 w-10 items-center justify-center rounded-xl', s.bg)}>
                  <s.icon className={cn('h-5 w-5', s.color)} />
                </div>
                <div>
                  <p className="text-xs text-slate-500 dark:text-slate-400">{s.label}</p>
                  <p className="text-xl font-bold text-slate-900 dark:text-white">{s.value}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          {/* Resource list */}
          <div className="lg:col-span-2 space-y-4">
            {/* Filters */}
            <div className="flex items-center gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search resources..."
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  className="h-9 w-full rounded-lg border border-slate-200 bg-white pl-9 pr-3 text-sm placeholder:text-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
                />
              </div>
              <select
                value={dept}
                onChange={e => setDept(e.target.value)}
                className="h-9 rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-700 focus:border-indigo-500 focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
              >
                {departments.map(d => <option key={d} value={d}>{d === 'ALL' ? 'All Departments' : d}</option>)}
              </select>
            </div>

            {/* Cards */}
            <div className="grid gap-4 sm:grid-cols-2">
              {filtered.map(user => {
                const userTasks = tasks.filter(t => t.assigneeId === user.id);
                const activeTasks = userTasks.filter(t => t.status === 'IN_PROGRESS');
                const blockedTasks = userTasks.filter(t => t.status === 'BLOCKED');

                return (
                  <Card key={user.id} className="overflow-hidden hover:shadow-md transition-shadow">
                    <CardContent className="p-4">
                      <div className="flex items-start gap-3 mb-3">
                        <Avatar className="h-10 w-10">
                          <AvatarFallback name={user.name} className="text-sm">{getInitials(user.name)}</AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-sm text-slate-900 dark:text-slate-100 truncate">{user.name}</p>
                          <p className="text-xs text-slate-500 dark:text-slate-400 truncate">{user.designation}</p>
                          <span className="mt-1 inline-block rounded-full bg-slate-100 px-2 py-0.5 text-[10px] text-slate-600 dark:bg-slate-800 dark:text-slate-400">
                            {user.department}
                          </span>
                        </div>
                        <div className={cn('text-sm font-bold', getUtilizationColor(user.utilization))}>
                          {user.utilization}%
                        </div>
                      </div>

                      {/* Utilization bar */}
                      <div className="mb-3">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-[10px] text-slate-500">Utilization</span>
                          {user.utilization > 95 && (
                            <span className="text-[10px] font-medium text-red-600 dark:text-red-400">Overloaded</span>
                          )}
                        </div>
                        <Progress
                          value={user.utilization}
                          className="h-1.5"
                          indicatorClassName={user.utilization > 95 ? 'bg-red-500' : user.utilization > 85 ? 'bg-amber-500' : 'bg-emerald-500'}
                        />
                      </div>

                      {/* Task counts */}
                      <div className="flex gap-2 text-xs mb-3">
                        <span className="rounded-md bg-blue-50 px-2 py-0.5 text-blue-700 dark:bg-blue-950/30 dark:text-blue-400">
                          {activeTasks.length} active
                        </span>
                        {blockedTasks.length > 0 && (
                          <span className="rounded-md bg-red-50 px-2 py-0.5 text-red-700 dark:bg-red-950/30 dark:text-red-400">
                            {blockedTasks.length} blocked
                          </span>
                        )}
                        <span className="rounded-md bg-slate-100 px-2 py-0.5 text-slate-600 dark:bg-slate-800 dark:text-slate-400">
                          {userTasks.length} total
                        </span>
                      </div>

                      {/* Skills */}
                      <div className="flex flex-wrap gap-1">
                        {user.skills.slice(0, 3).map(skill => (
                          <span key={skill} className="rounded-full bg-indigo-50 px-2 py-0.5 text-[10px] font-medium text-indigo-600 dark:bg-indigo-950/30 dark:text-indigo-400">
                            {skill}
                          </span>
                        ))}
                        {user.skills.length > 3 && (
                          <span className="text-[10px] text-slate-400 self-center">+{user.skills.length - 3}</span>
                        )}
                      </div>

                      {user.billableRate && (
                        <p className="mt-2 text-[10px] text-slate-400">
                          ${user.billableRate}/hr billable
                        </p>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>

          {/* Utilization chart */}
          <div className="space-y-4">
            <ResourceUtilizationChart />
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Workload Distribution</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {[
                  { label: 'Optimal (70–85%)', count: users.filter(u => u.utilization >= 70 && u.utilization <= 85).length, color: 'bg-emerald-500' },
                  { label: 'High (86–95%)', count: users.filter(u => u.utilization > 85 && u.utilization <= 95).length, color: 'bg-amber-500' },
                  { label: 'Overloaded (>95%)', count: users.filter(u => u.utilization > 95).length, color: 'bg-red-500' },
                  { label: 'Underutilized (<70%)', count: users.filter(u => u.utilization < 70).length, color: 'bg-slate-400' },
                ].map(item => (
                  <div key={item.label} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className={cn('h-2.5 w-2.5 rounded-full', item.color)} />
                      <span className="text-xs text-slate-600 dark:text-slate-400">{item.label}</span>
                    </div>
                    <span className="text-xs font-semibold text-slate-900 dark:text-slate-100">{item.count} people</span>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
