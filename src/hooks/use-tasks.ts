'use client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';

export const taskKeys = {
  all: ['tasks'] as const,
  list: (params?: Record<string, string>) => [...taskKeys.all, 'list', params] as const,
  detail: (id: string) => [...taskKeys.all, 'detail', id] as const,
};

export function useTasks(params?: Record<string, string>) {
  return useQuery({
    queryKey: taskKeys.list(params),
    queryFn: () => api.tasks.list(params),
    staleTime: 15_000,
  });
}

export function useTask(id: string) {
  return useQuery({
    queryKey: taskKeys.detail(id),
    queryFn: () => api.tasks.get(id),
    enabled: !!id,
    staleTime: 15_000,
  });
}

export function useCreateTask() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: api.tasks.create,
    onSuccess: () => qc.invalidateQueries({ queryKey: taskKeys.all }),
  });
}

export function useUpdateTask() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => api.tasks.update(id, data),
    onSettled: (_data, _err, { id }) => {
      qc.invalidateQueries({ queryKey: taskKeys.detail(id) });
      qc.invalidateQueries({ queryKey: taskKeys.all });
    },
  });
}

export function useDeleteTask() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: api.tasks.delete,
    onSuccess: () => qc.invalidateQueries({ queryKey: taskKeys.all }),
  });
}
