'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { AppLayout } from '@/components/layout/app-layout';
import { resourcesApi, reportsApi } from '@/lib/api';
import { cn, utilizationColor, formatPercent, formatHours, getInitials, getAvatarColor } from '@/lib/utils';
import { Users, Gauge, Layers, Search } from 'lucide-react';
import { motion } from 'framer-motion';
import {
  RadarChart, Radar, PolarGrid, PolarAngleAxis, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
} from 'recharts';

const TABS = [
  { key: 'capacity', label: 'Capacity Planning', icon: Gauge },
  { key: 'workload', label: 'Workload Matrix', icon: Layers },
  { key: 'utilization', label: 'Utilization', icon: Users },
];

export default function ResourcesPage() {
  const [activeTab, setActiveTab] = useState('capacity');
  const [search, setSearch] = useState('');

  const { data: capacityData, isLoading: capLoading } = useQuery({
    queryKey: ['resources', 'capacity'],
    queryFn: () => resourcesApi.capacity(),
    enabled: activeTab === 'capacity',
  });

  const { data: workloadData } = useQuery({
    queryKey: ['resources', 'workload'],
    queryFn: () => resourcesApi.workload({ weeks: 4 }),
    enabled: activeTab === 'workload',
  });

  const { data: utilData } = useQuery({
    queryKey: ['reports', 'utilization'],
    queryFn: () => reportsApi.resourceUtilization(),
    enabled: activeTab === 'utilization',
  });

  const capacity = capacityData?.data || [];
  const workload = workloadData?.data || [];
  const utilization = utilData?.data || [];

  const filteredCapacity = capacity.filter((r: any) =>
    !search || `${r.first_name} ${r.last_name}`.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <AppLayout>
      <div className="p-6 max-w-7xl mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-foreground">Resource Management</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Capacity planning, workload, and utilization insights</p>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 border-b border-border mb-6">
          {TABS.map((tab) => (
            <button key={tab.key} onClick={() => setActiveTab(tab.key)}
              className={cn('flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition',
                activeTab === tab.key ? 'border-brand-500 text-brand-600' : 'border-transparent text-muted-foreground hover:text-foreground')}>
              <tab.icon size={15} />
              {tab.label}
            </button>
          ))}
        </div>

        {/* Capacity Planning */}
        {activeTab === 'capacity' && (
          <div className="space-y-4">
            <div className="flex items-center gap-3 mb-4">
              <div className="relative">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <input value={search} onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search resources..." className="pl-8 pr-3 py-2 border border-border rounded-lg text-sm bg-background w-48" />
              </div>
              <div className="flex gap-3 text-xs text-muted-foreground">
                <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-green-400 inline-block" /> Under 70%</span>
                <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-amber-400 inline-block" /> 70-90%</span>
                <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-red-400 inline-block" /> 90%+</span>
              </div>
            </div>

            {capLoading ? (
              <div className="space-y-3">{[...Array(6)].map((_, i) => <div key={i} className="h-20 skeleton rounded-xl" />)}</div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {filteredCapacity.map((person: any, i: number) => (
                  <motion.div key={person.id}
                    initial={{ opacity: 0, scale: 0.97 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: i * 0.04 }}
                    className="bg-card border border-border rounded-xl p-4"
                  >
                    <div className="flex items-center gap-3 mb-3">
                      <div className={cn('w-10 h-10 rounded-full flex items-center justify-center text-white text-sm font-medium', getAvatarColor(`${person.first_name} ${person.last_name}`))}>
                        {getInitials(`${person.first_name} ${person.last_name}`)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-foreground text-sm">{person.first_name} {person.last_name}</div>
                        <div className="text-xs text-muted-foreground">{person.department}</div>
                      </div>
                      <span className={cn('text-xs font-bold px-2 py-1 rounded-lg', utilizationColor(person.allocation_pct))}>
                        {formatPercent(person.allocation_pct)}
                      </span>
                    </div>

                    <div className="mb-2">
                      <div className="h-2.5 bg-muted rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all duration-700"
                          style={{
                            width: `${Math.min(person.allocation_pct || 0, 100)}%`,
                            background: person.allocation_pct >= 90 ? '#ef4444' :
                                       person.allocation_pct >= 70 ? '#f59e0b' : '#10b981',
                          }}
                        />
                      </div>
                    </div>

                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>Capacity: {person.daily_capacity * 5}h/wk</span>
                      <span>Allocated: {formatHours(person.allocated_hours)}</span>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Workload Matrix */}
        {activeTab === 'workload' && (
          <div className="space-y-4">
            <div className="bg-card border border-border rounded-xl p-5">
              <h3 className="font-semibold text-foreground mb-4">Workload by Person & Project (Next 4 Weeks)</h3>
              {workload.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">No workload data</div>
              ) : (
                <ResponsiveContainer width="100%" height={350}>
                  <BarChart data={
                    Object.entries(
                      workload.reduce((acc: any, item: any) => {
                        const name = item.full_name;
                        if (!acc[name]) acc[name] = { name };
                        acc[name][item.project_name] = item.remaining_hours;
                        return acc;
                      }, {})
                    ).map(([_, v]) => v)
                  }>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} />
                    <Tooltip />
                    {Array.from(new Set(workload.map((w: any) => w.project_name))).map((proj: any, i) => (
                      <Bar key={proj} dataKey={proj} stackId="a"
                        fill={['#6366f1','#10b981','#f59e0b','#ef4444','#8b5cf6'][i % 5]}
                        radius={i === 0 ? [0, 0, 4, 4] : undefined} />
                    ))}
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>
        )}

        {/* Utilization */}
        {activeTab === 'utilization' && (
          <div className="space-y-3">
            {utilization.map((person: any, i: number) => (
              <motion.div key={person.user_id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.04 }}
                className="bg-card border border-border rounded-xl p-4"
              >
                <div className="flex items-center gap-4">
                  <div className={cn('w-10 h-10 rounded-full flex items-center justify-center text-white text-sm font-medium flex-shrink-0',
                    getAvatarColor(person.full_name))}>
                    {getInitials(person.full_name)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="font-medium text-foreground text-sm">{person.full_name}</span>
                      <span className={cn('text-xs font-bold px-2 py-0.5 rounded-lg', utilizationColor(person.utilization_pct_week))}>
                        {formatPercent(person.utilization_pct_week)} utilization
                      </span>
                    </div>
                    <div className="h-2 bg-muted rounded-full overflow-hidden mb-1.5">
                      <div className="h-full rounded-full transition-all"
                        style={{
                          width: `${Math.min(person.utilization_pct_week || 0, 100)}%`,
                          background: person.utilization_pct_week >= 90 ? '#ef4444' :
                                     person.utilization_pct_week >= 70 ? '#f59e0b' : '#10b981',
                        }} />
                    </div>
                    <div className="flex gap-4 text-xs text-muted-foreground">
                      <span>{formatHours(person.hours_last_7_days)} this week</span>
                      <span>{person.active_tasks} active tasks</span>
                      <span>{person.active_projects} projects</span>
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </AppLayout>
  );
}
