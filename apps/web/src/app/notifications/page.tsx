'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { Bell, CheckCheck, User, AlertTriangle, Loader2 } from 'lucide-react';
import { AppLayout } from '@/components/layout/app-layout';
import { notificationsApi } from '@/lib/api';
import { formatRelative } from '@/lib/utils';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

const NOTIF_ICONS: Record<string, React.ReactNode> = {
  role_approval_requested: <User size={16} className="text-amber-500" />,
  role_assigned:           <User size={16} className="text-green-500" />,
  task_assigned:           <AlertTriangle size={16} className="text-blue-500" />,
  task_commented:          <Bell size={16} className="text-purple-500" />,
  default:                 <Bell size={16} className="text-gray-400" />,
};

export default function NotificationsPage() {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);

  const { data, isLoading } = useQuery({
    queryKey: ['notifications', page],
    queryFn: () => notificationsApi.list({ page, limit: 20 }),
  });

  const { mutate: markAllRead, isPending: markingAll } = useMutation({
    mutationFn: () => notificationsApi.markAllRead(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      toast.success('All notifications marked as read');
    },
  });

  const { mutate: markRead } = useMutation({
    mutationFn: (id: string) => notificationsApi.markRead(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });

  const notifications = data?.data?.data || data?.data || [];
  const total = data?.data?.total || 0;
  const totalPages = data?.data?.totalPages || 1;
  const unreadCount = notifications.filter((n: any) => !n.is_read).length;

  return (
    <AppLayout>
      <div className="p-6 max-w-3xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Notifications</h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              {total} total · {unreadCount} unread
            </p>
          </div>
          {unreadCount > 0 && (
            <button
              onClick={() => markAllRead()}
              disabled={markingAll}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium border border-border rounded-lg hover:bg-accent transition disabled:opacity-60"
            >
              {markingAll ? <Loader2 size={14} className="animate-spin" /> : <CheckCheck size={14} />}
              Mark all read
            </button>
          )}
        </div>

        {/* Notification list */}
        {isLoading ? (
          <div className="space-y-3">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="h-20 animate-pulse bg-muted rounded-xl" />
            ))}
          </div>
        ) : notifications.length === 0 ? (
          <div className="text-center py-20 text-muted-foreground">
            <Bell size={48} className="mx-auto mb-3 opacity-30" />
            <p className="font-medium text-foreground">No notifications yet</p>
            <p className="text-sm mt-1">You'll be notified about important events here</p>
          </div>
        ) : (
          <AnimatePresence>
            <div className="space-y-2">
              {notifications.map((notif: any, i: number) => (
                <motion.div
                  key={notif.id}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.03 }}
                  onClick={() => !notif.is_read && markRead(notif.id)}
                  className={cn(
                    'flex items-start gap-4 p-4 rounded-xl border transition cursor-pointer',
                    notif.is_read
                      ? 'bg-card border-border text-muted-foreground'
                      : 'bg-brand-50 border-brand-200 hover:bg-brand-100',
                  )}
                >
                  <div className={cn(
                    'w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0',
                    notif.is_read ? 'bg-muted' : 'bg-white shadow-sm',
                  )}>
                    {NOTIF_ICONS[notif.type] || NOTIF_ICONS.default}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <p className={cn(
                        'text-sm',
                        notif.is_read ? 'text-muted-foreground' : 'font-semibold text-foreground',
                      )}>
                        {notif.title}
                      </p>
                      {!notif.is_read && (
                        <span className="w-2 h-2 rounded-full bg-brand-500 flex-shrink-0 mt-1.5" />
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                      {notif.message}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {notif.actor_name && <span className="font-medium">{notif.actor_name} · </span>}
                      {formatRelative(notif.created_at)}
                    </p>
                  </div>
                </motion.div>
              ))}
            </div>
          </AnimatePresence>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-2 mt-6">
            <button
              disabled={page === 1}
              onClick={() => setPage(p => p - 1)}
              className="px-3 py-1.5 text-sm border border-border rounded-lg disabled:opacity-40 hover:bg-accent transition"
            >
              Previous
            </button>
            <span className="text-sm text-muted-foreground">
              Page {page} of {totalPages}
            </span>
            <button
              disabled={page === totalPages}
              onClick={() => setPage(p => p + 1)}
              className="px-3 py-1.5 text-sm border border-border rounded-lg disabled:opacity-40 hover:bg-accent transition"
            >
              Next
            </button>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
