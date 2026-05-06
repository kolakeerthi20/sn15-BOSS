'use client';
import React, { useState } from 'react';
import { Plus, Clock, AlertTriangle, Flag } from 'lucide-react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Progress } from '@/components/ui/progress';
import { getInitials, getPriorityColor, formatDate, daysUntil } from '@/lib/utils';
import { cn } from '@/lib/utils';
import { useUpdateTask } from '@/hooks/use-tasks';
import { useUIStore } from '@/store/app-store';

const COLUMNS = [
  { status: 'NOT_STARTED', label: 'Not Started', color: 'text-slate-500', bg: 'bg-slate-100 dark:bg-slate-800' },
  { status: 'IN_PROGRESS', label: 'In Progress', color: 'text-blue-600 dark:text-blue-400', bg: 'bg-blue-50 dark:bg-blue-950/20' },
  { status: 'BLOCKED', label: 'Blocked', color: 'text-red-600 dark:text-red-400', bg: 'bg-red-50 dark:bg-red-950/20' },
  { status: 'IN_REVIEW', label: 'In Review', color: 'text-purple-600 dark:text-purple-400', bg: 'bg-purple-50 dark:bg-purple-950/20' },
  { status: 'COMPLETED', label: 'Completed', color: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-50 dark:bg-emerald-950/20' },
] as const;

type TaskStatus = typeof COLUMNS[number]['status'];

interface KanbanBoardProps {
  tasks: any[];
  projectId?: string;
}

export function KanbanBoard({ tasks, projectId }: KanbanBoardProps) {
  const { selectTask } = useUIStore();
  const updateTask = useUpdateTask();
  const [dragging, setDragging] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState<TaskStatus | null>(null);

  const getColumnTasks = (status: TaskStatus) => tasks.filter(t => t.status === status);

  const handleDrop = (status: TaskStatus) => {
    if (dragging) {
      updateTask.mutate({ id: dragging, data: { status } });
    }
    setDragging(null);
    setDragOver(null);
  };

  return (
    <div className="flex gap-4 overflow-x-auto pb-4">
      {COLUMNS.map(col => {
        const colTasks = getColumnTasks(col.status);
        return (
          <div
            key={col.status}
            className={cn(
              'flex min-w-[280px] max-w-[280px] flex-col rounded-xl transition-colors',
              dragOver === col.status ? 'ring-2 ring-indigo-400' : ''
            )}
            onDragOver={e => { e.preventDefault(); setDragOver(col.status); }}
            onDrop={() => handleDrop(col.status)}
            onDragLeave={() => setDragOver(null)}
          >
            <div className={cn('flex items-center justify-between rounded-t-xl px-3 py-2.5', col.bg)}>
              <div className="flex items-center gap-2">
                <span className={cn('text-xs font-semibold', col.color)}>{col.label}</span>
                <span className="flex h-4 w-4 items-center justify-center rounded-full bg-white/80 text-[10px] font-bold text-slate-600 dark:bg-slate-900/80 dark:text-slate-400">
                  {colTasks.length}
                </span>
              </div>
              <button className="rounded p-0.5 text-slate-400 hover:text-slate-600">
                <Plus className="h-3.5 w-3.5" />
              </button>
            </div>

            <div className="flex-1 space-y-2.5 rounded-b-xl bg-slate-50/60 p-2 dark:bg-slate-900/40 min-h-[200px]">
              {colTasks.map((task: any) => (
                <KanbanCard
                  key={task.id}
                  task={task}
                  isDragging={dragging === task.id}
                  onDragStart={() => setDragging(task.id)}
                  onDragEnd={() => { setDragging(null); setDragOver(null); }}
                  onClick={() => selectTask(task.id)}
                />
              ))}
              {colTasks.length === 0 && (
                <div className="flex h-16 items-center justify-center rounded-lg border border-dashed border-slate-200 dark:border-slate-700">
                  <p className="text-xs text-slate-400">Drop here</p>
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function KanbanCard({ task, isDragging, onDragStart, onDragEnd, onClick }: {
  task: any;
  isDragging: boolean;
  onDragStart: () => void;
  onDragEnd: () => void;
  onClick: () => void;
}) {
  const daysLeft = daysUntil(task.dueDate);
  const isOverdue = daysLeft < 0;

  return (
    <div
      draggable
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      onClick={onClick}
      className={cn(
        'cursor-grab rounded-xl border border-slate-200 bg-white p-3 shadow-sm transition-all hover:shadow-md hover:border-indigo-200 active:cursor-grabbing dark:border-slate-700 dark:bg-slate-900 dark:hover:border-indigo-600/40',
        isDragging && 'opacity-50 rotate-2 scale-95',
        task.status === 'BLOCKED' && 'border-l-2 border-l-red-500',
        task.priority === 'CRITICAL' && 'border-l-2 border-l-red-600'
      )}
    >
      {(task.labels ?? []).length > 0 && (
        <div className="mb-2 flex flex-wrap gap-1">
          {task.labels.map((label: string) => (
            <span key={label} className="rounded-full bg-indigo-50 px-2 py-0.5 text-[10px] font-medium text-indigo-600 dark:bg-indigo-950/30 dark:text-indigo-400">
              {label}
            </span>
          ))}
        </div>
      )}

      <p className="text-xs font-medium text-slate-900 dark:text-slate-100 line-clamp-2 leading-relaxed">{task.title}</p>

      {(task.progressPercent ?? 0) > 0 && (
        <div className="mt-2">
          <Progress value={task.progressPercent} className="h-1" />
        </div>
      )}

      {(task.subtasks ?? []).length > 0 && (
        <p className="mt-1.5 text-[10px] text-slate-400">
          {task.subtasks.filter((s: any) => s.completed).length}/{task.subtasks.length} subtasks
        </p>
      )}

      <div className="mt-2.5 flex items-center justify-between">
        <div className="flex items-center gap-2">
          {task.assignee && (
            <Avatar className="h-5 w-5">
              <AvatarFallback name={task.assignee.name} className="text-[8px]">
                {getInitials(task.assignee.name)}
              </AvatarFallback>
            </Avatar>
          )}
          {(task.estimatedHours ?? 0) > 0 && (
            <span className="flex items-center gap-0.5 text-[10px] text-slate-400">
              <Clock className="h-2.5 w-2.5" />
              {task.actualHours ?? 0}/{task.estimatedHours}h
            </span>
          )}
        </div>
        <div className="flex items-center gap-1">
          {task.status === 'BLOCKED' && <AlertTriangle className="h-3 w-3 text-red-500" />}
          <span className={cn('text-[10px] font-medium', getPriorityColor(task.priority))}>
            <Flag className="h-2.5 w-2.5 inline mr-0.5" />
            {task.priority}
          </span>
        </div>
      </div>

      <div className={cn(
        'mt-1.5 text-[10px] font-medium',
        isOverdue ? 'text-red-600 dark:text-red-400' : daysLeft <= 3 ? 'text-amber-600 dark:text-amber-400' : 'text-slate-400'
      )}>
        {isOverdue ? `${Math.abs(daysLeft)}d overdue` : daysLeft === 0 ? 'Due today' : `Due ${formatDate(task.dueDate)}`}
      </div>
    </div>
  );
}
