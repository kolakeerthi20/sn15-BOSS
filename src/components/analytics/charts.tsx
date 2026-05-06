'use client';
import React from 'react';
import {
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  AreaChart, Area,
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useResources } from '@/hooks/use-resources';
import { useTasks } from '@/hooks/use-tasks';
import { useProjects } from '@/hooks/use-projects';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';

const CHART_COLORS = {
  indigo: '#6366f1',
  emerald: '#10b981',
  amber: '#f59e0b',
  rose: '#f43f5e',
  violet: '#8b5cf6',
  cyan: '#06b6d4',
  orange: '#f97316',
  slate: '#94a3b8',
};

const STATUS_COLORS: Record<string, string> = {
  COMPLETED: CHART_COLORS.emerald,
  IN_PROGRESS: CHART_COLORS.indigo,
  NOT_STARTED: CHART_COLORS.slate,
  BLOCKED: CHART_COLORS.rose,
  IN_REVIEW: CHART_COLORS.violet,
};

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-3 shadow-lg dark:border-slate-700 dark:bg-slate-900">
      <p className="mb-1.5 text-xs font-semibold text-slate-700 dark:text-slate-300">{label}</p>
      {payload.map((entry: any) => (
        <div key={entry.name} className="flex items-center gap-2 text-xs">
          <span className="h-2 w-2 rounded-full" style={{ background: entry.color }} />
          <span className="text-slate-600 dark:text-slate-400">{entry.name}:</span>
          <span className="font-medium text-slate-900 dark:text-slate-100">{entry.value}</span>
        </div>
      ))}
    </div>
  );
};

export function TeamProductivityChart() {
  const { data: productivity = [] } = useQuery({
    queryKey: ['analytics', 'productivity'],
    queryFn: api.analytics.productivity,
    staleTime: 60_000,
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm">Team Productivity — Last 7 Days</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={220}>
          <AreaChart data={productivity} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
            <defs>
              <linearGradient id="tasksGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={CHART_COLORS.indigo} stopOpacity={0.15} />
                <stop offset="95%" stopColor={CHART_COLORS.indigo} stopOpacity={0} />
              </linearGradient>
              <linearGradient id="hoursGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={CHART_COLORS.emerald} stopOpacity={0.15} />
                <stop offset="95%" stopColor={CHART_COLORS.emerald} stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
            <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
            <Tooltip content={<CustomTooltip />} />
            <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11 }} />
            <Area type="monotone" dataKey="tasksCompleted" name="Tasks Completed" stroke={CHART_COLORS.indigo} strokeWidth={2} fill="url(#tasksGrad)" dot={{ r: 3, fill: CHART_COLORS.indigo }} />
            <Area type="monotone" dataKey="hoursLogged" name="Hours Logged" stroke={CHART_COLORS.emerald} strokeWidth={2} fill="url(#hoursGrad)" dot={{ r: 3, fill: CHART_COLORS.emerald }} />
          </AreaChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}

// Static sprint data — will be replaced with real sprint tracking once Sprints are seeded
const BURNDOWN_DATA = [
  { date: 'Day 1', ideal: 80, remaining: 80 },
  { date: 'Day 3', ideal: 60, remaining: 65 },
  { date: 'Day 5', ideal: 40, remaining: 50 },
  { date: 'Day 7', ideal: 20, remaining: 38 },
  { date: 'Day 9', ideal: 0, remaining: 22 },
];

const VELOCITY_DATA = [
  { sprint: 'S1', committed: 30, completed: 27 },
  { sprint: 'S2', committed: 35, completed: 34 },
  { sprint: 'S3', committed: 38, completed: 40 },
  { sprint: 'S4', committed: 40, completed: 36 },
  { sprint: 'S5', committed: 38, completed: null },
];

export function BurndownChart() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm">Sprint Burndown</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={220}>
          <LineChart data={BURNDOWN_DATA} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
            <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
            <Tooltip content={<CustomTooltip />} />
            <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11 }} />
            <Line type="monotone" dataKey="ideal" name="Ideal" stroke={CHART_COLORS.slate} strokeWidth={2} strokeDasharray="5 5" dot={false} />
            <Line type="monotone" dataKey="remaining" name="Remaining" stroke={CHART_COLORS.indigo} strokeWidth={2.5} dot={{ r: 4, fill: CHART_COLORS.indigo }} activeDot={{ r: 6 }} />
          </LineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}

