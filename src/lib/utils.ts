import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { TaskStatus, ProjectStatus, TaskPriority } from '@/types';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(amount);
}

export function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

export function formatRelativeTime(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

export function getStatusColor(status: TaskStatus | ProjectStatus): string {
  const colors: Record<string, string> = {
    NOT_STARTED: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300',
    IN_PROGRESS: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',
    BLOCKED: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300',
    IN_REVIEW: 'bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300',
    COMPLETED: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300',
    ACTIVE: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',
    PLANNING: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300',
    ON_HOLD: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300',
    CANCELLED: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300',
    AT_RISK: 'bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300',
  };
  return colors[status] ?? 'bg-slate-100 text-slate-600';
}

export function getStatusDot(status: TaskStatus | ProjectStatus): string {
  const dots: Record<string, string> = {
    NOT_STARTED: 'bg-slate-400',
    IN_PROGRESS: 'bg-blue-500',
    BLOCKED: 'bg-red-500',
    IN_REVIEW: 'bg-purple-500',
    COMPLETED: 'bg-emerald-500',
    ACTIVE: 'bg-blue-500',
    PLANNING: 'bg-amber-500',
    ON_HOLD: 'bg-slate-400',
    CANCELLED: 'bg-red-400',
    AT_RISK: 'bg-orange-500',
  };
  return dots[status] ?? 'bg-slate-400';
}

export function getPriorityColor(priority: TaskPriority): string {
  const colors: Record<string, string> = {
    CRITICAL: 'text-red-600 dark:text-red-400',
    HIGH: 'text-orange-600 dark:text-orange-400',
    MEDIUM: 'text-amber-600 dark:text-amber-400',
    LOW: 'text-slate-500 dark:text-slate-400',
  };
  return colors[priority] ?? 'text-slate-500';
}

export function getHealthColor(score: number): string {
  if (score >= 80) return 'text-emerald-600 dark:text-emerald-400';
  if (score >= 60) return 'text-amber-600 dark:text-amber-400';
  if (score >= 40) return 'text-orange-600 dark:text-orange-400';
  return 'text-red-600 dark:text-red-400';
}

export function getUtilizationColor(pct: number): string {
  if (pct > 95) return 'text-red-600 dark:text-red-400';
  if (pct > 85) return 'text-orange-500 dark:text-orange-400';
  if (pct > 70) return 'text-emerald-600 dark:text-emerald-400';
  return 'text-blue-500 dark:text-blue-400';
}

export function getInitials(name: string): string {
  return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
}

export function daysUntil(dateStr: string): number {
  return Math.ceil((new Date(dateStr).getTime() - Date.now()) / 86400000);
}

export function daysOverdue(dateStr: string): number {
  const d = daysUntil(dateStr);
  return d < 0 ? Math.abs(d) : 0;
}

export function calcBudgetBurnPercent(spent: number, total: number): number {
  return Math.round((spent / total) * 100);
}
