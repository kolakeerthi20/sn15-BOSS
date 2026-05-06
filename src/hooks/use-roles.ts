'use client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';

export const roleKeys = {
  all: ['roles'] as const,
};

export function useRoles() {
  return useQuery({
    queryKey: roleKeys.all,
    queryFn: api.roles.list,
    staleTime: 30_000,
  });
}

export function useUpsertRole() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: api.roles.upsert,
    onSuccess: () => qc.invalidateQueries({ queryKey: roleKeys.all }),
  });
}

export function useDeleteRole() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: api.roles.delete,
    onSuccess: () => qc.invalidateQueries({ queryKey: roleKeys.all }),
  });
}
