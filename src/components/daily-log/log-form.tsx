'use client';
import React, { useState } from 'react';
import { Send, Plus, X, Clock, CheckCircle2, AlertTriangle, Calendar } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import { useSession } from 'next-auth/react';
import { useProjects } from '@/hooks/use-projects';
import { useTasks } from '@/hooks/use-tasks';
import { useSubmitDailyLog } from '@/hooks/use-daily-logs';

const STATUS_OPTIONS = [
  { value: 'NOT_STARTED', label: 'Not Started' },
  { value: 'IN_PROGRESS', label: 'In Progress' },
  { value: 'BLOCKED', label: 'Blocked' },
  { value: 'IN_REVIEW', label: 'In Review' },
  { value: 'COMPLETED', label: 'Completed' },
];

export function DailyLogForm({ onSuccess }: { onSuccess?: () => void }) {
  const { data: session } = useSession();
  const { data: projects = [] } = useProjects();
  const { data: tasks = [] } = useTasks();
  const submitLog = useSubmitDailyLog();
  const [submitted, setSubmitted] = useState(false);

  const [form, setForm] = useState({
    projectId: '',
    taskId: '',
    status: 'IN_PROGRESS',
    summary: '',
    hoursWorked: '',
    blockers: '',
    tomorrowPlan: '',
    progressPercent: 50,
    deliverables: [''],
  });

  const projectTasks = tasks.filter((t: any) =>
    t.projectId === form.projectId && (t.assigneeId === (session?.user as any)?.id)
  );

  const addDeliverable = () => setForm(f => ({ ...f, deliverables: [...f.deliverables, ''] }));
  const removeDeliverable = (i: number) => setForm(f => ({ ...f, deliverables: f.deliverables.filter((_, idx) => idx !== i) }));
  const updateDeliverable = (i: number, val: string) =>
    setForm(f => ({ ...f, deliverables: f.deliverables.map((d, idx) => idx === i ? val : d) }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.projectId || !form.summary) return;

    try {
      await submitLog.mutateAsync({
        projectId: form.projectId,
        taskId: form.taskId || undefined,
        status: form.status,
        summary: form.summary,
        hoursWorked: parseFloat(form.hoursWorked) || 0,
        blockers: form.blockers,
        tomorrowPlan: form.tomorrowPlan,
        progressPercent: form.progressPercent,
        deliverables: form.deliverables.filter(d => d.trim()),
      });
      setSubmitted(true);
      onSuccess?.();
    } catch {
      // error handled by React Query
    }
  };

  if (submitted) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-950">
          <CheckCircle2 className="h-7 w-7 text-emerald-600 dark:text-emerald-400" />
        </div>
        <h3 className="mt-4 text-base font-semibold text-slate-900 dark:text-slate-100">Daily log submitted!</h3>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Your work for today has been recorded.</p>
        <Button className="mt-4" onClick={() => setSubmitted(false)} variant="outline" size="sm">
          Submit another
        </Button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Date indicator */}
      <div className="flex items-center gap-2 rounded-xl bg-indigo-50 px-4 py-3 dark:bg-indigo-950/30">
        <Calendar className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
        <span className="text-sm font-medium text-indigo-700 dark:text-indigo-300">
          Daily Log — {new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
        </span>
      </div>

      {/* Project & Task */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">Project *</label>
          <select
            required
            value={form.projectId}
            onChange={e => setForm(f => ({ ...f, projectId: e.target.value, taskId: '' }))}
            className="flex h-9 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
          >
            <option value="">Select project</option>
            {projects.map((p: any) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </div>
        <div>
          <label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">Task (optional)</label>
          <select
            value={form.taskId}
            onChange={e => setForm(f => ({ ...f, taskId: e.target.value }))}
            disabled={!form.projectId}
            className="flex h-9 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 disabled:opacity-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
          >
            <option value="">General work</option>
            {projectTasks.map((t: any) => <option key={t.id} value={t.id}>{t.title}</option>)}
          </select>
        </div>
      </div>

      {/* Status & Hours */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">Status</label>
          <select
            value={form.status}
            onChange={e => setForm(f => ({ ...f, status: e.target.value }))}
            className="flex h-9 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
          >
            {STATUS_OPTIONS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
          </select>
        </div>
        <div>
          <label className="mb-1.5 flex items-center gap-1.5 text-sm font-medium text-slate-700 dark:text-slate-300">
            <Clock className="h-3.5 w-3.5" /> Hours Worked
          </label>
          <Input
            type="number"
            min="0"
            max="24"
            step="0.5"
            placeholder="e.g. 7.5"
            value={form.hoursWorked}
            onChange={e => setForm(f => ({ ...f, hoursWorked: e.target.value }))}
          />
        </div>
      </div>

      {/* Summary */}
      <div>
        <label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">
          What did you accomplish today? *
        </label>
        <textarea
          required
          rows={4}
          placeholder="Describe what you worked on, what you completed, and any notable achievements..."
          value={form.summary}
          onChange={e => setForm(f => ({ ...f, summary: e.target.value }))}
          className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:placeholder:text-slate-500 resize-none"
        />
      </div>

      {/* Deliverables */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Deliverables Completed</label>
          <button type="button" onClick={addDeliverable} className="flex items-center gap-1 text-xs text-indigo-600 hover:text-indigo-700 dark:text-indigo-400">
            <Plus className="h-3 w-3" /> Add
          </button>
        </div>
        <div className="space-y-2">
          {form.deliverables.map((d, i) => (
            <div key={i} className="flex gap-2">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-emerald-50 dark:bg-emerald-950/30">
                <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
              </div>
              <Input
                placeholder="e.g. Completed API endpoint for product filtering"
                value={d}
                onChange={e => updateDeliverable(i, e.target.value)}
              />
              {form.deliverables.length > 1 && (
                <button type="button" onClick={() => removeDeliverable(i)} className="shrink-0 rounded-lg p-2 text-slate-400 hover:text-red-500">
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Progress */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Task Progress</label>
          <span className="text-sm font-bold text-slate-900 dark:text-slate-100">{form.progressPercent}%</span>
        </div>
        <input
          type="range"
          min="0"
          max="100"
          step="5"
          value={form.progressPercent}
          onChange={e => setForm(f => ({ ...f, progressPercent: Number(e.target.value) }))}
          className="w-full accent-indigo-600"
        />
        <Progress value={form.progressPercent} className="mt-2" />
      </div>

      {/* Blockers */}
      {form.status === 'BLOCKED' && (
        <div>
          <label className="mb-1.5 flex items-center gap-1.5 text-sm font-medium text-red-600 dark:text-red-400">
            <AlertTriangle className="h-3.5 w-3.5" /> Blocker Details
          </label>
          <textarea
            rows={2}
            placeholder="Describe what is blocking you and what you need to unblock..."
            value={form.blockers}
            onChange={e => setForm(f => ({ ...f, blockers: e.target.value }))}
            className="w-full rounded-lg border border-red-200 bg-red-50/50 px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-red-500 focus:outline-none focus:ring-1 focus:ring-red-500 dark:border-red-800 dark:bg-red-950/20 dark:text-slate-100 resize-none"
          />
        </div>
      )}

      {/* Tomorrow's plan */}
      <div>
        <label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">
          Plan for Tomorrow
        </label>
        <textarea
          rows={2}
          placeholder="What will you work on tomorrow?"
          value={form.tomorrowPlan}
          onChange={e => setForm(f => ({ ...f, tomorrowPlan: e.target.value }))}
          className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:placeholder:text-slate-500 resize-none"
        />
      </div>

      <Button type="submit" disabled={submitLog.isPending} className="w-full gap-2">
        <Send className="h-4 w-4" />
        {submitLog.isPending ? 'Submitting...' : 'Submit Daily Log'}
      </Button>
    </form>
  );
}
