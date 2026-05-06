'use client';
import React, { useState } from 'react';
import { Loader2 } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useCreateTask } from '@/hooks/use-tasks';
import { useProjects } from '@/hooks/use-projects';
import { useResources } from '@/hooks/use-resources';

const PRIORITIES = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'];

const field = 'flex flex-col gap-1.5';
const label = 'text-xs font-medium text-slate-700 dark:text-slate-300';
const input = 'h-9 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultProjectId?: string;
}

export function CreateTaskDialog({ open, onOpenChange, defaultProjectId }: Props) {
  const { mutate, isPending } = useCreateTask();
  const { data: projects = [] } = useProjects();
  const { data: resources = [] } = useResources();

  const [form, setForm] = useState({
    projectId: defaultProjectId ?? '',
    title: '', description: '',
    assigneeId: '', priority: 'MEDIUM',
    dueDate: '', estimatedHours: '',
  });
  const [error, setError] = useState('');

  function set(k: string, v: string) { setForm(f => ({ ...f, [k]: v })); }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.projectId || !form.title || !form.assigneeId) {
      setError('Project, title, and assignee are required.');
      return;
    }
    setError('');
    mutate(
      {
        projectId: form.projectId,
        title: form.title,
        description: form.description || undefined,
        assigneeId: form.assigneeId,
        priority: form.priority,
        dueDate: form.dueDate || undefined,
        estimatedHours: form.estimatedHours ? parseFloat(form.estimatedHours) : undefined,
      },
      {
        onSuccess: () => {
          onOpenChange(false);
          setForm({ projectId: defaultProjectId ?? '', title: '', description: '', assigneeId: '', priority: 'MEDIUM', dueDate: '', estimatedHours: '' });
        },
        onError: (err: any) => setError(err?.message ?? 'Failed to create task.'),
      },
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Add Task</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="space-y-4 px-6 pb-2">
            {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-xs text-red-600 dark:bg-red-950/30 dark:text-red-400">{error}</p>}

            <div className={field}>
              <label className={label}>Project *</label>
              <select className={input} value={form.projectId} onChange={e => set('projectId', e.target.value)}>
                <option value="">Select a project…</option>
                {projects.map((p: any) => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>

            <div className={field}>
              <label className={label}>Task title *</label>
              <input className={input} placeholder="e.g. Design homepage mockup" value={form.title} onChange={e => set('title', e.target.value)} />
            </div>

            <div className={field}>
              <label className={label}>Description</label>
              <textarea
                rows={2}
                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 resize-none"
                placeholder="What needs to be done?"
                value={form.description}
                onChange={e => set('description', e.target.value)}
              />
            </div>

            <div className={field}>
              <label className={label}>Assignee *</label>
              <select className={input} value={form.assigneeId} onChange={e => set('assigneeId', e.target.value)}>
                <option value="">Select a team member…</option>
                {resources.map((u: any) => <option key={u.id} value={u.id}>{u.name}</option>)}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className={field}>
                <label className={label}>Priority</label>
                <select className={input} value={form.priority} onChange={e => set('priority', e.target.value)}>
                  {PRIORITIES.map(p => <option key={p} value={p}>{p}</option>)}
                </select>
              </div>
              <div className={field}>
                <label className={label}>Due date</label>
                <input type="date" className={input} value={form.dueDate} onChange={e => set('dueDate', e.target.value)} />
              </div>
            </div>

            <div className={field}>
              <label className={label}>Estimated hours</label>
              <input type="number" min="0" step="0.5" className={input} placeholder="e.g. 8" value={form.estimatedHours} onChange={e => set('estimatedHours', e.target.value)} />
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" size="sm" onClick={() => onOpenChange(false)} disabled={isPending}>
              Cancel
            </Button>
            <Button type="submit" size="sm" disabled={isPending} className="gap-1.5">
              {isPending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              Create Task
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
