'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { X, Loader2 } from 'lucide-react';
import { projectsApi } from '@/lib/api';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';

const emptyStr = (v: unknown) => (v === '' ? undefined : v);
const emptyNum = (v: unknown) => {
  if (v === '' || v === undefined || v === null) return undefined;
  const n = Number(v);
  return isNaN(n) ? undefined : n;
};

const schema = z.object({
  name: z.string().min(1, 'Project name is required').max(255),
  description: z.string().optional().transform(emptyStr),
  code: z.string().max(20).optional().transform(emptyStr),
  status: z.enum(['planning', 'active', 'on_hold']).default('planning'),
  priority: z.enum(['low', 'medium', 'high', 'critical']).default('medium'),
  startDate: z.string().optional().transform(emptyStr),
  endDate: z.string().optional().transform(emptyStr),
  budget: z.union([z.string(), z.number()]).optional().transform(emptyNum),
  estimatedHours: z.union([z.string(), z.number()]).optional().transform(emptyNum),
  color: z.string().default('#6366f1'),
});

type FormData = z.infer<typeof schema>;

const COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#f97316', '#ec4899'];

interface Props { open: boolean; onClose: () => void; }

export function CreateProjectModal({ open, onClose }: Props) {
  const queryClient = useQueryClient();
  const [selectedColor, setSelectedColor] = useState('#6366f1');

  const {
    register, handleSubmit, reset,
    formState: { errors },
    setValue,
  } = useForm<FormData>({ resolver: zodResolver(schema), defaultValues: { color: '#6366f1', status: 'planning', priority: 'medium' } });

  const { mutate, isPending } = useMutation({
    mutationFn: projectsApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      toast.success('Project created successfully!');
      reset();
      onClose();
    },
    onError: (err: any) => {
      console.error('[CreateProject] API error:', err?.response?.status, err?.response?.data);
      const msg = err?.response?.data?.message;
      const errText = Array.isArray(msg) ? msg.join(', ') : (msg || err?.message || 'Failed to create project');
      toast.error(`Error: ${errText}`);
    },
  });

  const onSubmit = (data: FormData) => {
    // Strip undefined/null so optional fields are omitted from the payload
    const payload = Object.fromEntries(
      Object.entries({ ...data, color: selectedColor }).filter(([, v]) => v !== undefined && v !== null),
    );
    console.log('[CreateProject] submitting payload:', payload);
    mutate(payload as any);
  };

  // Show Zod validation errors in console if form fails to submit
  const onInvalid = (errs: any) => {
    console.error('[CreateProject] Zod validation errors:', errs);
  };

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            onClick={onClose}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 8 }}
            className="relative bg-card border border-border rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto"
          >
            <div className="flex items-center justify-between p-5 border-b border-border">
              <h2 className="text-lg font-semibold text-foreground">Create New Project</h2>
              <button onClick={onClose} className="p-1 rounded-lg hover:bg-accent text-muted-foreground">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSubmit(onSubmit, onInvalid)} className="p-5 space-y-4">
              {/* Color picker */}
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">Project Color</label>
                <div className="flex gap-2">
                  {COLORS.map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => { setSelectedColor(c); setValue('color', c); }}
                      className="w-7 h-7 rounded-full ring-offset-2 transition-all"
                      style={{
                        background: c,
                        boxShadow: selectedColor === c ? `0 0 0 3px ${c}40` : undefined,
                        outline: selectedColor === c ? `2px solid ${c}` : undefined,
                      }}
                    />
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">Project Name *</label>
                <input
                  {...register('name')}
                  placeholder="e.g., E-Commerce Platform Redesign"
                  className="w-full px-3 py-2 border border-border rounded-lg text-sm bg-background focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
                {errors.name && <p className="text-red-500 text-xs mt-1">{errors.name.message}</p>}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1.5">Code</label>
                  <input
                    {...register('code')}
                    placeholder="ECP-001"
                    className="w-full px-3 py-2 border border-border rounded-lg text-sm bg-background focus:outline-none focus:ring-2 focus:ring-brand-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1.5">Priority</label>
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
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">Description</label>
                <textarea
                  {...register('description')}
                  rows={3}
                  placeholder="Brief description of the project..."
                  className="w-full px-3 py-2 border border-border rounded-lg text-sm bg-background focus:outline-none focus:ring-2 focus:ring-brand-500 resize-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1.5">Start Date</label>
                  <input
                    {...register('startDate')}
                    type="date"
                    className="w-full px-3 py-2 border border-border rounded-lg text-sm bg-background focus:outline-none focus:ring-2 focus:ring-brand-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1.5">End Date</label>
                  <input
                    {...register('endDate')}
                    type="date"
                    className="w-full px-3 py-2 border border-border rounded-lg text-sm bg-background focus:outline-none focus:ring-2 focus:ring-brand-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1.5">Budget ($)</label>
                  <input
                    {...register('budget')}
                    type="number"
                    placeholder="150000"
                    className="w-full px-3 py-2 border border-border rounded-lg text-sm bg-background focus:outline-none focus:ring-2 focus:ring-brand-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1.5">Est. Hours</label>
                  <input
                    {...register('estimatedHours')}
                    type="number"
                    placeholder="800"
                    className="w-full px-3 py-2 border border-border rounded-lg text-sm bg-background focus:outline-none focus:ring-2 focus:ring-brand-500"
                  />
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="flex-1 px-4 py-2.5 border border-border rounded-lg text-sm font-medium text-muted-foreground hover:bg-accent transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isPending}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-brand-500 hover:bg-brand-600 text-white rounded-lg text-sm font-medium transition disabled:opacity-60"
                >
                  {isPending && <Loader2 size={14} className="animate-spin" />}
                  {isPending ? 'Creating...' : 'Create Project'}
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
