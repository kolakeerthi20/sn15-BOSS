'use client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';

export const projectKeys = {
  all: ['projects'] as const,
  list: (params?: Record<string, string>) => [...projectKeys.all, 'list', params] as const,
  detail: (id: string) => [...projectKeys.all, 'detail', id] as const,
};

export function useProjects(params?: Record<string, string>) {
  return useQuery({
    queryKey: projectKeys.list(params),
    queryFn: () => api.projects.list(params),
    staleTime: 30_000,
  });
}

export function useProject(id: string) {
  return useQuery({
    queryKey: projectKeys.detail(id),
    queryFn: () => api.projects.get(id),
    enabled: !!id,
    staleTime: 30_000,
  });
}

export function useCreateProject() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: api.projects.create,
    onSuccess: () => qc.invalidateQueries({ queryKey: projectKeys.all }),
  });
}

export function useUpdateProject() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => api.projects.update(id, data),
    onSuccess: (_data, { id }) => {
      qc.invalidateQueries({ queryKey: projectKeys.detail(id) });
      qc.invalidateQueries({ queryKey: projectKeys.all });
    },
  });
}

export function useDeleteProject() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: api.projects.delete,
    onSuccess: () => qc.invalidateQueries({ queryKey: projectKeys.all }),
  });
}
