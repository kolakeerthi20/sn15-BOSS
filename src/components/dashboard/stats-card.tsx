'use client';
import React from 'react';
import { LucideIcon, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';

interface StatsCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: LucideIcon;
  trend?: { value: number; direction: 'up' | 'down' | 'neutral'; label: string };
  iconColor?: string;
  iconBg?: string;
  highlight?: boolean;
}

export function StatsCard({ title, value, subtitle, icon: Icon, trend, iconColor, iconBg, highlight }: StatsCardProps) {
  const TrendIcon = trend?.direction === 'up' ? TrendingUp : trend?.direction === 'down' ? TrendingDown : Minus;
  const trendColor = trend?.direction === 'up' ? 'text-emerald-600 dark:text-emerald-400' : trend?.direction === 'down' ? 'text-red-600 dark:text-red-400' : 'text-slate-500';

  return (
    <Card className={cn('overflow-hidden', highlight && 'ring-2 ring-indigo-500/20')}>
      <CardContent className="p-5">
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium uppercase tracking-wider text-slate-500 dark:text-slate-400">{title}</p>
            <p className="mt-1.5 text-2xl font-bold text-slate-900 dark:text-white">{value}</p>
            {subtitle && <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400 truncate">{subtitle}</p>}
            {trend && (
              <div className={cn('mt-2 flex items-center gap-1 text-xs font-medium', trendColor)}>
                <TrendIcon className="h-3.5 w-3.5" />
                <span>{Math.abs(trend.value)}%</span>
                <span className="text-slate-400 dark:text-slate-500">{trend.label}</span>
              </div>
            )}
          </div>
          <div className={cn('ml-4 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl', iconBg ?? 'bg-indigo-50 dark:bg-indigo-950')}>
            <Icon className={cn('h-5 w-5', iconColor ?? 'text-indigo-600 dark:text-indigo-400')} />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
