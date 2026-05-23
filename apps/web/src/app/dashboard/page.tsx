'use client';

import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import {
  FolderKanban, Users, AlertTriangle, TrendingUp,
  Clock, CheckCircle2, AlertCircle, Zap, ArrowUpRight,
} from 'lucide-react';
import { AppLayout } from '@/components/layout/app-layout';
import { reportsApi, dailyLogsApi } from '@/lib/api';
import { useAuthStore } from '@/store/auth.store';
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts';
import { formatPercent, statusConfig, priorityConfig, formatRelative, cn, getAvatarColor, getInitials } from '@/lib/utils';
import Link from 'next/link';

const COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4'];

export default function DashboardPage() {
  const { user } = useAuthStore();
  const isManager = user?.role && ['project_manager', 'lead'].includes(user.role);

  const { data: dashboardData, isLoading } = useQuery({
    queryKey: ['executive-dashboard'],
    queryFn: () => reportsApi.executiveDashboard(),
    enabled: !!isManager,
  });

  const { data: teamFeedData } = useQuery({
    queryKey: ['team-feed', 'today'],
    queryFn: () => dailyLogsApi.teamFeed({ limit: 5 }),
    refetchInterval: 60000,
  });

  const { data: overdueData } = useQuery({
    queryKey: ['overdue-tasks'],
    queryFn: () => reportsApi.overdueTasks(),
    enabled: !!isManager,
  });

  const dash = dashboardData?.data;
  const feed = teamFeedData?.data?.data || [];
  const overdue = overdueData?.data || [];

  if (isLoading) return <DashboardSkeleton />;

  const statCards = isManager ? [
    {
      title: 'Total Projects',
      value: dash?.projectStats?.total_projects || 0,
      sub: `${dash?.projectStats?.active_projects || 0} active`,
      icon: FolderKanban,
      color: 'text-brand-600 bg-brand-50',
      trend: '+2 this month',
    },
    {
      title: 'Active Resources',
      value: dash?.resourceStats?.active_resources || 0,
      sub: `${formatPercent(dash?.resourceStats?.avg_utilization_pct)} avg utilization`,
      icon: Users,
      color: 'text-emerald-600 bg-emerald-50',
      trend: null,
    },
    {
      title: 'Delayed Projects',
      value: dash?.projectStats?.delayed_projects || 0,
      sub: `${dash?.projectStats?.at_risk_projects || 0} at risk`,
      icon: AlertTriangle,
      color: 'text-red-600 bg-red-50',
      trend: null,
    },
    {
      title: 'Avg Completion',
      value: formatPercent(dash?.projectStats?.avg_completion),
      sub: `${dash?.taskStats?.completed_tasks || 0} tasks done`,
      icon: TrendingUp,
      color: 'text-amber-600 bg-amber-50',
      trend: null,
    },
  ] : [
    {
      title: 'My Active Tasks',
      value: dash?.taskStats?.active_tasks || 0,
      sub: `${dash?.taskStats?.overdue_tasks || 0} overdue`,
      icon: CheckCircle2,
      color: 'text-brand-600 bg-brand-50',
      trend: null,
    },
    {
      title: 'Hours This Week',
      value: '32h',
      sub: '8h today',
      icon: Clock,
      color: 'text-emerald-600 bg-emerald-50',
      trend: null,
    },
    {
      title: 'Blocked',
      value: dash?.taskStats?.blocked_tasks || 0,
      sub: 'needs attention',
      icon: AlertCircle,
      color: 'text-red-600 bg-red-50',
      trend: null,
    },
    {
      title: 'Completed',
      value: dash?.taskStats?.completed_tasks || 0,
      sub: 'total tasks',
      icon: Zap,
      color: 'text-amber-600 bg-amber-50',
      trend: null,
    },
  ];

  const taskStatusData = dash?.taskStats ? [
    { name: 'Not Started', value: parseInt(dash.taskStats.total_tasks) - parseInt(dash.taskStats.active_tasks) - parseInt(dash.taskStats.completed_tasks), color: '#94a3b8' },
    { name: 'In Progress', value: parseInt(dash.taskStats.active_tasks) - parseInt(dash.taskStats.blocked_tasks), color: '#3b82f6' },
    { name: 'Blocked', value: parseInt(dash.taskStats.blocked_tasks), color: '#ef4444' },
    { name: 'Completed', value: parseInt(dash.taskStats.completed_tasks), color: '#10b981' },
  ].filter(d => d.value > 0) : [];

  return (
    <AppLayout>
      <div className="p-6 max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-foreground">
            Good {getGreeting()}, {user?.first_name} 👋
          </h1>
          <p className="text-muted-foreground mt-1">
            {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
          </p>
        </div>

        {/* Stat Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          {statCards.map((card, i) => (
            <motion.div
              key={card.title}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.08 }}
              className="bg-card border border-border rounded-xl p-5 card-hover"
            >
              <div className="flex items-start justify-between mb-3">
                <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center', card.color)}>
                  <card.icon size={20} />
                </div>
                {card.trend && (
                  <span className="flex items-center gap-1 text-xs text-emerald-600 font-medium">
                    <ArrowUpRight size={12} />
                    {card.trend}
                  </span>
                )}
              </div>
              <div className="text-2xl font-bold text-foreground">{card.value}</div>
              <div className="text-sm text-muted-foreground mt-0.5">{card.title}</div>
              <div className="text-xs text-muted-foreground mt-1">{card.sub}</div>
            </motion.div>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main left column */}
          <div className="lg:col-span-2 space-y-6">
            {/* Task Status Overview */}
            {taskStatusData.length > 0 && (
              <div className="bg-card border border-border rounded-xl p-5">
                <h2 className="text-base font-semibold text-foreground mb-4">Task Overview</h2>
                <div className="grid grid-cols-2 gap-4">
                  <ResponsiveContainer width="100%" height={200}>
                    <PieChart>
                      <Pie
                        data={taskStatusData}
                        cx="50%"
                        cy="50%"
                        innerRadius={55}
                        outerRadius={85}
                        paddingAngle={2}
                        dataKey="value"
                      >
                        {taskStatusData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value, name) => [value, name]} />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="flex flex-col justify-center gap-2">
                    {taskStatusData.map((item) => (
                      <div key={item.name} className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ background: item.color }} />
                        <span className="text-sm text-muted-foreground flex-1">{item.name}</span>
                        <span className="text-sm font-medium text-foreground">{item.value}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Overdue Tasks */}
            {overdue.length > 0 && (
              <div className="bg-card border border-border rounded-xl p-5">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-base font-semibold text-foreground">Overdue Tasks</h2>
                  <Link href="/tasks?overdue=true" className="text-xs text-brand-500 hover:underline">
                    View all
                  </Link>
                </div>
                <div className="space-y-2">
                  {overdue.slice(0, 5).map((task: any) => (
                    <div key={task.id} className="flex items-center gap-3 p-3 rounded-lg bg-red-50/50 border border-red-100">
                      <div className={cn(
                        'w-2 h-2 rounded-full flex-shrink-0',
                        priorityConfig[task.priority]?.bg || 'bg-gray-400',
                      )} />
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium text-foreground truncate">{task.title}</div>
                        <div className="text-xs text-muted-foreground">{task.project_name}</div>
                      </div>
                      <div className="text-xs text-red-600 font-medium whitespace-nowrap">
                        {task.days_overdue}d overdue
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Right column — Team Feed */}
          <div className="space-y-6">
            <div className="bg-card border border-border rounded-xl p-5">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-base font-semibold text-foreground">Today's Updates</h2>
                <Link href="/daily-logs" className="text-xs text-brand-500 hover:underline">
                  View all
                </Link>
              </div>

              {feed.length === 0 ? (
                <div className="text-center py-8">
                  <div className="text-3xl mb-2">📝</div>
                  <p className="text-sm text-muted-foreground">No updates submitted yet today</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {feed.map((log: any) => (
                    <div key={log.id} className="flex gap-3">
                      <UserAvatar name={log.user_name} size="sm" />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5">
                          <span className="text-sm font-medium text-foreground">{log.user_name}</span>
                          <span className="text-xs text-muted-foreground">{formatRelative(log.submitted_at)}</span>
                        </div>
                        <div className="text-xs text-muted-foreground mb-1">
                          {log.project_name} {log.task_title ? `• ${log.task_title}` : ''}
                        </div>
                        <p className="text-xs text-foreground line-clamp-2">{log.work_done}</p>
                        {log.blockers && (
                          <div className="flex items-center gap-1 mt-1">
                            <AlertCircle size={10} className="text-red-500" />
                            <span className="text-xs text-red-600 line-clamp-1">{log.blockers}</span>
                          </div>
                        )}
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-xs text-muted-foreground">{log.hours_spent}h logged</span>
                          {log.progress_pct && (
                            <span className="text-xs text-brand-500">{log.progress_pct}% done</span>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}

function UserAvatar({ name, size = 'md' }: { name: string; size?: 'sm' | 'md' }) {
  return (
    <div className={cn(
      'rounded-full flex items-center justify-center text-white font-medium flex-shrink-0',
      getAvatarColor(name),
      size === 'sm' ? 'w-7 h-7 text-xs' : 'w-9 h-9 text-sm',
    )}>
      {getInitials(name)}
    </div>
  );
}

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return 'morning';
  if (h < 17) return 'afternoon';
  return 'evening';
}

function DashboardSkeleton() {
  return (
    <AppLayout>
      <div className="p-6 max-w-7xl mx-auto space-y-6">
        <div className="h-8 w-64 skeleton rounded-lg" />
        <div className="grid grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-28 skeleton rounded-xl" />
          ))}
        </div>
        <div className="grid grid-cols-3 gap-6">
          <div className="col-span-2 h-64 skeleton rounded-xl" />
          <div className="h-64 skeleton rounded-xl" />
        </div>
      </div>
    </AppLayout>
  );
}
