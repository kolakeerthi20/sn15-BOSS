'use client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';

export const notifKeys = {
  all: ['notifications'] as const,
};

export function useNotifications() {
  return useQuery({
    queryKey: notifKeys.all,
    queryFn: api.notifications.list,
    staleTime: 30_000,
    refetchInterval: 60_000,
  });
}

export function useMarkNotificationRead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: api.notifications.markRead,
    onSuccess: () => qc.invalidateQueries({ queryKey: notifKeys.all }),
  });
}

export function useMarkAllNotificationsRead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: api.notifications.markAllRead,
    onSuccess: () => qc.invalidateQueries({ queryKey: notifKeys.all }),
  });
}
