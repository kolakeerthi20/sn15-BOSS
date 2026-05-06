'use client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';

export const logKeys = {
  all: ['daily-logs'] as const,
  list: (params?: Record<string, string>) => [...logKeys.all, 'list', params] as const,
};

export function useDailyLogs(params?: Record<string, string>) {
  return useQuery({
    queryKey: logKeys.list(params),
    queryFn: () => api.dailyLogs.list(params),
    staleTime: 15_000,
  });
}

export function useTeamFeed(date?: string) {
  return useQuery({
    queryKey: logKeys.list({ teamFeed: 'true', ...(date && { date }) }),
    queryFn: () => api.dailyLogs.list({ teamFeed: 'true', ...(date && { date }) }),
    staleTime: 30_000,
    refetchInterval: 60_000, // auto-refresh feed every minute
  });
}

export function useSubmitDailyLog() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: api.dailyLogs.create,
    onSuccess: () => qc.invalidateQueries({ queryKey: logKeys.all }),
  });
}