export function VelocityChart() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm">Sprint Velocity</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={VELOCITY_DATA} margin={{ top: 5, right: 5, left: -20, bottom: 0 }} barGap={4}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
            <XAxis dataKey="sprint" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
            <Tooltip content={<CustomTooltip />} />
            <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11 }} />
            <Bar dataKey="committed" name="Committed" fill={CHART_COLORS.slate} radius={[4, 4, 0, 0]} />
            <Bar dataKey="completed" name="Completed" fill={CHART_COLORS.indigo} radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}

export function StatusDistributionChart() {
  const { data: tasks = [] } = useTasks();

  const counts: Record<string, number> = {};
  tasks.forEach((t: any) => { counts[t.status] = (counts[t.status] ?? 0) + 1; });
  const distribution = Object.entries(counts).map(([status, count]) => ({ status, count }));
  const total = tasks.length;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm">Task Status Distribution</CardTitle>
      </CardHeader>
      <CardContent>
        {total === 0 ? (
          <p className="py-8 text-center text-xs text-slate-500">No tasks yet.</p>
        ) : (
          <div className="flex items-center gap-4">
            <ResponsiveContainer width={160} height={160}>
              <PieChart>
                <Pie
                  data={distribution}
                  cx="50%"
                  cy="50%"
                  innerRadius={45}
                  outerRadius={70}
                  paddingAngle={3}
                  dataKey="count"
                >
                  {distribution.map((entry, i) => (
                    <Cell key={entry.status} fill={STATUS_COLORS[entry.status] ?? CHART_COLORS.slate} />
                  ))}
                </Pie>
                <Tooltip formatter={(value: any) => [`${value} (${Math.round(Number(value) / total * 100)}%)`, '']} />
              </PieChart>
            </ResponsiveContainer>
            <div className="flex-1 space-y-2">
              {distribution.map(entry => (
                <div key={entry.status} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full" style={{ background: STATUS_COLORS[entry.status] ?? CHART_COLORS.slate }} />
                    <span className="text-xs text-slate-600 dark:text-slate-400">{entry.status.replace('_', ' ')}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-slate-900 dark:text-slate-100">{entry.count}</span>
                    <span className="text-[10px] text-slate-400">{Math.round(entry.count / total * 100)}%</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export function ResourceUtilizationChart() {
  const { data: resources = [] } = useResources();
  const data = resources.map((r: any) => ({
    name: r.name?.split(' ')[0] ?? '?',
    utilization: r.utilization ?? 0,
  }));

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm">Resource Utilization %</CardTitle>
      </CardHeader>
      <CardContent>
        {data.length === 0 ? (
          <p className="py-8 text-center text-xs text-slate-500">No resources yet.</p>
        ) : (
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={data} layout="vertical" margin={{ top: 0, right: 10, left: 30, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
              <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} tickFormatter={v => `${v}%`} />
              <YAxis type="category" dataKey="name" tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} width={45} />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="utilization" name="Utilization %" radius={[0, 4, 4, 0]} maxBarSize={20}>
                {data.map((entry: any, i: number) => (
                  <Cell
                    key={i}
                    fill={entry.utilization > 95 ? CHART_COLORS.rose : entry.utilization > 85 ? CHART_COLORS.amber : CHART_COLORS.indigo}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
}

export function ProjectHealthChart() {
  const { data: projects = [] } = useProjects();
  const healthData = projects
    .filter((p: any) => p.healthScore != null)
    .map((p: any) => ({ name: p.name, score: p.healthScore }));

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm">Project Health Scores</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {healthData.length === 0 ? (
          <p className="py-4 text-center text-xs text-slate-500">No projects with health scores yet.</p>
        ) : (
          healthData.map((p: any) => (
            <div key={p.name}>
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-medium text-slate-700 dark:text-slate-300 truncate max-w-[60%]">{p.name}</span>
                <span className={`text-xs font-bold ${p.score >= 80 ? 'text-emerald-600' : p.score >= 60 ? 'text-amber-600' : 'text-red-600'}`}>
                  {p.score}/100
                </span>
              </div>
              <div className="h-2 w-full rounded-full bg-slate-100 dark:bg-slate-800">
                <div
                  className={`h-full rounded-full transition-all ${p.score >= 80 ? 'bg-emerald-500' : p.score >= 60 ? 'bg-amber-500' : 'bg-red-500'}`}
                  style={{ width: `${p.score}%` }}
                />
              </div>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
}
