'use client';
import React from 'react';
import Link from 'next/link';
import { AlertTriangle, Calendar, Users, DollarSign, MoreHorizontal, ArrowRight } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Project } from '@/types';
import { getStatusColor, getStatusDot, getHealthColor, formatDate, formatCurrency, calcBudgetBurnPercent, daysUntil, getInitials } from '@/lib/utils';
import { cn } from '@/lib/utils';

interface ProjectCardProps {
  project: Project;
  onEdit?: (project: Project) => void;
  onDelete?: (id: string) => void;
}

export function ProjectCard({ project, onEdit, onDelete }: ProjectCardProps) {
  const daysLeft = daysUntil(project.endDate);
  const budgetBurn = project.budget != null && project.spentBudget != null
    ? calcBudgetBurnPercent(project.spentBudget, project.budget)
    : 0;
  const isOverBudget = budgetBurn > 90;
  const isLate = daysLeft < 0;

  return (
    <Card className="group relative overflow-hidden transition-all duration-200 hover:shadow-md hover:-translate-y-0.5">
      {/* Health indicator strip */}
      <div
        className={cn(
          'absolute left-0 top-0 h-full w-1',
          project.healthScore >= 80 ? 'bg-emerald-500' :
          project.healthScore >= 60 ? 'bg-amber-500' :
          project.healthScore >= 40 ? 'bg-orange-500' : 'bg-red-500'
        )}
      />

      <CardContent className="pl-5 pt-5 pb-5 pr-5">
        {/* Header */}
        <div className="flex items-start justify-between gap-3 mb-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className={cn('inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium', getStatusColor(project.status))}>
                <span className={cn('h-1.5 w-1.5 rounded-full', getStatusDot(project.status))} />
                {project.status.replace('_', ' ')}
              </span>
              {project.riskLevel !== 'LOW' && (
                <span className={cn(
                  'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium',
                  project.riskLevel === 'CRITICAL' ? 'bg-red-100 text-red-700' :
                  project.riskLevel === 'HIGH' ? 'bg-orange-100 text-orange-700' : 'bg-amber-100 text-amber-700'
                )}>
                  <AlertTriangle className="h-2.5 w-2.5" />
                  {project.riskLevel} RISK
                </span>
              )}
            </div>
            <Link href={`/projects/${project.id}`}>
              <h3 className="font-semibold text-slate-900 dark:text-slate-100 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors line-clamp-1">
                {project.name}
              </h3>
            </Link>
            <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">{project.client}</p>
          </div>
          <div className="shrink-0 flex items-center gap-1">
            <div className={cn('text-sm font-bold', getHealthColor(project.healthScore))}>
              {project.healthScore}
            </div>
            <span className="text-[10px] text-slate-400">health</span>
          </div>
        </div>

        {/* Progress */}
        <div className="mb-4">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-xs text-slate-500 dark:text-slate-400">Progress</span>
            <span className="text-xs font-semibold text-slate-900 dark:text-slate-100">{project.completionPercent}%</span>
          </div>
          <Progress
            value={project.completionPercent}
            indicatorClassName={
              project.completionPercent >= 80 ? 'bg-emerald-500' :
              project.completionPercent >= 50 ? 'bg-indigo-500' : 'bg-amber-500'
            }
          />
        </div>

        {/* Meta row */}
        <div className="grid grid-cols-2 gap-3 mb-4 text-xs">
          <div className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400">
            <Calendar className="h-3.5 w-3.5" />
            <span className={cn(isLate ? 'text-red-600 font-medium dark:text-red-400' : '')}>
              {isLate ? `${Math.abs(daysLeft)}d overdue` : `${daysLeft}d left`}
            </span>
          </div>
          <div className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400">
            <DollarSign className="h-3.5 w-3.5" />
            <span className={cn(isOverBudget ? 'text-red-600 font-medium dark:text-red-400' : '')}>
              {budgetBurn}% spent
            </span>
          </div>
        </div>

        {/* Budget bar */}
        <div className="mb-4">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[10px] text-slate-400">Budget: {formatCurrency(project.spentBudget)} / {formatCurrency(project.budget)}</span>
          </div>
          <Progress
            value={budgetBurn}
            indicatorClassName={budgetBurn > 90 ? 'bg-red-500' : budgetBurn > 75 ? 'bg-amber-500' : 'bg-emerald-500'}
            className="h-1"
          />
        </div>

        {/* Team */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1">
            <Users className="h-3.5 w-3.5 text-slate-400" />
            <div className="flex -space-x-1.5">
              {project.members.slice(0, 4).map(m => (
                <Avatar key={m.userId} className="h-6 w-6 border-2 border-white dark:border-slate-900">
                  <AvatarFallback name={m.user.name} className="text-[9px]">
                    {getInitials(m.user.name)}
                  </AvatarFallback>
                </Avatar>
              ))}
              {project.members.length > 4 && (
                <div className="flex h-6 w-6 items-center justify-center rounded-full border-2 border-white bg-slate-100 text-[9px] font-medium text-slate-600 dark:border-slate-900 dark:bg-slate-800 dark:text-slate-400">
                  +{project.members.length - 4}
                </div>
              )}
            </div>
          </div>
          <Link href={`/projects/${project.id}`}>
            <Button variant="ghost" size="icon-sm" className="opacity-0 group-hover:opacity-100 transition-opacity">
              <ArrowRight className="h-3.5 w-3.5" />
            </Button>
          </Link>
        </div>

        {/* Milestones */}
        {project.milestones.length > 0 && (
          <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800">
            <div className="flex flex-wrap gap-1">
              {project.milestones.map(m => (
                <span
                  key={m.id}
                  className={cn(
                    'inline-flex items-center rounded-md px-1.5 py-0.5 text-[10px] font-medium',
                    m.status === 'COMPLETED' ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400' :
                    m.status === 'MISSED' ? 'bg-red-50 text-red-700 dark:bg-red-950/30 dark:text-red-400' :
                    'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
                  )}
                >
                  {m.status === 'COMPLETED' ? '✓' : '○'} {m.title}
                </span>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
