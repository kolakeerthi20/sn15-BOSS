'use client';
import React, { useState } from 'react';
import { X, Flag, Calendar, Clock, User, MessageSquare, Paperclip, CheckSquare, AlertTriangle, ChevronDown } from 'lucide-react';
import { Task, TaskStatus, TaskPriority } from '@/types';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { useAppStore } from '@/store/app-store';
import { getInitials, formatDate, getPriorityColor, getStatusColor } from '@/lib/utils';
import { cn } from '@/lib/utils';

const STATUS_OPTIONS: TaskStatus[] = ['NOT_STARTED', 'IN_PROGRESS', 'BLOCKED', 'IN_REVIEW', 'COMPLETED'];
const PRIORITY_OPTIONS: TaskPriority[] = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'];

interface TaskDetailProps {
  task: Task;
  onClose: () => void;
}

export function TaskDetail({ task, onClose }: TaskDetailProps) {
  const { updateTask, currentUser } = useAppStore();
  const [comment, setComment] = useState('');

  const handleStatusChange = (status: TaskStatus) => updateTask(task.id, { status });
  const handleProgressChange = (progress: number) => updateTask(task.id, { progressPercent: progress });

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 border-b border-slate-200 p-6 dark:border-slate-800">
        <div className="flex-1">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">{task.title}</h2>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{task.description}</p>
        </div>
        <button onClick={onClose} className="shrink-0 rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800">
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        {/* Status & Priority row */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Status</label>
            <select
              value={task.status}
              onChange={e => handleStatusChange(e.target.value as TaskStatus)}
              className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
            >
              {STATUS_OPTIONS.map(s => <option key={s} value={s}>{s.replace('_', ' ')}</option>)}
            </select>
          </div>
          <div>
            <label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Priority</label>
            <select
              value={task.priority}
              onChange={e => updateTask(task.id, { priority: e.target.value as TaskPriority })}
              className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
            >
              {PRIORITY_OPTIONS.map(p => <option key={p} value={p}>{p}</option>)}
            </select>
          </div>
        </div>

        {/* Assignee */}
        <div>
          <label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Assignee</label>
          <div className="flex items-center gap-2 rounded-lg border border-slate-200 p-2.5 dark:border-slate-700">
            <Avatar className="h-7 w-7">
              <AvatarFallback name={task.assignee.name} className="text-xs">{getInitials(task.assignee.name)}</AvatarFallback>
            </Avatar>
            <div>
              <p className="text-sm font-medium text-slate-900 dark:text-slate-100">{task.assignee.name}</p>
              <p className="text-xs text-slate-500">{task.assignee.designation}</p>
            </div>
          </div>
        </div>

        {/* Dates */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              <Calendar className="h-3 w-3" /> Start Date
            </label>
            <p className="rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700 dark:border-slate-700 dark:text-slate-300">{formatDate(task.startDate)}</p>
          </div>
          <div>
            <label className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              <Calendar className="h-3 w-3" /> Due Date
            </label>
            <p className="rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700 dark:border-slate-700 dark:text-slate-300">{formatDate(task.dueDate)}</p>
          </div>
        </div>

        {/* Hours */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              <Clock className="h-3 w-3" /> Estimated
            </label>
            <p className="rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700 dark:border-slate-700 dark:text-slate-300">{task.estimatedHours}h</p>
          </div>
          <div>
            <label className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              <Clock className="h-3 w-3" /> Actual
            </label>
            <p className="rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700 dark:border-slate-700 dark:text-slate-300">{task.actualHours}h</p>
          </div>
        </div>

        {/* Progress */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Progress</label>
            <span className="text-sm font-bold text-slate-900 dark:text-slate-100">{task.progressPercent}%</span>
          </div>
          <input
            type="range"
            min="0"
            max="100"
            value={task.progressPercent}
            onChange={e => handleProgressChange(Number(e.target.value))}
            className="w-full accent-indigo-600"
          />
          <Progress value={task.progressPercent} className="mt-2" />
        </div>

        {/* Subtasks */}
        {task.subtasks.length > 0 && (
          <div>
            <label className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              <CheckSquare className="h-3 w-3" />
              Subtasks ({task.subtasks.filter(s => s.completed).length}/{task.subtasks.length})
            </label>
            <div className="space-y-1.5">
              {task.subtasks.map(sub => (
                <div key={sub.id} className="flex items-center gap-2 rounded-lg border border-slate-100 p-2.5 dark:border-slate-800">
                  <div className={cn('h-4 w-4 shrink-0 rounded border-2 flex items-center justify-center', sub.completed ? 'border-indigo-600 bg-indigo-600' : 'border-slate-300 dark:border-slate-600')}>
                    {sub.completed && <svg className="h-2.5 w-2.5 text-white" viewBox="0 0 10 10" fill="none"><path d="M1.5 5L4 7.5L8.5 2.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>}
                  </div>
                  <span className={cn('text-sm', sub.completed ? 'line-through text-slate-400' : 'text-slate-700 dark:text-slate-300')}>{sub.title}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Labels */}
        {task.labels.length > 0 && (
          <div>
            <label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Labels</label>
            <div className="flex flex-wrap gap-1.5">
              {task.labels.map(label => (
                <span key={label} className="rounded-full bg-indigo-50 px-2.5 py-1 text-xs font-medium text-indigo-700 dark:bg-indigo-950/30 dark:text-indigo-400">
                  {label}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Blocked warning */}
        {task.status === 'BLOCKED' && (
          <div className="flex items-start gap-2 rounded-xl bg-red-50 p-3.5 dark:bg-red-950/20">
            <AlertTriangle className="h-4 w-4 text-red-500 mt-0.5 shrink-0" />
            <p className="text-sm text-red-700 dark:text-red-300">This task is currently blocked. Update status or add a comment with the blocker details so your manager can assist.</p>
          </div>
        )}

        {/* Comments */}
        <div>
          <label className="mb-3 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            <MessageSquare className="h-3 w-3" /> Comments ({task.comments.length})
          </label>
          {currentUser && (
            <div className="flex gap-2">
              <Avatar className="h-7 w-7 shrink-0">
                <AvatarFallback name={currentUser.name} className="text-xs">{getInitials(currentUser.name)}</AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <textarea
                  value={comment}
                  onChange={e => setComment(e.target.value)}
                  placeholder="Add a comment... Use @name to mention someone"
                  rows={2}
                  className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 resize-none"
                />
                {comment.trim() && (
                  <div className="mt-2 flex justify-end gap-2">
                    <Button variant="ghost" size="sm" onClick={() => setComment('')}>Cancel</Button>
                    <Button size="sm" onClick={() => setComment('')}>Comment</Button>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
