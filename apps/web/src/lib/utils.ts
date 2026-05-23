import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { format, formatDistanceToNow, isToday, isTomorrow, isPast, parseISO } from 'date-fns';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const statusConfig: Record<string, { label: string; color: string; bg: string; dot: string }> = {
  not_started:  { label: 'Not Started',  color: 'text-slate-600', bg: 'bg-slate-100',  dot: 'bg-slate-400' },
  in_progress:  { label: 'In Progress',  color: 'text-blue-700',  bg: 'bg-blue-100',   dot: 'bg-blue-500' },
  blocked:      { label: 'Blocked',      color: 'text-red-700',   bg: 'bg-red-100',    dot: 'bg-red-500' },
  in_review:    { label: 'In Review',    color: 'text-amber-700', bg: 'bg-amber-100',  dot: 'bg-amber-500' },
  completed:    { label: 'Completed',    color: 'text-green-700', bg: 'bg-green-100',  dot: 'bg-green-500' },
  cancelled:    { label: 'Cancelled',    color: 'text-gray-500',  bg: 'bg-gray-100',   dot: 'bg-gray-400' },
  planning:     { label: 'Planning',     color: 'text-violet-700',bg: 'bg-violet-100', dot: 'bg-violet-500' },
  active:       { label: 'Active',       color: 'text-blue-700',  bg: 'bg-blue-100',   dot: 'bg-blue-500' },
  on_hold:      { label: 'On Hold',      color: 'text-amber-700', bg: 'bg-amber-100',  dot: 'bg-amber-500' },
  archived:     { label: 'Archived',     color: 'text-gray-500',  bg: 'bg-gray-100',   dot: 'bg-gray-400' },
};

export const priorityConfig: Record<string, { label: string; color: string; bg: string; icon: string }> = {
  low:      { label: 'Low',      color: 'text-emerald-700', bg: 'bg-emerald-100', icon: '▼' },
  medium:   { label: 'Medium',   color: 'text-amber-700',   bg: 'bg-amber-100',   icon: '●' },
  high:     { label: 'High',     color: 'text-orange-700',  bg: 'bg-orange-100',  icon: '▲' },
  critical: { label: 'Critical', color: 'text-red-700',     bg: 'bg-red-100',     icon: '‼' },
};

export const healthConfig: Record<string, { label: string; color: string; bg: string }> = {
  on_track:  { label: 'On Track',   color: 'text-green-700',  bg: 'bg-green-100' },
  at_risk:   { label: 'At Risk',    color: 'text-amber-700',  bg: 'bg-amber-100' },
  off_track: { label: 'Off Track',  color: 'text-red-700',    bg: 'bg-red-100' },
  unknown:   { label: 'Unknown',    color: 'text-gray-500',   bg: 'bg-gray-100' },
};

export function formatDate(date: string | Date | null | undefined, fmt = 'MMM d, yyyy') {
  if (!date) return '—';
  try {
    const d = typeof date === 'string' ? parseISO(date) : date;
    if (isToday(d)) return 'Today';
    if (isTomorrow(d)) return 'Tomorrow';
    return format(d, fmt);
  } catch { return '—'; }
}

export function formatRelative(date: string | Date | null | undefined) {
  if (!date) return '—';
  try {
    const d = typeof date === 'string' ? parseISO(date) : date;
    return formatDistanceToNow(d, { addSuffix: true });
  } catch { return '—'; }
}

export function isDueSoon(date: string | null | undefined) {
  if (!date) return false;
  try {
    const d = parseISO(date);
    const diff = d.getTime() - Date.now();
    return diff > 0 && diff < 3 * 24 * 60 * 60 * 1000;
  } catch { return false; }
}

export function isOverdue(date: string | null | undefined, status: string) {
  if (!date || ['completed', 'cancelled'].includes(status)) return false;
  try { return isPast(parseISO(date)); } catch { return false; }
}

export function formatHours(hours: number | null | undefined) {
  if (!hours && hours !== 0) return '—';
  if (hours < 1) return `${Math.round(hours * 60)}m`;
  const h = Math.floor(hours);
  const m = Math.round((hours - h) * 60);
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

export function formatCurrency(amount: number | null | undefined, currency = 'USD') {
  if (!amount && amount !== 0) return '—';
  return new Intl.NumberFormat('en-US', { style: 'currency', currency, maximumFractionDigits: 0 }).format(amount);
}

export function formatPercent(value: number | null | undefined) {
  if (value === null || value === undefined) return '0%';
  return `${Math.round(value)}%`;
}

export function getInitials(name: string | null | undefined) {
  if (!name) return '?';
  return name.split(' ').map(n => n[0]).filter(Boolean).join('').toUpperCase().slice(0, 2);
}

export function getAvatarColor(name: string | null | undefined) {
  const colors = [
    'bg-violet-500', 'bg-blue-500', 'bg-green-500', 'bg-amber-500',
    'bg-pink-500', 'bg-indigo-500', 'bg-teal-500', 'bg-orange-500',
  ];
  if (!name) return colors[0];
  const idx = name.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0) % colors.length;
  return colors[idx];
}

export function truncate(str: string, length = 50) {
  return str.length <= length ? str : str.slice(0, length) + '…';
}

export function utilizationColor(pct: number) {
  if (pct >= 90) return 'text-red-600 bg-red-50';
  if (pct >= 70) return 'text-amber-600 bg-amber-50';
  if (pct >= 40) return 'text-green-600 bg-green-50';
  return 'text-slate-500 bg-slate-50';
}
