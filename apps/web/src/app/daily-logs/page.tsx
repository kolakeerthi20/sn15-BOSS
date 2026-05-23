'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { Plus, Users, AlertCircle, CheckCircle2, Clock, Calendar } from 'lucide-react';
import { AppLayout } from '@/components/layout/app-layout';
import { dailyLogsApi, projectsApi } from '@/lib/api';
import { useAuthStore } from '@/store/auth.store';
import { cn, statusConfig, formatDate, formatRelative } from '@/lib/utils';
import { toast } from 'sonner';
import { useForm } from 'react-hook-form';

export default function DailyLogsPage() {
  const { user } = useAuthStore();
  const [activeTab, setActiveTab] = useState<'my-logs' | 'team-feed' | 'missing'>('my-logs');
  const [showSubmitForm, setShowSubmitForm] = useState(false);
  const queryClient = useQueryClient();

  const isManager = user?.role && ['project_manager', 'lead'].includes(user.role);

  const { data: myLogsData, isLoading: myLogsLoading } = useQuery({
    queryKey: ['daily-logs', 'mine'],
    queryFn: () => dailyLogsApi.list({ limit: 20 }),
    enabled: activeTab === 'my-logs',
  });

  const { data: teamFeedData } = useQuery({
    queryKey: ['daily-logs', 'team-feed'],
    queryFn: () => dailyLogsApi.teamFeed({ limit: 30 }),
    enabled: activeTab === 'team-feed' && !!isManager,
    refetchInterval: 30000,
  });

  const { data: missingData } = useQuery({
    queryKey: ['daily-logs', 'missing'],
    queryFn: () => dailyLogsApi.missing(),
    enabled: activeTab === 'missing' && !!isManager,
  });

  const { data: projectsData } = useQuery({
    queryKey: ['projects', 'mine'],
    queryFn: () => projectsApi.list({ myProjects: 'true', limit: 50 }),
  });

  const myLogs = myLogsData?.data?.data || [];
  const teamFeed = teamFeedData?.data?.data || [];
  const missing = missingData?.data || [];
  const projects = projectsData?.data?.data || [];

  const tabs = [
    { key: 'my-logs', label: 'My Logs', icon: Clock },
    ...(isManager ? [
      { key: 'team-feed', label: 'Team Feed', icon: Users },
      { key: 'missing', label: 'Missing', icon: AlertCircle },
    ] : []),
  ] as const;

  return (
    <AppLayout>
      <div className="p-6 max-w-5xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Daily Work Logs</h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              Track daily progress and contributions
            </p>
          </div>
          <button
            onClick={() => setShowSubmitForm(!showSubmitForm)}
            className="flex items-center gap-2 px-4 py-2 bg-brand-500 hover:bg-brand-600 text-white rounded-lg text-sm font-medium transition"
          >
            <Plus size={16} />
            Submit Today's Log
          </button>
        </div>

        {/* Daily Log Form */}
        {showSubmitForm && (
          <DailyLogForm
            projects={projects}
            onClose={() => setShowSubmitForm(false)}
            onSuccess={() => {
              setShowSubmitForm(false);
              queryClient.invalidateQueries({ queryKey: ['daily-logs'] });
            }}
          />
        )}

        {/* Tabs */}
        <div className="flex gap-1 border-b border-border mb-6">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key as any)}
              className={cn(
                'flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition',
                activeTab === tab.key
                  ? 'border-brand-500 text-brand-600'
                  : 'border-transparent text-muted-foreground hover:text-foreground',
              )}
            >
              <tab.icon size={15} />
              {tab.label}
              {tab.key === 'missing' && missing.length > 0 && (
                <span className="bg-red-500 text-white text-xs px-1.5 py-0.5 rounded-full">
                  {missing.length}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* My Logs */}
        {activeTab === 'my-logs' && (
          <div className="space-y-3">
            {myLogsLoading ? (
              [...Array(5)].map((_, i) => <div key={i} className="h-28 skeleton rounded-xl" />)
            ) : myLogs.length === 0 ? (
              <EmptyState
                icon="📋"
                title="No logs yet"
                description="Start submitting daily work logs to track your contributions"
              />
            ) : (
              myLogs.map((log: any) => <LogCard key={log.id} log={log} />)
            )}
          </div>
        )}

        {/* Team Feed */}
        {activeTab === 'team-feed' && (
          <div className="space-y-3">
            {teamFeed.length === 0 ? (
              <EmptyState icon="👥" title="No team updates today" description="No logs submitted yet" />
            ) : (
              teamFeed.map((log: any) => <LogCard key={log.id} log={log} showUser />)
            )}
          </div>
        )}

        {/* Missing */}
        {activeTab === 'missing' && (
          <div className="space-y-3">
            {missing.length === 0 ? (
              <div className="text-center py-12">
                <CheckCircle2 size={48} className="mx-auto text-green-400 mb-3" />
                <p className="text-lg font-medium text-foreground">All team members have submitted!</p>
                <p className="text-sm text-muted-foreground mt-1">Great work 🎉</p>
              </div>
            ) : (
              missing.map((member: any) => (
                <div key={member.id} className="flex items-center gap-4 p-4 bg-card border border-border rounded-xl">
                  <div className="w-9 h-9 rounded-full bg-red-100 flex items-center justify-center text-red-600 font-medium text-sm">
                    {member.first_name?.[0]}{member.last_name?.[0]}
                  </div>
                  <div className="flex-1">
                    <div className="font-medium text-foreground">
                      {member.first_name} {member.last_name}
                    </div>
                    <div className="text-sm text-muted-foreground">{member.department}</div>
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {(member.projects || []).slice(0, 2).map((p: string) => (
                      <span key={p} className="text-xs bg-muted px-2 py-0.5 rounded-full text-muted-foreground">
                        {p}
                      </span>
                    ))}
                  </div>
                  <span className="text-xs text-red-600 font-medium bg-red-50 px-2 py-1 rounded-full">
                    No update
                  </span>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </AppLayout>
  );
}

function LogCard({ log, showUser = false }: { log: any; showUser?: boolean }) {
  const status = statusConfig[log.status] || statusConfig.in_progress;
  const queryClient = useQueryClient();

  const { mutate: submit, isPending } = useMutation({
    mutationFn: () => dailyLogsApi.submit(log.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['daily-logs'] });
      toast.success('Log submitted successfully!');
    },
  });

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-card border border-border rounded-xl p-5"
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          {showUser && (
            <div className="w-8 h-8 rounded-full bg-brand-100 flex items-center justify-center text-brand-700 text-xs font-medium">
              {log.user_name?.split(' ').map((n: string) => n[0]).join('')}
            </div>
          )}
          <div>
            {showUser && <div className="text-sm font-medium text-foreground">{log.user_name}</div>}
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-foreground">
                {formatDate(log.log_date, 'EEEE, MMM d')}
              </span>
              {log.project_name && (
                <span className="text-xs text-muted-foreground">• {log.project_name}</span>
              )}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className={cn('status-badge text-xs', status.bg, status.color)}>
            <span className={cn('w-1.5 h-1.5 rounded-full', status.dot)} />
            {status.label}
          </span>
          {!log.is_submitted && (
            <button
              onClick={() => submit()}
              disabled={isPending}
              className="text-xs px-3 py-1 bg-brand-500 text-white rounded-full hover:bg-brand-600 transition disabled:opacity-60"
            >
              Submit
            </button>
          )}
          {log.is_submitted && (
            <span className="flex items-center gap-1 text-xs text-green-600">
              <CheckCircle2 size={12} />
              Submitted
            </span>
          )}
        </div>
      </div>

      <p className="text-sm text-foreground mb-3 leading-relaxed">{log.work_done}</p>

      {log.blockers && (
        <div className="flex items-start gap-2 mb-3 p-2.5 bg-red-50 border border-red-100 rounded-lg">
          <AlertCircle size={14} className="text-red-500 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-red-700">{log.blockers}</p>
        </div>
      )}

      {log.tomorrows_plan && (
        <div className="flex items-start gap-2 mb-3 p-2.5 bg-blue-50 border border-blue-100 rounded-lg">
          <Calendar size={14} className="text-blue-500 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-blue-700">{log.tomorrows_plan}</p>
        </div>
      )}

      <div className="flex items-center gap-4 text-xs text-muted-foreground">
        <span className="flex items-center gap-1">
          <Clock size={12} />
          {log.hours_spent}h logged
        </span>
        {log.progress_pct && <span>{log.progress_pct}% progress</span>}
        {log.submitted_at && <span>Submitted {formatRelative(log.submitted_at)}</span>}
      </div>
    </motion.div>
  );
}

function DailyLogForm({ projects, onClose, onSuccess }: any) {
  const { register, handleSubmit, formState: { errors } } = useForm();

  const { mutate, isPending } = useMutation({
    mutationFn: dailyLogsApi.createOrUpdate,
    onSuccess: (data) => {
      toast.success('Daily log saved!');
      onSuccess();
    },
    onError: () => toast.error('Failed to save log'),
  });

  return (
    <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: 'auto' }}
      exit={{ opacity: 0, height: 0 }}
      className="bg-card border border-brand-200 rounded-xl p-5 mb-6"
    >
      <h3 className="font-semibold text-foreground mb-4">Today's Work Log</h3>
      <form onSubmit={handleSubmit((data: any) => mutate(data))} className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">Project</label>
            <select
              {...register('projectId')}
              className="w-full px-3 py-2 border border-border rounded-lg text-sm bg-background"
            >
              <option value="">Select project...</option>
              {projects.map((p: any) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">Status</label>
            <select
              {...register('status')}
              className="w-full px-3 py-2 border border-border rounded-lg text-sm bg-background"
            >
              <option value="in_progress">In Progress</option>
              <option value="completed">Completed</option>
              <option value="blocked">Blocked</option>
              <option value="in_review">In Review</option>
            </select>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-foreground mb-1">What did you work on today? *</label>
          <textarea
            {...register('workDone', { required: true })}
            rows={4}
            placeholder="Describe what you accomplished today..."
            className="w-full px-3 py-2 border border-border rounded-lg text-sm bg-background resize-none focus:outline-none focus:ring-2 focus:ring-brand-500"
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">Hours Spent</label>
            <input
              {...register('hoursSpent')}
              type="number"
              step="0.5"
              placeholder="e.g., 7.5"
              className="w-full px-3 py-2 border border-border rounded-lg text-sm bg-background"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">Task Progress (%)</label>
            <input
              {...register('progressPct')}
              type="number"
              min="0"
              max="100"
              placeholder="e.g., 75"
              className="w-full px-3 py-2 border border-border rounded-lg text-sm bg-background"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-foreground mb-1">Blockers / Issues</label>
          <textarea
            {...register('blockers')}
            rows={2}
            placeholder="Any blockers or issues faced..."
            className="w-full px-3 py-2 border border-border rounded-lg text-sm bg-background resize-none"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-foreground mb-1">Tomorrow's Plan</label>
          <textarea
            {...register('tomorrowsPlan')}
            rows={2}
            placeholder="What will you work on tomorrow..."
            className="w-full px-3 py-2 border border-border rounded-lg text-sm bg-background resize-none"
          />
        </div>

        <div className="flex gap-3">
          <button type="button" onClick={onClose}
            className="flex-1 py-2 border border-border rounded-lg text-sm text-muted-foreground hover:bg-accent transition">
            Cancel
          </button>
          <button type="submit" disabled={isPending}
            className="flex-1 py-2 bg-brand-500 text-white rounded-lg text-sm font-medium hover:bg-brand-600 transition disabled:opacity-60">
            {isPending ? 'Saving...' : 'Save Log'}
          </button>
        </div>
      </form>
    </motion.div>
  );
}

function EmptyState({ icon, title, description }: { icon: string; title: string; description: string }) {
  return (
    <div className="text-center py-16">
      <div className="text-4xl mb-3">{icon}</div>
      <h3 className="text-lg font-medium text-foreground mb-1">{title}</h3>
      <p className="text-sm text-muted-foreground">{description}</p>
    </div>
  );
}
