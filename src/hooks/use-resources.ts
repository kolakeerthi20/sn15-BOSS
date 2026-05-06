'use client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';

export const resourceKeys = {
  all: ['resources'] as const,
  list: (params?: Record<string, string>) => [...resourceKeys.all, 'list', params] as const,
  detail: (id: string) => [...resourceKeys.all, 'detail', id] as const,
};

export function useResources(params?: Record<string, string>) {
  return useQuery({
    queryKey: resourceKeys.list(params),
    queryFn: () => api.resources.list(),
    staleTime: 60_000,
  });
}

export function useResource(id: string) {
  return useQuery({
    queryKey: resourceKeys.detail(id),
    queryFn: () => api.resources.get(id),
    enabled: !!id,
  });
}

export function useUpdateResource() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) =>
      fetch(`/api/resources/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) }).then(r => r.json()),
    onSuccess: () => qc.invalidateQueries({ queryKey: resourceKeys.all }),
  });
}
