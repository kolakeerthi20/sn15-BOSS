'use client';
import React from 'react';
import { ClipboardList, History, CheckCircle2, Clock, AlertTriangle } from 'lucide-react';
import { useSession } from 'next-auth/react';
import { Header } from '@/components/layout/header';
import { DailyLogForm } from '@/components/daily-log/log-form';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { useDailyLogs, useTeamFeed } from '@/hooks/use-daily-logs';
import { getInitials, formatDate, getStatusColor } from '@/lib/utils';
import { cn } from '@/lib/utils';

export default function DailyLogPage() {
  const { data: session } = useSession();
  const today = new Date().toISOString().split('T')[0];
  const { data: teamFeed = [] } = useTeamFeed(today);
  const { data: myLogs = [] } = useDailyLogs({ userId: session?.user?.id ?? '' });

  const hasLoggedToday = myLogs.some((l: any) => l.date === today);

  return (
    <div className="flex flex-col min-h-screen">
      <Header title="Daily Work Log" />

      <div className="flex-1 p-6">
        <div className="grid gap-6 lg:grid-cols-5">
          {/* Form */}
          <div className="lg:col-span-3">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-sm">
                  <ClipboardList className="h-4 w-4 text-indigo-600" />
                  {hasLoggedToday ? "Update Today's Log" : 'Submit Daily Log'}
                </CardTitle>
                {hasLoggedToday && (
                  <p className="text-xs text-emerald-600 dark:text-emerald-400 flex items-center gap-1 mt-1">
                    <CheckCircle2 className="h-3 w-3" />
                    You already submitted a log today. You can submit additional logs.
                  </p>
                )}
              </CardHeader>
              <CardContent>
                <DailyLogForm />
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="lg:col-span-2 space-y-4">
            {/* Today's team activity */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Clock className="h-4 w-4 text-indigo-600" />
                  Team Activity Today ({teamFeed.length})
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                {teamFeed.length === 0 ? (
                  <p className="px-5 py-4 text-xs text-slate-500 dark:text-slate-400">No logs submitted yet today.</p>
                ) : (
                  teamFeed.map((log: any) => (
                    <div key={log.id} className="border-b border-slate-100 px-5 py-3 last:border-0 dark:border-slate-800">
                      <div className="flex items-center gap-2 mb-1">
                        <Avatar className="h-6 w-6">
                          <AvatarFallback name={log.user?.name ?? ''} className="text-[9px]">
                            {getInitials(log.user?.name ?? '?')}
                          </AvatarFallback>
                        </Avatar>
                        <span className="text-xs font-medium text-slate-900 dark:text-slate-100">{log.user?.name}</span>
                        <span className={cn('ml-auto rounded-full px-2 py-0.5 text-[10px] font-medium', getStatusColor(log.status))}>
                          {log.status.replace('_', ' ')}
                        </span>
                      </div>
                      <p className="text-[10px] text-slate-500 dark:text-slate-400 line-clamp-2 ml-8">{log.summary}</p>
                      <div className="mt-1 ml-8 flex items-center gap-3 text-[10px] text-slate-400">
                        <span>{log.hoursWorked}h logged</span>
                        <span>{log.progressPercent}% progress</span>
                        {log.blockers && log.blockers !== 'None' && (
                          <span className="text-amber-600 dark:text-amber-400 flex items-center gap-0.5">
                            <AlertTriangle className="h-2.5 w-2.5" />
                            Blocker
                          </span>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>

            {/* My history */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  <History className="h-4 w-4 text-indigo-600" />
                  My Log History
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                {myLogs.slice(0, 7).map((log: any) => (
                  <div key={log.id} className="border-b border-slate-100 px-5 py-3 last:border-0 dark:border-slate-800">
                    <div className="flex items-center justify-between mb-0.5">
                      <span className="text-xs font-medium text-slate-900 dark:text-slate-100">{formatDate(log.date)}</span>
                      <span className={cn('rounded-full px-2 py-0.5 text-[10px] font-medium', getStatusColor(log.status))}>
                        {log.status.replace('_', ' ')}
                      </span>
                    </div>
                    <p className="text-[10px] text-slate-500 dark:text-slate-400 line-clamp-1">{log.summary}</p>
                    <p className="mt-0.5 text-[10px] text-slate-400">
                      {log.hoursWorked}h · {(log.deliverables ?? []).length} deliverables
                    </p>
                  </div>
                ))}
                {myLogs.length === 0 && (
                  <p className="px-5 py-4 text-xs text-slate-500 dark:text-slate-400">No logs yet. Submit your first daily log above.</p>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
