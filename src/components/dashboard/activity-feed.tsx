'use client';
import React from 'react';
import { Clock, AlertTriangle, CheckCircle2, BarChart2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { useTeamFeed } from '@/hooks/use-daily-logs';
import { getInitials, formatRelativeTime, getStatusColor } from '@/lib/utils';

export function ActivityFeed() {
  const { data: logs = [] } = useTeamFeed();

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm flex items-center gap-2">
          <BarChart2 className="h-4 w-4 text-indigo-600" />
          Today&apos;s Activity Feed
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-0 p-0">
        {logs.length === 0 && (
          <p className="px-5 py-6 text-center text-xs text-slate-500 dark:text-slate-400">
            No activity logged yet today.
          </p>
        )}
        {logs.slice(0, 6).map((log: any) => (
          <div
            key={log.id}
            className="flex gap-3 border-b border-slate-100 px-5 py-3.5 last:border-0 hover:bg-slate-50/50 dark:border-slate-800 dark:hover:bg-slate-800/30"
          >
            <Avatar className="h-7 w-7 shrink-0 mt-0.5">
              <AvatarFallback name={log.user?.name ?? ''} className="text-xs">
                {getInitials(log.user?.name ?? '?')}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs font-semibold text-slate-900 dark:text-slate-100">{log.user?.name}</span>
                <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium ${getStatusColor(log.status)}`}>
                  {log.status.replace('_', ' ')}
                </span>
                {log.hoursWorked > 0 && (
                  <span className="flex items-center gap-1 text-[10px] text-slate-400">
                    <Clock className="h-3 w-3" />
                    {log.hoursWorked}h
                  </span>
                )}
              </div>
              <p className="mt-0.5 text-xs text-slate-600 dark:text-slate-400 line-clamp-2">{log.summary}</p>
              {log.blockers && log.blockers !== 'None' && (
                <div className="mt-1 flex items-start gap-1">
                  <AlertTriangle className="h-3 w-3 text-amber-500 mt-0.5 shrink-0" />
                  <p className="text-[10px] text-amber-700 dark:text-amber-400 line-clamp-1">{log.blockers}</p>
                </div>
              )}
              {(log.deliverables ?? []).length > 0 && (
                <div className="mt-1.5 flex flex-wrap gap-1">
                  {log.deliverables.slice(0, 2).map((d: any, di: number) => (
                    <span key={di} className="inline-flex items-center gap-1 rounded-md bg-emerald-50 px-1.5 py-0.5 text-[10px] text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400">
                      <CheckCircle2 className="h-2.5 w-2.5" />
                      {d.description ?? d}
                    </span>
                  ))}
                  {log.deliverables.length > 2 && (
                    <span className="text-[10px] text-slate-400">+{log.deliverables.length - 2} more</span>
                  )}
                </div>
              )}
              <p className="mt-1 text-[10px] text-slate-400">{formatRelativeTime(log.createdAt)}</p>
            </div>
            <div className="shrink-0 text-right">
              <span className="text-xs font-bold text-slate-900 dark:text-slate-100">{log.progressPercent}%</span>
              <div className="mt-1 h-1 w-12 rounded-full bg-slate-100 dark:bg-slate-800">
                <div className="h-full rounded-full bg-indigo-500" style={{ width: `${log.progressPercent}%` }} />
              </div>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
