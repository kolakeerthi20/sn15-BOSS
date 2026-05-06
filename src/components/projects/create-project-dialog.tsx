'use client';
import React, { useState } from 'react';
import { Loader2 } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useCreateProject } from '@/hooks/use-projects';

const PRIORITIES = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'];

const field = 'flex flex-col gap-1.5';
const label = 'text-xs font-medium text-slate-700 dark:text-slate-300';
const input = 'h-9 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CreateProjectDialog({ open, onOpenChange }: Props) {
  const { mutate, isPending } = useCreateProject();
  const [form, setForm] = useState({
    name: '', client: '', description: '',
    startDate: '', endDate: '',
    budget: '', priority: 'MEDIUM',
  });
  const [error, setError] = useState('');

  function set(k: string, v: string) { setForm(f => ({ ...f, [k]: v })); }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name || !form.startDate || !form.endDate) {
      setError('Name, start date, and end date are required.');
      return;
    }
    setError('');
    mutate(
      {
        name: form.name,
        client: form.client || undefined,
        description: form.description || undefined,
        startDate: form.startDate,
        endDate: form.endDate,
        budget: form.budget ? parseFloat(form.budget) : undefined,
        priority: form.priority,
      },
      {
        onSuccess: () => {
          onOpenChange(false);
          setForm({ name: '', client: '', description: '', startDate: '', endDate: '', budget: '', priority: 'MEDIUM' });
        },
        onError: (err: any) => setError(err?.message ?? 'Failed to create project.'),
      },
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>New Project</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="space-y-4 px-6 pb-2">
            {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-xs text-red-600 dark:bg-red-950/30 dark:text-red-400">{error}</p>}

            <div className={field}>
              <label className={label}>Project name *</label>
              <input className={input} placeholder="e.g. Website Redesign" value={form.name} onChange={e => set('name', e.target.value)} />
            </div>

            <div className={field}>
              <label className={label}>Client</label>
              <input className={input} placeholder="e.g. Acme Corp" value={form.client} onChange={e => set('client', e.target.value)} />
            </div>

            <div className={field}>
              <label className={label}>Description</label>
              <textarea
                rows={2}
                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 resize-none"
                placeholder="What is this project about?"
                value={form.description}
                onChange={e => set('description', e.target.value)}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className={field}>
                <label className={label}>Start date *</label>
                <input type="date" className={input} value={form.startDate} onChange={e => set('startDate', e.target.value)} />
              </div>
              <div className={field}>
                <label className={label}>End date *</label>
                <input type="date" className={input} value={form.endDate} onChange={e => set('endDate', e.target.value)} />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className={field}>
                <label className={label}>Budget ($)</label>
                <input type="number" min="0" className={input} placeholder="0" value={form.budget} onChange={e => set('budget', e.target.value)} />
              </div>
              <div className={field}>
                <label className={label}>Priority</label>
                <select className={input} value={form.priority} onChange={e => set('priority', e.target.value)}>
                  {PRIORITIES.map(p => <option key={p} value={p}>{p}</option>)}
                </select>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" size="sm" onClick={() => onOpenChange(false)} disabled={isPending}>
              Cancel
            </Button>
            <Button type="submit" size="sm" disabled={isPending} className="gap-1.5">
              {isPending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              Create Project
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
