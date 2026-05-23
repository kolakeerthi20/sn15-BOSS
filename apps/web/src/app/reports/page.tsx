'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  BarChart, Bar, AreaChart, Area, LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, Cell, PieChart, Pie,
} from 'recharts';
import { AppLayout } from '@/components/layout/app-layout';
import { reportsApi } from '@/lib/api';
import { cn, formatPercent, formatHours, utilizationColor, getAvatarColor, getInitials, formatDate } from '@/lib/utils';
import { TrendingUp, Users, Clock, AlertOctagon, BarChart2, Trophy, X, Calendar, CheckCircle2, AlertCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const TABS = [
  { key: 'overview', label: 'Overview', icon: BarChart2 },
  { key: 'team', label: 'Team Performance', icon: Trophy },
  { key: 'utilization', label: 'Resource Utilization', icon: Users },
  { key: 'time', label: 'Time Report', icon: Clock },
  { key: 'bottlenecks', label: 'Bottlenecks', icon: AlertOctagon },
];

const PRIORITY_COLORS: Record<string, string> = {
  critical: '#ef4444',
  high: '#f97316',
  medium: '#f59e0b',
  low: '#10b981',
};

export default function ReportsPage() {
  const [activeTab, setActiveTab] = useState('overview');
  const [utilPeriod, setUtilPeriod] = useState({ start: '', end: '' });
  const [teamDays, setTeamDays] = useState(30);
  const [selectedMember, setSelectedMember] = useState<any>(null);

  const { data: dashData } = useQuery({
    queryKey: ['reports', 'executive'],
    queryFn: () => reportsApi.executiveDashboard(),
    enabled: activeTab === 'overview',
  });

  const { data: utilData, isLoading: utilLoading } = useQuery({
    queryKey: ['reports', 'utilization', utilPeriod],
    queryFn: () => reportsApi.resourceUtilization(utilPeriod),
    enabled: activeTab === 'utilization',
  });

  const { data: timeData } = useQuery({
    queryKey: ['reports', 'time'],
    queryFn: () => reportsApi.timeReport({ groupBy: 'user' }),
    enabled: activeTab === 'time',
  });

  const { data: bottleneckData } = useQuery({
    queryKey: ['reports', 'bottlenecks'],
    queryFn: () => reportsApi.bottlenecks(),
    enabled: activeTab === 'bottlenecks',
  });

  const teamStartDate = new Date(Date.now() - teamDays * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
  const teamEndDate = new Date().toISOString().split('T')[0];

  const { data: teamPerfData, isLoading: teamLoading } = useQuery({
    queryKey: ['reports', 'team-performance', teamDays],
    queryFn: () => reportsApi.teamPerformance({ startDate: teamStartDate, endDate: teamEndDate }),
    enabled: activeTab === 'team',
  });

  const { data: memberReportData } = useQuery({
    queryKey: ['reports', 'employee', selectedMember?.id, teamStartDate, teamEndDate],
    queryFn: () => reportsApi.employeeReport(selectedMember.id, { startDate: teamStartDate, endDate: teamEndDate }),
    enabled: !!selectedMember,
  });

  const utilization = utilData?.data || [];
  const timeReport = timeData?.data || [];
  const bottlenecks = bottleneckData?.data || [];
  const teamMembers: any[] = teamPerfData?.data?.members || [];
  const activityData: any[] = teamPerfData?.data?.activityData || [];

  return (
    <AppLayout>
      <div className="p-6 max-w-7xl mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-foreground">Reports & Analytics</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Insights across projects, resources, and time</p>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 border-b border-border mb-6">
          {TABS.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={cn(
                'flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition',
                activeTab === tab.key
                  ? 'border-brand-500 text-brand-600'
                  : 'border-transparent text-muted-foreground hover:text-foreground',
              )}
            >
              <tab.icon size={15} />
              {tab.label}
            </button>
          ))}
        </div>

        {/* Overview */}
        {activeTab === 'overview' && <OverviewTab data={dashData?.data} />}

        {/* Team Performance */}
        {activeTab === 'team' && (
          <div className="space-y-6">
            {/* Period filter */}
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Period:</span>
              {[7, 30, 90].map((d) => (
                <button
                  key={d}
                  onClick={() => setTeamDays(d)}
                  className={cn(
                    'px-3 py-1.5 rounded-lg text-sm font-medium border transition',
                    teamDays === d
                      ? 'bg-brand-50 border-brand-300 text-brand-700'
                      : 'border-border text-muted-foreground hover:bg-accent',
                  )}
                >
                  Last {d} days
                </button>
              ))}
            </div>

            {/* Hours Bar Chart */}
            {teamMembers.length > 0 && (
              <div className="bg-card border border-border rounded-xl p-5">
                <h3 className="font-semibold text-foreground mb-4">Hours Logged by Member</h3>
                <ResponsiveContainer width="100%" height={260}>
                  <BarChart data={teamMembers.slice(0, 10).map((m: any) => ({
                    name: `${m.first_name} ${m.last_name}`.split(' ')[0],
                    hours: parseFloat(m.hours_logged) || 0,
                    completed: parseInt(m.completed_tasks) || 0,
                  }))}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="name" tick={{ fontSize: 11 }} tickLine={false} />
                    <YAxis tick={{ fontSize: 11 }} tickLine={false} />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="hours" fill="#6366f1" name="Hours" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="completed" fill="#10b981" name="Tasks Done" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}

            {/* Leaderboard */}
            {teamLoading ? (
              <div className="space-y-3">{[...Array(5)].map((_, i) => (
                <div key={i} className="h-24 skeleton rounded-xl" />
              ))}</div>
            ) : teamMembers.length === 0 ? (
              <div className="text-center py-12">
                <Trophy size={40} className="mx-auto mb-3 text-muted-foreground opacity-30" />
                <p className="text-muted-foreground">No team data for this period</p>
              </div>
            ) : (
              <div className="space-y-3">
                {teamMembers.map((member: any, i: number) => {
                  const total = parseInt(member.total_tasks) || 0;
                  const completed = parseInt(member.completed_tasks) || 0;
                  const completionRate = total > 0 ? Math.round((completed / total) * 100) : 0;
                  const mood = parseFloat(member.avg_mood) || 0;
                  const moodEmoji = mood >= 4 ? '😊' : mood >= 2.5 ? '😐' : mood > 0 ? '😟' : '—';
                  const perfColor = completionRate >= 70 ? 'border-green-200 bg-green-50/30' :
                                    completionRate >= 40 ? 'border-amber-200 bg-amber-50/30' :
                                    'border-red-200 bg-red-50/30';
                  const medal = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : null;

                  return (
                    <motion.div
                      key={member.id}
                      initial={{ opacity: 0, x: -12 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.05 }}
                      className={cn('bg-card border rounded-xl p-4', perfColor)}
                    >
                      <div className="flex items-center gap-4">
                        {/* Rank + Avatar */}
                        <div className="flex items-center gap-2 flex-shrink-0">
                          {medal ? (
                            <span className="text-xl">{medal}</span>
                          ) : (
                            <span className="text-sm font-bold text-muted-foreground w-6 text-center">#{i + 1}</span>
                          )}
                          <div className={cn(
                            'w-10 h-10 rounded-full flex items-center justify-center text-white text-sm font-medium',
                            getAvatarColor(`${member.first_name} ${member.last_name}`),
                          )}>
                            {getInitials(`${member.first_name} ${member.last_name}`)}
                          </div>
                        </div>

                        {/* Info */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-semibold text-foreground">
                              {member.first_name} {member.last_name}
                            </span>
                            {member.designation && (
                              <span className="text-xs text-muted-foreground">{member.designation}</span>
                            )}
                            <span className="ml-auto text-lg">{moodEmoji}</span>
                          </div>

                          {/* Stats row */}
                          <div className="flex items-center gap-4 text-xs text-muted-foreground mb-2 flex-wrap">
                            <span className="flex items-center gap-1">
                              <CheckCircle2 size={11} className="text-green-500" />
                              <strong className="text-foreground">{completed}</strong> done
                            </span>
                            <span className="flex items-center gap-1">
                              <Clock size={11} />
                              <strong className="text-foreground">{parseFloat(member.hours_logged).toFixed(1)}h</strong> logged
                            </span>
                            <span className="flex items-center gap-1">
                              <AlertCircle size={11} className="text-amber-500" />
                              <strong className="text-foreground">{member.active_tasks}</strong> active
                            </span>
                            {parseInt(member.overdue_tasks) > 0 && (
                              <span className="text-red-600 flex items-center gap-1">
                                <strong>{member.overdue_tasks}</strong> overdue
                              </span>
                            )}
                            <span><strong className="text-foreground">{member.days_submitted}</strong> days logged</span>
                          </div>

                          {/* Completion rate bar */}
                          <div className="flex items-center gap-2">
                            <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
                              <div
                                className="h-full rounded-full transition-all"
                                style={{
                                  width: `${completionRate}%`,
                                  background: completionRate >= 70 ? '#10b981' :
                                              completionRate >= 40 ? '#f59e0b' : '#ef4444',
                                }}
                              />
                            </div>
                            <span className="text-xs font-medium text-muted-foreground w-10 text-right">
                              {completionRate}%
                            </span>
                          </div>
                        </div>

                        {/* View Details */}
                        <button
                          onClick={() => setSelectedMember(member)}
                          className="text-xs text-brand-600 hover:underline flex-shrink-0 px-3 py-1.5 border border-brand-200 rounded-lg hover:bg-brand-50 transition"
                        >
                          Details
                        </button>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Resource Utilization */}
        {activeTab === 'utilization' && (
          <div className="space-y-6">
            <div className="flex gap-3">
              <input type="date" value={utilPeriod.start}
                onChange={(e) => setUtilPeriod(p => ({ ...p, start: e.target.value }))}
                className="px-3 py-2 border border-border rounded-lg text-sm bg-background" />
              <span className="flex items-center text-muted-foreground">to</span>
              <input type="date" value={utilPeriod.end}
                onChange={(e) => setUtilPeriod(p => ({ ...p, end: e.target.value }))}
                className="px-3 py-2 border border-border rounded-lg text-sm bg-background" />
            </div>

            {utilLoading ? (
              <div className="space-y-2">{[...Array(5)].map((_, i) => <div key={i} className="h-16 skeleton rounded-xl" />)}</div>
            ) : (
              <div className="space-y-3">
                {utilization.map((person: any, i: number) => (
                  <motion.div key={person.id}
                    initial={{ opacity: 0, x: -12 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.05 }}
                    className="bg-card border border-border rounded-xl p-4"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-9 h-9 rounded-full bg-brand-100 flex items-center justify-center text-brand-700 text-sm font-medium flex-shrink-0">
                        {person.first_name?.[0]}{person.last_name?.[0]}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-sm font-medium text-foreground">
                            {person.first_name} {person.last_name}
                          </span>
                          <span className={cn('text-xs font-semibold px-2 py-0.5 rounded-full', utilizationColor(person.utilization_pct))}>
                            {formatPercent(person.utilization_pct)}
                          </span>
                        </div>
                        <div className="h-2 bg-muted rounded-full overflow-hidden">
                          <div
                            className="h-full rounded-full transition-all"
                            style={{
                              width: `${Math.min(person.utilization_pct || 0, 100)}%`,
                              background: person.utilization_pct >= 90 ? '#ef4444' :
                                         person.utilization_pct >= 70 ? '#f59e0b' : '#10b981',
                            }}
                          />
                        </div>
                        <div className="flex gap-4 mt-1.5 text-xs text-muted-foreground">
                          <span>{formatHours(person.total_logged_hours)} logged</span>
                          <span>{person.active_tasks} active tasks</span>
                          <span>{person.active_projects} projects</span>
                          <span className="text-foreground">{person.department}</span>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Time Report */}
        {activeTab === 'time' && (
          <div className="space-y-6">
            <div className="bg-card border border-border rounded-xl p-5">
              <h3 className="font-semibold text-foreground mb-4">Hours by Team Member (Last 30 days)</h3>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={timeReport.slice(0, 10)}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} tickLine={false} />
                  <YAxis tick={{ fontSize: 11 }} tickLine={false} />
                  <Tooltip />
                  <Bar dataKey="total_hours" fill="#6366f1" name="Total Hours" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="billable_hours" fill="#10b981" name="Billable" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {/* Bottlenecks */}
        {activeTab === 'bottlenecks' && (
          <div className="space-y-3">
            {bottlenecks.length === 0 ? (
              <div className="text-center py-16">
                <div className="text-4xl mb-3">✅</div>
                <p className="text-lg font-medium">No bottlenecks detected</p>
                <p className="text-sm text-muted-foreground mt-1">All tasks are moving forward</p>
              </div>
            ) : (
              bottlenecks.map((item: any) => (
                <div key={item.id} className="bg-card border border-red-200 rounded-xl p-4">
                  <div className="flex items-start gap-4">
                    <div className={cn('w-2.5 h-2.5 rounded-full mt-1.5 flex-shrink-0',
                      `bg-${PRIORITY_COLORS[item.priority] || '#ef4444'}`)} />
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium text-foreground">{item.title}</span>
                        <span className="text-xs bg-red-100 text-red-600 px-2 py-0.5 rounded-full">
                          Blocked {item.days_blocked}d
                        </span>
                      </div>
                      <div className="text-sm text-muted-foreground mb-2">{item.project_name}</div>
                      {item.latest_blocker && (
                        <div className="text-sm text-red-700 bg-red-50 px-3 py-2 rounded-lg">
                          {item.latest_blocker}
                        </div>
                      )}
                    </div>
                    <div className="text-sm text-muted-foreground">{item.assignee_name}</div>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>

      {/* Individual Member Modal */}
      <AnimatePresence>
        {selectedMember && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={(e) => e.target === e.currentTarget && setSelectedMember(null)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 16 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 16 }}
              className="bg-card border border-border rounded-2xl shadow-2xl w-full max-w-2xl max-h-[85vh] overflow-auto"
            >
              <div className="p-6 border-b border-border flex items-center justify-between sticky top-0 bg-card z-10">
                <div className="flex items-center gap-3">
                  <div className={cn(
                    'w-10 h-10 rounded-full flex items-center justify-center text-white font-medium',
                    getAvatarColor(`${selectedMember.first_name} ${selectedMember.last_name}`),
                  )}>
                    {getInitials(`${selectedMember.first_name} ${selectedMember.last_name}`)}
                  </div>
                  <div>
                    <h2 className="font-semibold text-foreground">
                      {selectedMember.first_name} {selectedMember.last_name}
                    </h2>
                    <p className="text-sm text-muted-foreground">
                      {selectedMember.designation || selectedMember.department || 'Team Member'}
                    </p>
                  </div>
                </div>
                <button onClick={() => setSelectedMember(null)}
                  className="p-2 hover:bg-accent rounded-lg transition">
                  <X size={16} />
                </button>
              </div>

              <div className="p-6">
                {memberReportData?.data ? (
                  <MemberReportContent
                    data={memberReportData.data}
                    activityData={activityData.filter((a: any) => a.user_id === selectedMember.id)}
                    period={{ start: teamStartDate, end: teamEndDate }}
                  />
                ) : (
                  <div className="space-y-3">
                    {[...Array(4)].map((_, i) => (
                      <div key={i} className="h-20 skeleton rounded-xl" />
                    ))}
                  </div>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </AppLayout>
  );
}

function MemberReportContent({ data, activityData, period }: { data: any; activityData: any[]; period: { start: string; end: string } }) {
  const { summary, dailyBreakdown, projectBreakdown, taskCompletion } = data;

  // Build last 30 days heatmap
  const days: string[] = [];
  const cur = new Date(period.start);
  const endD = new Date(period.end);
  while (cur <= endD) {
    days.push(cur.toISOString().split('T')[0]);
    cur.setDate(cur.getDate() + 1);
  }

  const activityMap: Record<string, number> = {};
  activityData.forEach((a: any) => {
    const d = typeof a.log_date === 'string' ? a.log_date.split('T')[0] : a.log_date;
    activityMap[d] = parseFloat(a.hours) || 0;
  });
  dailyBreakdown?.forEach((d: any) => {
    const dt = typeof d.log_date === 'string' ? d.log_date.split('T')[0] : d.log_date;
    if (!activityMap[dt]) activityMap[dt] = parseFloat(d.hours) || 0;
  });

  const maxH = Math.max(...Object.values(activityMap), 1);

  return (
    <div className="space-y-6">
      {/* Summary stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Total Hours', value: `${parseFloat(summary?.total_hours || 0).toFixed(1)}h`, color: 'text-brand-600' },
          { label: 'Days Logged', value: summary?.days_logged || 0, color: 'text-blue-600' },
          { label: 'Tasks Done', value: summary?.tasks_completed || 0, color: 'text-green-600' },
          { label: 'Projects', value: summary?.projects_contributed || 0, color: 'text-purple-600' },
        ].map((s) => (
          <div key={s.label} className="bg-muted/50 rounded-xl p-3 text-center">
            <div className={cn('text-2xl font-bold', s.color)}>{s.value}</div>
            <div className="text-xs text-muted-foreground mt-0.5">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Activity Heatmap */}
      <div>
        <h4 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
          <Calendar size={14} />
          Activity Heatmap ({days.length} days)
        </h4>
        <div className="flex flex-wrap gap-1">
          {days.map((day) => {
            const h = activityMap[day] || 0;
            const intensity = h / maxH;
            return (
              <div
                key={day}
                title={`${day}: ${h.toFixed(1)}h`}
                className="w-4 h-4 rounded-sm cursor-default"
                style={{
                  background: h === 0 ? 'hsl(var(--muted))' :
                    `rgba(99, 102, 241, ${0.15 + intensity * 0.85})`,
                }}
              />
            );
          })}
        </div>
        <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
          <div className="w-3 h-3 rounded-sm bg-muted" />
          <span>No activity</span>
          <div className="w-3 h-3 rounded-sm bg-brand-500 ml-2" />
          <span>High activity</span>
        </div>
      </div>

      {/* Project breakdown */}
      {projectBreakdown && projectBreakdown.length > 0 && (
        <div>
          <h4 className="text-sm font-semibold text-foreground mb-3">Project Breakdown</h4>
          <div className="space-y-2">
            {projectBreakdown.map((p: any) => {
              const maxHours = Math.max(...projectBreakdown.map((x: any) => parseFloat(x.hours_logged) || 0), 1);
              const pct = (parseFloat(p.hours_logged) / maxHours) * 100;
              return (
                <div key={p.id} className="flex items-center gap-3">
                  <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: p.color || '#6366f1' }} />
                  <span className="text-sm text-foreground w-32 truncate">{p.name}</span>
                  <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                    <div className="h-full rounded-full" style={{ width: `${pct}%`, background: p.color || '#6366f1' }} />
                  </div>
                  <span className="text-xs text-muted-foreground w-12 text-right">
                    {parseFloat(p.hours_logged).toFixed(1)}h
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Recent tasks */}
      {taskCompletion && taskCompletion.length > 0 && (
        <div>
          <h4 className="text-sm font-semibold text-foreground mb-3">Recent Tasks</h4>
          <div className="space-y-1.5">
            {taskCompletion.slice(0, 8).map((t: any) => (
              <div key={t.id} className="flex items-center gap-3 text-sm">
                <span className={cn('w-2 h-2 rounded-full flex-shrink-0',
                  t.status === 'completed' ? 'bg-green-500' :
                  t.status === 'in_progress' ? 'bg-blue-500' : 'bg-amber-500')} />
                <span className={cn('flex-1 truncate',
                  t.status === 'completed' ? 'line-through text-muted-foreground' : 'text-foreground')}>
                  {t.title}
                </span>
                <span className="text-xs text-muted-foreground flex-shrink-0">{t.project_name}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function OverviewTab({ data }: { data: any }) {
  if (!data) return <div className="h-64 skeleton rounded-xl" />;

  const { projectStats, taskStats, resourceStats } = data;

  const projectStatusData = [
    { name: 'Active', value: parseInt(projectStats?.active_projects || 0), color: '#3b82f6' },
    { name: 'On Track', value: parseInt(projectStats?.total_projects || 0) - parseInt(projectStats?.at_risk_projects || 0) - parseInt(projectStats?.off_track_projects || 0), color: '#10b981' },
    { name: 'At Risk', value: parseInt(projectStats?.at_risk_projects || 0), color: '#f59e0b' },
    { name: 'Off Track', value: parseInt(projectStats?.off_track_projects || 0), color: '#ef4444' },
  ].filter(d => d.value > 0);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <div className="bg-card border border-border rounded-xl p-5">
        <h3 className="font-semibold text-foreground mb-4">Project Health Distribution</h3>
        <div className="flex items-center gap-6">
          <ResponsiveContainer width={180} height={180}>
            <PieChart>
              <Pie data={projectStatusData} cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={2} dataKey="value">
                {projectStatusData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
          <div className="space-y-2">
            {projectStatusData.map((item) => (
              <div key={item.name} className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full" style={{ background: item.color }} />
                <span className="text-sm text-muted-foreground">{item.name}</span>
                <span className="text-sm font-medium text-foreground ml-auto">{item.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="bg-card border border-border rounded-xl p-5">
        <h3 className="font-semibold text-foreground mb-4">Key Metrics</h3>
        <div className="grid grid-cols-2 gap-4">
          {[
            { label: 'Total Projects', value: projectStats?.total_projects || 0, color: 'text-brand-600' },
            { label: 'Avg Completion', value: formatPercent(projectStats?.avg_completion), color: 'text-green-600' },
            { label: 'Active Resources', value: resourceStats?.active_resources || 0, color: 'text-blue-600' },
            { label: 'Avg Utilization', value: formatPercent(resourceStats?.avg_utilization_pct), color: 'text-amber-600' },
            { label: 'Total Tasks', value: taskStats?.total_tasks || 0, color: 'text-purple-600' },
            { label: 'Overdue Tasks', value: taskStats?.overdue_tasks || 0, color: 'text-red-600' },
          ].map((m) => (
            <div key={m.label} className="bg-muted/50 rounded-lg p-3">
              <div className={cn('text-xl font-bold', m.color)}>{m.value}</div>
              <div className="text-xs text-muted-foreground mt-0.5">{m.label}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
