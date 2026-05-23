'use client';

import Link from 'next/link';
import { Users, CheckSquare, Clock, AlertTriangle, Calendar } from 'lucide-react';
import {
  cn, statusConfig, priorityConfig, healthConfig,
  formatDate, formatPercent, truncate,
} from '@/lib/utils';

interface ProjectCardProps {
  project: any;
  view?: 'grid' | 'list';
}

export function ProjectCard({ project, view = 'grid' }: ProjectCardProps) {
  const status = statusConfig[project.status] || statusConfig.active;
  const health = healthConfig[project.health] || healthConfig.unknown;
  const completionPct = Math.round(project.completion_pct || 0);

  if (view === 'list') {
    return (
      <Link href={`/projects/${project.id}`}>
        <div className="flex items-center gap-4 p-4 bg-card border border-border rounded-xl hover:shadow-sm transition-all group">
          <div
            className="w-1 h-10 rounded-full flex-shrink-0"
            style={{ background: project.color || '#6366f1' }}
          />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="font-medium text-foreground group-hover:text-brand-600 transition">{project.name}</span>
              {project.code && (
                <span className="text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded">{project.code}</span>
              )}
            </div>
            {project.client_name && (
              <span className="text-xs text-muted-foreground">{project.client_name}</span>
            )}
          </div>
          <div className="hidden sm:flex items-center gap-4">
            <span className={cn('status-badge text-xs', status.bg, status.color)}>
              <span className={cn('w-1.5 h-1.5 rounded-full', status.dot)} />
              {status.label}
            </span>
            <div className="w-24">
              <div className="flex justify-between text-xs mb-1">
                <span className="text-muted-foreground">Progress</span>
                <span className="font-medium">{completionPct}%</span>
              </div>
              <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all"
                  style={{ width: `${completionPct}%`, background: project.color || '#6366f1' }}
                />
              </div>
            </div>
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <Users size={13} />
              {project.team_size}
            </div>
            <div className="text-xs text-muted-foreground">{formatDate(project.end_date)}</div>
          </div>
        </div>
      </Link>
    );
  }

  return (
    <Link href={`/projects/${project.id}`}>
      <div className="bg-card border border-border rounded-xl p-5 card-hover group cursor-pointer">
        {/* Color bar + Title */}
        <div className="flex items-start gap-3 mb-3">
          <div
            className="w-9 h-9 rounded-xl flex-shrink-0 flex items-center justify-center text-white text-sm font-bold"
            style={{ background: project.color || '#6366f1' }}
          >
            {project.name.slice(0, 1).toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-foreground group-hover:text-brand-600 transition leading-tight">
              {truncate(project.name, 35)}
            </h3>
            <div className="flex items-center gap-2 mt-0.5">
              {project.code && (
                <span className="text-xs text-muted-foreground">{project.code}</span>
              )}
              {project.client_name && (
                <span className="text-xs text-muted-foreground">• {project.client_name}</span>
              )}
            </div>
          </div>
        </div>

        {/* Badges */}
        <div className="flex items-center gap-2 mb-4 flex-wrap">
          <span className={cn('status-badge', status.bg, status.color)}>
            <span className={cn('w-1.5 h-1.5 rounded-full', status.dot)} />
            {status.label}
          </span>
          <span className={cn('status-badge', health.bg, health.color)}>
            {health.label}
          </span>
        </div>

        {/* Progress */}
        <div className="mb-4">
          <div className="flex justify-between text-xs mb-1.5">
            <span className="text-muted-foreground">Progress</span>
            <span className="font-medium text-foreground">{completionPct}%</span>
          </div>
          <div className="h-2 bg-muted rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{ width: `${completionPct}%`, background: project.color || '#6366f1' }}
            />
          </div>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-3 gap-2 mb-4">
          <div className="text-center">
            <div className="text-sm font-semibold text-foreground">{project.total_tasks || 0}</div>
            <div className="text-xs text-muted-foreground">Tasks</div>
          </div>
          <div className="text-center border-x border-border">
            <div className="text-sm font-semibold text-foreground">{project.team_size || 0}</div>
            <div className="text-xs text-muted-foreground">Members</div>
          </div>
          <div className="text-center">
            <div className={cn(
              'text-sm font-semibold',
              project.overdue_tasks > 0 ? 'text-red-600' : 'text-foreground',
            )}>
              {project.overdue_tasks || 0}
            </div>
            <div className="text-xs text-muted-foreground">Overdue</div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between text-xs text-muted-foreground border-t border-border pt-3">
          <div className="flex items-center gap-1">
            <Calendar size={12} />
            {project.end_date ? formatDate(project.end_date) : 'No deadline'}
          </div>
          <div className="flex items-center gap-1">
            <span className="font-medium text-foreground">PM:</span>
            {project.owner_name?.split(' ')[0]}
          </div>
        </div>
      </div>
    </Link>
  );
}
