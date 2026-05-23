'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import {
  ArrowLeft, Edit2, Trash2, Users, CheckSquare, Clock,
  AlertTriangle, Calendar, DollarSign, Target, Plus,
  Activity, BarChart3, Circle, CheckCircle2, XCircle,
  Loader2, X,
} from 'lucide-react';
import { AppLayout } from '@/components/layout/app-layout';
import { projectsApi, tasksApi, usersApi } from '@/lib/api';
import {
  cn, statusConfig, priorityConfig, healthConfig,
  formatDate, formatPercent, formatRelative, getAvatarColor, getInitials,
} from '@/lib/utils';
import { toast } from 'sonner';
import { useForm } from 'react-hook-form';

const TASK_STATUSES = [
  { value: '', label: 'All' },
  { value: 'not_started', label: 'Not Started' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'blocked', label: 'Blocked' },
  { value: 'in_review', label: 'In Review' },
  { value: 'completed', label: 'Completed' },
];

export default function ProjectDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<'overview' | 'tasks' | 'team' | 'activity'>('overview');
  const [taskStatus, setTaskStatus] = useState('');
  const [showCreateTask, setShowCreateTask] = useState(false);

  const { data: projectData, isLoading } = useQuery({
    queryKey: ['project', id],
    queryFn: () => projectsApi.get(id),
    enabled: !!id,
  });

  const { data: statsData } = useQuery({
    queryKey: ['project-stats', id],
    queryFn: () => projectsApi.stats(id),
    enabled: !!id,
  });

  const { data: tasksData, isLoading: tasksLoading } = useQuery({
    queryKey: ['tasks', { projectId: id, status: taskStatus }],
    queryFn: () => tasksApi.list({ projectId: id, status: taskStatus || undefined, limit: 50 }),
    enabled: activeTab === 'tasks',
  });

  const { mutate: deleteProject, isPending: deleting } = useMutation({
    mutationFn: () => projectsApi.delete(id),
    onSuccess: () => {
      toast.success('Project deleted');
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      router.push('/projects');
    },
    onError: () => toast.error('Failed to delete project'),
  });

  const project = projectData?.data;
  const stats = statsData?.data;
  const tasks = tasksData?.data?.data || [];

  if (isLoading) return <ProjectDetailSkeleton />;
  if (!project) return (
    <AppLayout>
      <div className="p-6 text-center">
        <p className="text-muted-foreground">Project not found.</p>
        <button onClick={() => router.push('/projects')} className="mt-4 text-brand-500 hover:underline text-sm">
          Back to projects
        </button>
      </div>
    </AppLayout>
  );

  const status = statusConfig[project.status] || statusConfig.planning;
  const health = healthConfig[project.health] || healthConfig.unknown;
  const priority = priorityConfig[project.priority] || priorityConfig.medium;
  const completionPct = Math.round(parseFloat(project.completion_pct || '0'));
  const members = project.members || [];
  const recentActivity = project.recentActivity || [];

  const taskStats = stats?.taskStats || {};
  const memberStats = stats?.memberStats || [];

  return (
    <AppLayout>
      <div className="p-6 max-w-6xl mx-auto">
        {/* Back button + Header */}
        <div className="flex items-start justify-between mb-6">
          <div className="flex items-start gap-4">
            <button
              onClick={() => router.push('/projects')}
              className="mt-1 p-1.5 rounded-lg hover:bg-accent text-muted-foreground transition"
            >
              <ArrowLeft size={18} />
            </button>
            <div>
              <div className="flex items-center gap-2 mb-1">
                <div
                  className="w-8 h-8 rounded-lg flex items-center justify-center text-white font-bold text-sm"
                  style={{ background: project.color || '#6366f1' }}
                >
                  {project.name?.slice(0, 1).toUpperCase()}
                </div>
                <h1 className="text-2xl font-bold text-foreground">{project.name}</h1>
                {project.code && (
                  <span className="text-sm text-muted-foreground bg-muted px-2 py-0.5 rounded font-mono">
                    {project.code}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2 ml-10">
                <span className={cn('status-badge', status.bg, status.color)}>
                  <span className={cn('w-1.5 h-1.5 rounded-full', status.dot)} />
                  {status.label}
                </span>
                <span className={cn('status-badge', health.bg, health.color)}>{health.label}</span>
                <span className={cn('status-badge text-xs px-2 py-0.5 rounded-full font-medium', priority.bg, priority.color)}>
                  {project.priority}
                </span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                if (confirm('Delete this project? This cannot be undone.')) deleteProject();
              }}
              disabled={deleting}
              className="p-2 rounded-lg hover:bg-red-50 text-red-500 transition"
            >
              <Trash2 size={16} />
            </button>
          </div>
        </div>

        {/* Stat Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
          <StatCard
            icon={<Target size={18} />}
            label="Completion"
            value={`${completionPct}%`}
            sub={<ProgressBar value={completionPct} color={project.color} />}
          />
          <StatCard
            icon={<CheckSquare size={18} />}
            label="Tasks"
            value={Object.values(taskStats).reduce((s: number, v: any) => s + (parseInt(v) || 0), 0) as number}
            sub={`${taskStats.completed || 0} done · ${taskStats.overdue || 0} overdue`}
          />
          <StatCard
            icon={<Users size={18} />}
            label="Team"
            value={members.length}
            sub={`${memberStats.length} active contributors`}
          />
          <StatCard
            icon={<Clock size={18} />}
            label="Hours"
            value={`${Math.round(parseFloat(project.logged_hours || '0'))}h`}
            sub={project.estimated_hours ? `of ${project.estimated_hours}h est.` : 'logged'}
          />
        </div>

        {/* Tabs */}
        <div className="flex gap-1 border-b border-border mb-6">
          {(['overview', 'tasks', 'team', 'activity'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={cn(
                'px-4 py-2.5 text-sm font-medium border-b-2 capitalize transition',
                activeTab === tab
                  ? 'border-brand-500 text-brand-600'
                  : 'border-transparent text-muted-foreground hover:text-foreground',
              )}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* Overview Tab */}
        {activeTab === 'overview' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-6">
              {/* Description */}
              <div className="bg-card border border-border rounded-xl p-5">
                <h3 className="font-semibold text-foreground mb-2">Description</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {project.description || 'No description provided.'}
                </p>
              </div>

              {/* Task Status Breakdown */}
              <div className="bg-card border border-border rounded-xl p-5">
                <h3 className="font-semibold text-foreground mb-4">Task Breakdown</h3>
                <div className="space-y-3">
                  {[
                    { key: 'not_started', label: 'Not Started', color: 'bg-slate-400' },
                    { key: 'in_progress', label: 'In Progress', color: 'bg-blue-500' },
                    { key: 'blocked', label: 'Blocked', color: 'bg-red-500' },
                    { key: 'in_review', label: 'In Review', color: 'bg-purple-500' },
                    { key: 'completed', label: 'Completed', color: 'bg-green-500' },
                  ].map(({ key, label, color }) => {
                    const count = parseInt(taskStats[key] || '0');
                    const total: number = Object.values(taskStats).reduce((s: number, v: any) => s + (parseInt(v) || 0), 0) as number;
                    const pct = total > 0 ? Math.round((count / total) * 100) : 0;
                    return (
                      <div key={key} className="flex items-center gap-3">
                        <div className={cn('w-2.5 h-2.5 rounded-full flex-shrink-0', color)} />
                        <span className="text-sm text-muted-foreground w-28">{label}</span>
                        <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                          <div className={cn('h-full rounded-full', color)} style={{ width: `${pct}%` }} />
                        </div>
                        <span className="text-sm font-medium text-foreground w-8 text-right">{count}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Right column */}
            <div className="space-y-4">
              {/* Project Info */}
              <div className="bg-card border border-border rounded-xl p-5">
                <h3 className="font-semibold text-foreground mb-4">Details</h3>
                <div className="space-y-3 text-sm">
                  <InfoRow label="Owner" value={project.owner_name} avatar={project.owner_avatar} />
                  {project.client_name && <InfoRow label="Client" value={project.client_name} />}
                  <InfoRow label="Start" value={formatDate(project.start_date) || '—'} />
                  <InfoRow label="Deadline" value={formatDate(project.end_date) || '—'} />
                  {project.budget && (
                    <InfoRow label="Budget" value={`$${Number(project.budget).toLocaleString()}`} />
                  )}
                  <InfoRow label="Created" value={formatRelative(project.created_at)} />
                </div>
              </div>

              {/* Milestones */}
              {project.milestones?.length > 0 && (
                <div className="bg-card border border-border rounded-xl p-5">
                  <h3 className="font-semibold text-foreground mb-3">Milestones</h3>
                  <div className="space-y-2">
                    {project.milestones.map((m: any) => (
                      <div key={m.id} className="flex items-center gap-2 text-sm">
                        <CheckCircle2 size={14} className={m.is_completed ? 'text-green-500' : 'text-muted-foreground'} />
                        <span className="flex-1 text-foreground">{m.title}</span>
                        <span className="text-xs text-muted-foreground">{formatDate(m.due_date)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Tasks Tab */}
        {activeTab === 'tasks' && (
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="flex gap-2 flex-wrap">
                {TASK_STATUSES.map((s) => (
                  <button
                    key={s.value}
                    onClick={() => setTaskStatus(s.value)}
                    className={cn(
                      'px-3 py-1.5 text-xs font-medium rounded-full transition',
                      taskStatus === s.value
                        ? 'bg-brand-500 text-white'
                        : 'bg-muted text-muted-foreground hover:bg-accent',
                    )}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
              <button
                onClick={() => setShowCreateTask(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-brand-500 hover:bg-brand-600 text-white rounded-lg text-xs font-medium transition"
              >
                <Plus size={13} />
                Add Task
              </button>
            </div>

            {showCreateTask && (
              <InlineCreateTask
                projectId={id}
                onClose={() => setShowCreateTask(false)}
                onSuccess={() => {
                  setShowCreateTask(false);
                  queryClient.invalidateQueries({ queryKey: ['tasks'] });
                }}
              />
            )}

            {tasksLoading ? (
              <div className="space-y-2">
                {[...Array(5)].map((_, i) => <div key={i} className="h-16 skeleton rounded-xl" />)}
              </div>
            ) : tasks.length === 0 ? (
              <div className="text-center py-16">
                <CheckSquare size={40} className="mx-auto text-muted-foreground/40 mb-3" />
                <p className="text-muted-foreground font-medium">No tasks yet</p>
                <p className="text-sm text-muted-foreground mt-1">Add tasks to track your project progress</p>
              </div>
            ) : (
              <div className="space-y-2">
                {tasks.map((task: any) => (
                  <TaskRow key={task.id} task={task} queryClient={queryClient} />
                ))}
              </div>
            )}
          </div>
        )}

        {/* Team Tab */}
        {activeTab === 'team' && (
          <div className="space-y-3">
            {members.length === 0 ? (
              <div className="text-center py-16">
                <Users size={40} className="mx-auto text-muted-foreground/40 mb-3" />
                <p className="text-muted-foreground font-medium">No team members</p>
              </div>
            ) : (
              members.map((m: any) => {
                const ms = memberStats.find((ms: any) => ms.id === m.id);
                return (
                  <motion.div
                    key={m.id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex items-center gap-4 p-4 bg-card border border-border rounded-xl"
                  >
                    <MemberAvatar member={m} />
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-foreground">
                        {m.first_name} {m.last_name}
                      </div>
                      <div className="text-sm text-muted-foreground">{m.designation}</div>
                    </div>
                    <div className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded-full capitalize">
                      {m.role}
                    </div>
                    <div className="hidden sm:flex gap-4 text-center text-xs">
                      <div>
                        <div className="font-semibold text-foreground">{ms?.assigned_tasks || 0}</div>
                        <div className="text-muted-foreground">Tasks</div>
                      </div>
                      <div>
                        <div className="font-semibold text-foreground">{ms?.completed_tasks || 0}</div>
                        <div className="text-muted-foreground">Done</div>
                      </div>
                      <div>
                        <div className="font-semibold text-foreground">{Math.round(parseFloat(ms?.total_hours || '0'))}h</div>
                        <div className="text-muted-foreground">Hours</div>
                      </div>
                    </div>
                    <div className="text-xs text-muted-foreground">{Math.round(parseFloat(m.allocation || '0'))}%</div>
                  </motion.div>
                );
              })
            )}
          </div>
        )}

        {/* Activity Tab */}
        {activeTab === 'activity' && (
          <div className="space-y-3">
            {recentActivity.length === 0 ? (
              <div className="text-center py-16">
                <Activity size={40} className="mx-auto text-muted-foreground/40 mb-3" />
                <p className="text-muted-foreground font-medium">No activity yet</p>
              </div>
            ) : (
              recentActivity.map((log: any) => (
                <div key={log.id} className="flex gap-3 p-4 bg-card border border-border rounded-xl">
                  <div
                    className={cn(
                      'w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0',
                      getAvatarColor(log.actor_name || ''),
                    )}
                  >
                    {log.actor_avatar ? (
                      <img src={log.actor_avatar} alt="" className="w-8 h-8 rounded-full object-cover" />
                    ) : (
                      getInitials(log.actor_name || '')
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-foreground">{log.actor_name}</span>
                      <span className="text-xs text-muted-foreground capitalize">{log.action}</span>
                      <span className="text-xs text-muted-foreground">{log.entity_type}</span>
                    </div>
                    {log.new_values && (
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {Object.entries(log.new_values)
                          .map(([k, v]) => `${k}: ${v}`)
                          .join(' · ')}
                      </p>
                    )}
                    <p className="text-xs text-muted-foreground mt-0.5">{formatRelative(log.created_at)}</p>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </AppLayout>
  );
}

/* ── Small components ── */

function StatCard({ icon, label, value, sub }: { icon: React.ReactNode; label: string; value: React.ReactNode; sub?: React.ReactNode }) {
  return (
    <div className="bg-card border border-border rounded-xl p-4">
      <div className="flex items-center gap-2 text-muted-foreground mb-2">
        {icon}
        <span className="text-xs font-medium">{label}</span>
      </div>
      <div className="text-2xl font-bold text-foreground">{value}</div>
      {sub && <div className="text-xs text-muted-foreground mt-1">{sub}</div>}
    </div>
  );
}

function ProgressBar({ value, color }: { value: number; color?: string }) {
  return (
    <div className="h-1.5 bg-muted rounded-full overflow-hidden mt-1">
      <div
        className="h-full rounded-full transition-all"
        style={{ width: `${value}%`, background: color || '#6366f1' }}
      />
    </div>
  );
}

function InfoRow({ label, value, avatar }: { label: string; value: string; avatar?: string | null }) {
  return (
    <div className="flex items-center justify-between gap-2">
      <span className="text-muted-foreground">{label}</span>
      <div className="flex items-center gap-1.5">
        {avatar && <img src={avatar} alt="" className="w-5 h-5 rounded-full object-cover" />}
        <span className="font-medium text-foreground text-right">{value}</span>
      </div>
    </div>
  );
}

function MemberAvatar({ member }: { member: any }) {
  const name = `${member.first_name} ${member.last_name}`;
  if (member.avatar_url) {
    return <img src={member.avatar_url} alt={name} className="w-10 h-10 rounded-full object-cover flex-shrink-0" />;
  }
  return (
    <div className={cn('w-10 h-10 rounded-full flex items-center justify-center text-white font-medium text-sm flex-shrink-0', getAvatarColor(name))}>
      {getInitials(name)}
    </div>
  );
}

function TaskRow({ task, queryClient, depth = 0 }: { task: any; queryClient: any; depth?: number }) {
  const [expanded, setExpanded] = useState(false);
  const [addingSubtask, setAddingSubtask] = useState(false);

  const status = statusConfig[task.status] || statusConfig.not_started;
  const priority = priorityConfig[task.priority] || priorityConfig.medium;

  const { mutate: updateStatus } = useMutation({
    mutationFn: (newStatus: string) => tasksApi.update(task.id, { status: newStatus }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['tasks'] }),
    onError: () => toast.error('Failed to update task'),
  });

  const { data: taskDetail, isLoading: subtasksLoading } = useQuery({
    queryKey: ['task-detail', task.id],
    queryFn: () => tasksApi.get(task.id),
    enabled: expanded,
  });

  const subtasks: any[] = taskDetail?.data?.subtasks || [];
  const subtaskCount = task.subtask_count || subtasks.length;

  return (
    <div className={cn(depth > 0 && 'ml-6 border-l-2 border-border pl-3')}>
      <motion.div
        initial={{ opacity: 0, y: 4 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center gap-2 p-3 bg-card border border-border rounded-xl hover:shadow-sm transition group"
      >
        {/* Expand subtasks toggle */}
        <button
          onClick={() => setExpanded(!expanded)}
          className={cn(
            'w-4 h-4 flex-shrink-0 flex items-center justify-center text-muted-foreground transition',
            subtaskCount > 0 || expanded ? 'opacity-100' : 'opacity-0 pointer-events-none',
          )}
        >
          <span className={cn('text-xs transition-transform', expanded && 'rotate-90')}>▶</span>
        </button>

        {/* Complete toggle */}
        <button
          onClick={() => updateStatus(task.status === 'completed' ? 'in_progress' : 'completed')}
          className={cn(
            'w-5 h-5 rounded-full border-2 flex-shrink-0 flex items-center justify-center transition',
            task.status === 'completed'
              ? 'border-green-500 bg-green-500 text-white'
              : 'border-muted-foreground/40 hover:border-brand-500',
          )}
        >
          {task.status === 'completed' && <CheckCircle2 size={10} />}
        </button>

        <div className="flex-1 min-w-0">
          <div className={cn('text-sm font-medium text-foreground truncate', task.status === 'completed' && 'line-through text-muted-foreground')}>
            {task.title}
          </div>
          <div className="flex items-center gap-2 mt-0.5">
            {task.due_date && (
              <span className="text-xs text-muted-foreground">{formatDate(task.due_date)}</span>
            )}
            {subtaskCount > 0 && (
              <span className="text-xs text-muted-foreground">
                {subtasks.filter((s: any) => s.status === 'completed').length}/{subtaskCount} subtasks
              </span>
            )}
          </div>
        </div>

        <span className={cn('status-badge text-xs hidden sm:flex', status.bg, status.color)}>
          <span className={cn('w-1.5 h-1.5 rounded-full', status.dot)} />
          {status.label}
        </span>
        <div className={cn('w-2 h-2 rounded-full flex-shrink-0', priority.bg)} title={task.priority} />
        {task.assignee_name && (
          <div
            className={cn('w-6 h-6 rounded-full flex items-center justify-center text-white text-xs font-medium flex-shrink-0', getAvatarColor(task.assignee_name))}
            title={task.assignee_name}
          >
            {getInitials(task.assignee_name)}
          </div>
        )}

        {/* Add subtask button */}
        {depth === 0 && (
          <button
            onClick={() => { setExpanded(true); setAddingSubtask(true); }}
            className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-accent text-muted-foreground transition"
            title="Add subtask"
          >
            <Plus size={13} />
          </button>
        )}
      </motion.div>

      {/* Subtasks */}
      {expanded && (
        <div className="mt-1 space-y-1">
          {subtasksLoading && (
            <div className="ml-6 text-xs text-muted-foreground py-2 flex items-center gap-2">
              <Loader2 size={12} className="animate-spin" /> Loading subtasks...
            </div>
          )}
          {subtasks.map((sub: any) => (
            <TaskRow key={sub.id} task={sub} queryClient={queryClient} depth={depth + 1} />
          ))}
          {addingSubtask && (
            <div className="ml-6">
              <InlineCreateTask
                projectId={task.project_id}
                parentTaskId={task.id}
                onClose={() => setAddingSubtask(false)}
                onSuccess={() => {
                  setAddingSubtask(false);
                  queryClient.invalidateQueries({ queryKey: ['task-detail', task.id] });
                  queryClient.invalidateQueries({ queryKey: ['tasks'] });
                }}
              />
            </div>
          )}
          {!addingSubtask && subtasks.length === 0 && !subtasksLoading && (
            <button
              onClick={() => setAddingSubtask(true)}
              className="ml-6 text-xs text-brand-500 hover:underline py-1 flex items-center gap-1"
            >
              <Plus size={11} /> Add subtask
            </button>
          )}
        </div>
      )}
    </div>
  );
}

function InlineCreateTask({
  projectId, parentTaskId, onClose, onSuccess,
}: {
  projectId: string;
  parentTaskId?: string;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const { register, handleSubmit, formState: { errors } } = useForm();

  const { mutate, isPending } = useMutation({
    mutationFn: (data: any) => tasksApi.create({ ...data, projectId, ...(parentTaskId ? { parentTaskId } : {}) }),
    onSuccess,
    onError: (err: any) => {
      const msg = err?.response?.data?.message;
      toast.error(Array.isArray(msg) ? msg.join(', ') : (msg || 'Failed to create task'));
    },
  });

  return (
    <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: 'auto' }}
      className={cn('border rounded-xl p-3 mb-2', parentTaskId ? 'border-muted bg-muted/30' : 'border-brand-200 bg-card')}
    >
      <p className="text-xs text-muted-foreground mb-2 font-medium">
        {parentTaskId ? '↳ New subtask' : 'New task'}
      </p>
      <form
        onSubmit={handleSubmit((data: any) => {
          const cleaned = Object.fromEntries(
            Object.entries(data).filter(([, v]) => v !== '' && v !== undefined && !Number.isNaN(v as any)),
          );
          mutate(cleaned);
        })}
        className="space-y-2"
      >
        <div className="flex items-center gap-2">
          <input
            {...register('title', { required: 'Title is required' })}
            placeholder={parentTaskId ? 'Subtask title...' : 'Task title...'}
            autoFocus
            className="flex-1 px-3 py-1.5 border border-border rounded-lg text-sm bg-background focus:outline-none focus:ring-2 focus:ring-brand-500"
          />
          <select
            {...register('priority')}
            className="px-2 py-1.5 border border-border rounded-lg text-sm bg-background"
          >
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
            <option value="critical">Critical</option>
          </select>
          {!parentTaskId && (
            <input
              {...register('dueDate')}
              type="date"
              className="px-2 py-1.5 border border-border rounded-lg text-sm bg-background"
            />
          )}
        </div>
        {errors.title && <p className="text-xs text-red-500">{String(errors.title.message)}</p>}
        <div className="flex gap-2 justify-end">
          <button type="button" onClick={onClose} className="px-3 py-1 text-xs text-muted-foreground hover:bg-accent rounded-lg transition">
            Cancel
          </button>
          <button
            type="submit"
            disabled={isPending}
            className="flex items-center gap-1 px-3 py-1 bg-brand-500 text-white rounded-lg text-xs font-medium hover:bg-brand-600 transition disabled:opacity-60"
          >
            {isPending && <Loader2 size={11} className="animate-spin" />}
            Create
          </button>
        </div>
      </form>
    </motion.div>
  );
}

function ProjectDetailSkeleton() {
  return (
    <AppLayout>
      <div className="p-6 max-w-6xl mx-auto space-y-6">
        <div className="h-8 w-64 skeleton rounded-lg" />
        <div className="grid grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => <div key={i} className="h-24 skeleton rounded-xl" />)}
        </div>
        <div className="h-10 w-full skeleton rounded-lg" />
        <div className="grid grid-cols-3 gap-6">
          <div className="col-span-2 h-64 skeleton rounded-xl" />
          <div className="h-64 skeleton rounded-xl" />
        </div>
      </div>
    </AppLayout>
  );
}
