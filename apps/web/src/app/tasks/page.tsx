'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, Reorder, AnimatePresence } from 'framer-motion';
import {
  Plus, Search, Filter, CheckSquare2, AlertCircle,
  Clock, User, Calendar, MoreHorizontal, ChevronDown, X, Loader2,
} from 'lucide-react';
import { AppLayout } from '@/components/layout/app-layout';
import { tasksApi, projectsApi, usersApi } from '@/lib/api';
import { useAuthStore } from '@/store/auth.store';
import {
  cn, statusConfig, priorityConfig,
  formatDate, isOverdue, isDueSoon, truncate,
} from '@/lib/utils';
import { toast } from 'sonner';
import { useForm } from 'react-hook-form';

type ViewMode = 'kanban' | 'list';

const KANBAN_COLUMNS = [
  { key: 'not_started', label: 'Not Started' },
  { key: 'in_progress', label: 'In Progress' },
  { key: 'blocked', label: 'Blocked' },
  { key: 'in_review', label: 'In Review' },
  { key: 'completed', label: 'Completed' },
];

export default function TasksPage() {
  const { user } = useAuthStore();
  const [view, setView] = useState<ViewMode>('kanban');
  const [search, setSearch] = useState('');
  const [myTasksOnly, setMyTasksOnly] = useState(false);
  const [projectFilter, setProjectFilter] = useState('');
  const [createOpen, setCreateOpen] = useState(false);
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['tasks', { search, myTasks: myTasksOnly, projectId: projectFilter }],
    queryFn: () => tasksApi.list({
      search,
      myTasks: myTasksOnly ? 'true' : undefined,
      projectId: projectFilter || undefined,
      limit: 100,
    }),
  });

  const { data: projectsData } = useQuery({
    queryKey: ['projects', 'simple'],
    queryFn: () => projectsApi.list({ limit: 50 }),
  });

  const { mutate: updateStatus } = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      tasksApi.update(id, { status }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['tasks'] }),
    onError: () => toast.error('Failed to update task'),
  });

  const tasks: any[] = data?.data?.data || [];
  const projects: any[] = projectsData?.data?.data || [];

  const tasksByStatus = KANBAN_COLUMNS.reduce((acc, col) => {
    acc[col.key] = tasks.filter((t) => t.status === col.key);
    return acc;
  }, {} as Record<string, any[]>);

  return (
    <AppLayout>
      <div className="p-6 h-full flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Tasks</h1>
            <p className="text-sm text-muted-foreground mt-0.5">{tasks.length} tasks</p>
          </div>
          <button
            onClick={() => setCreateOpen(true)}
            className="flex items-center gap-2 px-4 py-2 bg-brand-500 hover:bg-brand-600 text-white rounded-lg text-sm font-medium transition"
          >
            <Plus size={16} />
            New Task
          </button>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-3 mb-4">
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search tasks..."
              className="pl-8 pr-3 py-2 border border-border rounded-lg text-sm bg-background focus:outline-none focus:ring-2 focus:ring-brand-500 w-48"
            />
          </div>

          <select
            value={projectFilter}
            onChange={(e) => setProjectFilter(e.target.value)}
            className="px-3 py-2 border border-border rounded-lg text-sm bg-background focus:outline-none focus:ring-2 focus:ring-brand-500"
          >
            <option value="">All Projects</option>
            {projects.map((p: any) => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>

          <button
            onClick={() => setMyTasksOnly(!myTasksOnly)}
            className={cn(
              'flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium border transition',
              myTasksOnly
                ? 'bg-brand-50 border-brand-300 text-brand-700'
                : 'border-border text-muted-foreground hover:bg-accent',
            )}
          >
            <User size={14} />
            My Tasks
          </button>

          <div className="flex gap-1 bg-muted p-1 rounded-lg ml-auto">
            <button onClick={() => setView('kanban')}
              className={cn('px-3 py-1 rounded-md text-xs font-medium transition',
                view === 'kanban' ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground')}>
              Kanban
            </button>
            <button onClick={() => setView('list')}
              className={cn('px-3 py-1 rounded-md text-xs font-medium transition',
                view === 'list' ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground')}>
              List
            </button>
          </div>
        </div>

        {/* Kanban Board */}
        {view === 'kanban' && (
          <div className="flex gap-4 flex-1 overflow-x-auto pb-4 scrollbar-thin">
            {KANBAN_COLUMNS.map((col) => {
              const colTasks = tasksByStatus[col.key] || [];
              const status = statusConfig[col.key];
              return (
                <div key={col.key} className="flex-shrink-0 w-72">
                  <div className="flex items-center gap-2 mb-3 px-1">
                    <span className={cn('w-2.5 h-2.5 rounded-full', status?.dot)} />
                    <span className="text-sm font-medium text-foreground">{col.label}</span>
                    <span className="ml-auto text-xs bg-muted text-muted-foreground px-2 py-0.5 rounded-full">
                      {colTasks.length}
                    </span>
                  </div>
                  <div className="space-y-2 min-h-[200px]">
                    {colTasks.map((task) => (
                      <KanbanCard
                        key={task.id}
                        task={task}
                        onStatusChange={(newStatus) => updateStatus({ id: task.id, status: newStatus })}
                      />
                    ))}
                    <button
                      onClick={() => setCreateOpen(true)}
                      className="w-full py-2 border border-dashed border-border rounded-lg text-xs text-muted-foreground hover:text-foreground hover:border-muted-foreground transition flex items-center justify-center gap-1"
                    >
                      <Plus size={12} />
                      Add task
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* List View */}
        {view === 'list' && (
          <div className="flex-1 overflow-auto">
            <div className="bg-card border border-border rounded-xl overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-muted/50 border-b border-border">
                  <tr>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">Task</th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">Project</th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">Assignee</th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">Priority</th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">Status</th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">Due Date</th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">Progress</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {tasks.map((task) => {
                    const overdue = isOverdue(task.due_date, task.status);
                    const dueSoon = isDueSoon(task.due_date);
                    const status = statusConfig[task.status];
                    const priority = priorityConfig[task.priority];
                    return (
                      <tr key={task.id} className="hover:bg-muted/30 transition">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <CheckSquare2 size={15} className={cn(
                              task.status === 'completed' ? 'text-green-500' : 'text-muted-foreground',
                            )} />
                            <span className={cn(
                              'font-medium',
                              task.status === 'completed' ? 'line-through text-muted-foreground' : 'text-foreground',
                            )}>
                              {truncate(task.title, 45)}
                            </span>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1.5">
                            <div className="w-2 h-2 rounded-full" style={{ background: task.project_color || '#6366f1' }} />
                            <span className="text-muted-foreground text-xs">{task.project_name}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          {task.assignee_name ? (
                            <div className="flex items-center gap-1.5">
                              <div className="w-6 h-6 rounded-full bg-brand-100 flex items-center justify-center text-xs text-brand-700 font-medium">
                                {task.assignee_name.split(' ').map((n: string) => n[0]).join('')}
                              </div>
                              <span className="text-xs text-muted-foreground">{task.assignee_name.split(' ')[0]}</span>
                            </div>
                          ) : <span className="text-xs text-muted-foreground">Unassigned</span>}
                        </td>
                        <td className="px-4 py-3">
                          <span className={cn('text-xs font-medium', priority?.color)}>{priority?.icon} {priority?.label}</span>
                        </td>
                        <td className="px-4 py-3">
                          <span className={cn('status-badge text-xs', status?.bg, status?.color)}>
                            {status?.label}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <span className={cn(
                            'text-xs',
                            overdue ? 'text-red-600 font-medium' :
                            dueSoon ? 'text-amber-600' : 'text-muted-foreground',
                          )}>
                            {formatDate(task.due_date)}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <div className="w-16 h-1.5 bg-muted rounded-full overflow-hidden">
                              <div
                                className="h-full bg-brand-500 rounded-full"
                                style={{ width: `${task.progress_pct || 0}%` }}
                              />
                            </div>
                            <span className="text-xs text-muted-foreground">{Math.round(task.progress_pct || 0)}%</span>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              {tasks.length === 0 && (
                <div className="text-center py-12 text-muted-foreground">
                  <CheckSquare2 size={36} className="mx-auto mb-3 opacity-40" />
                  <p>No tasks found</p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Create Task Modal */}
      <AnimatePresence>
        {createOpen && (
          <CreateTaskModal
            projects={projects}
            onClose={() => setCreateOpen(false)}
            onSuccess={() => {
              setCreateOpen(false);
              queryClient.invalidateQueries({ queryKey: ['tasks'] });
              toast.success('Task created!');
            }}
          />
        )}
      </AnimatePresence>
    </AppLayout>
  );
}

function CreateTaskModal({ projects, onClose, onSuccess }: { projects: any[]; onClose: () => void; onSuccess: () => void }) {
  const { register, handleSubmit, watch, formState: { errors } } = useForm();
  const selectedProjectId = watch('projectId');

  const { data: membersData } = useQuery({
    queryKey: ['users', 'list'],
    queryFn: () => usersApi.list({ limit: 50 }),
    enabled: !!selectedProjectId,
  });
  const members: any[] = membersData?.data?.data || [];

  const { mutate, isPending } = useMutation({
    mutationFn: (data: any) => tasksApi.create(data),
    onSuccess,
    onError: (err: any) => {
      const msg = err?.response?.data?.message;
      toast.error(Array.isArray(msg) ? msg.join(', ') : (msg || 'Failed to create task'));
    },
  });

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 16 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 16 }}
        className="bg-card border border-border rounded-2xl shadow-2xl w-full max-w-lg p-6"
      >
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-semibold text-foreground">Create Task</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-accent transition">
            <X size={16} />
          </button>
        </div>

        <form onSubmit={handleSubmit((data: any) => {
          // Strip empty strings, undefined, and NaN before sending
          const cleaned = Object.fromEntries(
            Object.entries(data).filter(([, v]) => v !== '' && v !== undefined && v !== null && !Number.isNaN(v as any)),
          );
          mutate(cleaned);
        })} className="space-y-4">
          {/* Project */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">Project *</label>
            <select
              {...register('projectId', { required: 'Project is required' })}
              className="w-full px-3 py-2 border border-border rounded-lg text-sm bg-background focus:outline-none focus:ring-2 focus:ring-brand-500"
            >
              <option value="">Select project...</option>
              {projects.map((p: any) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
            {errors.projectId && <p className="text-xs text-red-500 mt-0.5">{String(errors.projectId.message)}</p>}
          </div>

          {/* Title */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">Title *</label>
            <input
              {...register('title', { required: 'Title is required' })}
              placeholder="Enter task title..."
              className="w-full px-3 py-2 border border-border rounded-lg text-sm bg-background focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
            {errors.title && <p className="text-xs text-red-500 mt-0.5">{String(errors.title.message)}</p>}
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">Description</label>
            <textarea
              {...register('description')}
              rows={3}
              placeholder="Describe the task..."
              className="w-full px-3 py-2 border border-border rounded-lg text-sm bg-background resize-none focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            {/* Priority */}
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">Priority</label>
              <select
                {...register('priority')}
                className="w-full px-3 py-2 border border-border rounded-lg text-sm bg-background focus:outline-none focus:ring-2 focus:ring-brand-500"
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="critical">Critical</option>
              </select>
            </div>

            {/* Assignee */}
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">Assignee</label>
              <select
                {...register('assigneeId')}
                className="w-full px-3 py-2 border border-border rounded-lg text-sm bg-background focus:outline-none focus:ring-2 focus:ring-brand-500"
              >
                <option value="">Unassigned</option>
                {members.map((m: any) => (
                  <option key={m.id} value={m.id}>{m.first_name} {m.last_name}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {/* Due Date */}
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">Due Date</label>
              <input
                {...register('dueDate')}
                type="date"
                className="w-full px-3 py-2 border border-border rounded-lg text-sm bg-background focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
            </div>

            {/* Estimated Hours */}
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">Est. Hours</label>
              <input
                {...register('estimatedHours', { valueAsNumber: true })}
                type="number"
                step="0.5"
                min="0"
                placeholder="e.g., 8"
                className="w-full px-3 py-2 border border-border rounded-lg text-sm bg-background focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose}
              className="flex-1 py-2.5 border border-border rounded-lg text-sm text-muted-foreground hover:bg-accent transition">
              Cancel
            </button>
            <button type="submit" disabled={isPending}
              className="flex-1 py-2.5 bg-brand-500 text-white rounded-lg text-sm font-medium hover:bg-brand-600 transition disabled:opacity-60 flex items-center justify-center gap-2">
              {isPending && <Loader2 size={14} className="animate-spin" />}
              Create Task
            </button>
          </div>
        </form>
      </motion.div>
    </motion.div>
  );
}

function KanbanCard({ task, onStatusChange }: { task: any; onStatusChange: (status: string) => void }) {
  const priority = priorityConfig[task.priority];
  const overdue = isOverdue(task.due_date, task.status);
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <motion.div
      layout
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className={cn(
        'bg-card border rounded-xl p-3 cursor-pointer hover:shadow-md transition-all group',
        overdue ? 'border-red-200 bg-red-50/30' : 'border-border',
      )}
    >
      {/* Priority bar */}
      <div className="flex items-start justify-between mb-2">
        <div className="flex items-center gap-1.5">
          {task.labels?.slice(0, 2).map((label: string) => (
            <span key={label} className="text-xs bg-muted text-muted-foreground px-1.5 py-0.5 rounded">
              {label}
            </span>
          ))}
        </div>
        <div className="relative">
          <button
            onClick={(e) => { e.stopPropagation(); setMenuOpen(!menuOpen); }}
            className="p-1 rounded opacity-0 group-hover:opacity-100 hover:bg-accent transition"
          >
            <MoreHorizontal size={13} className="text-muted-foreground" />
          </button>
          {menuOpen && (
            <div className="absolute right-0 top-full mt-1 bg-popover border border-border rounded-lg shadow-lg py-1 z-50 w-36">
              {Object.keys(statusConfig).slice(0, 6).map((s) => (
                <button
                  key={s}
                  onClick={() => { onStatusChange(s); setMenuOpen(false); }}
                  className="w-full flex items-center gap-2 px-3 py-1.5 text-xs hover:bg-accent transition"
                >
                  <span className={cn('w-1.5 h-1.5 rounded-full', statusConfig[s]?.dot)} />
                  {statusConfig[s]?.label}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      <p className="text-sm font-medium text-foreground mb-2 leading-snug line-clamp-2">
        {task.title}
      </p>

      <div className="flex items-center gap-2 mb-2">
        <div className="flex-1 h-1 bg-muted rounded-full overflow-hidden">
          <div className="h-full bg-brand-500 rounded-full" style={{ width: `${task.progress_pct || 0}%` }} />
        </div>
        <span className="text-xs text-muted-foreground">{Math.round(task.progress_pct || 0)}%</span>
      </div>

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1">
          <span className={cn('text-xs font-medium', priority?.color)}>{priority?.icon}</span>
          {task.due_date && (
            <span className={cn('flex items-center gap-0.5 text-xs', overdue ? 'text-red-600' : 'text-muted-foreground')}>
              <Calendar size={10} />
              {formatDate(task.due_date, 'MMM d')}
            </span>
          )}
        </div>
        {task.assignee_name && (
          <div className="w-6 h-6 rounded-full bg-brand-100 flex items-center justify-center text-xs text-brand-700 font-medium">
            {task.assignee_name.split(' ').map((n: string) => n[0]).join('')}
          </div>
        )}
      </div>
    </motion.div>
  );
}
