'use client';
import React, { useState } from 'react';
import { UserCog, Plus, Trash2, Mail, Shield, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { Header } from '@/components/layout/header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { useRoles, useUpsertRole, useDeleteRole } from '@/hooks/use-roles';
import { useResources } from '@/hooks/use-resources';
import { useUpdateResource } from '@/hooks/use-resources';
import { getInitials } from '@/lib/utils';
import { cn } from '@/lib/utils';

const ROLES = ['ADMIN', 'PROJECT_MANAGER', 'TEAM_LEAD', 'EMPLOYEE', 'CLIENT_VIEWER'] as const;
type Role = typeof ROLES[number];

const ROLE_COLORS: Record<string, string> = {
  ADMIN: 'bg-red-100 text-red-700 dark:bg-red-950/30 dark:text-red-400',
  PROJECT_MANAGER: 'bg-violet-100 text-violet-700 dark:bg-violet-950/30 dark:text-violet-400',
  TEAM_LEAD: 'bg-blue-100 text-blue-700 dark:bg-blue-950/30 dark:text-blue-400',
  EMPLOYEE: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400',
  CLIENT_VIEWER: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-400',
};

export default function RolesPage() {
  const { data: session } = useSession();
  const router = useRouter();
  const { data: mappings = [], isLoading: mappingsLoading } = useRoles();
  const { data: users = [], isLoading: usersLoading } = useResources();
  const upsertRole = useUpsertRole();
  const deleteRole = useDeleteRole();
  const updateUser = useUpdateResource();

  const [email, setEmail] = useState('');
  const [role, setRole] = useState<Role>('EMPLOYEE');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Redirect non-admins
  if (session?.user && (session.user as any).role !== 'ADMIN') {
    router.replace('/dashboard');
    return null;
  }

  const handleAddMapping = async () => {
    setError('');
    setSuccess('');
    if (!email.trim() || !email.includes('@')) {
      setError('Enter a valid email address.');
      return;
    }
    try {
      await upsertRole.mutateAsync({ email: email.trim().toLowerCase(), role, notes: notes.trim() || undefined });
      setSuccess(`Role mapping saved for ${email.trim()}.`);
      setEmail('');
      setNotes('');
    } catch (e: any) {
      setError(e.message ?? 'Failed to save mapping.');
    }
  };

  const handleDeleteMapping = async (mappingEmail: string) => {
    try {
      await deleteRole.mutateAsync(mappingEmail);
    } catch (e: any) {
      setError(e.message ?? 'Failed to delete mapping.');
    }
  };

  const handleChangeUserRole = async (userId: string, newRole: string) => {
    try {
      await updateUser.mutateAsync({ id: userId, data: { role: newRole } });
    } catch (e: any) {
      setError(e.message ?? 'Failed to update role.');
    }
  };

  return (
    <div className="flex flex-col min-h-screen">
      <Header title="Roles & Access" />

      <div className="flex-1 p-6 space-y-6 max-w-4xl">
        {/* Pre-assign role by email */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm flex items-center gap-2">
              <Mail className="h-4 w-4 text-indigo-600" />
              Pre-assign Role by Email
            </CardTitle>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Assign roles to email addresses before users sign in. When they first log in with Google, they'll receive their pre-assigned role.
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            {error && (
              <div className="flex items-center gap-2 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700 dark:bg-red-950/30 dark:text-red-400">
                <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                {error}
              </div>
            )}
            {success && (
              <div className="flex items-center gap-2 rounded-lg bg-emerald-50 px-3 py-2 text-xs text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400">
                <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
                {success}
              </div>
            )}
            <div className="flex gap-3 flex-wrap">
              <div className="flex-1 min-w-[200px]">
                <Input
                  label="Email Address"
                  type="email"
                  placeholder="colleague@company.com"
                  value={email}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEmail(e.target.value)}
                  onKeyDown={(e: React.KeyboardEvent) => e.key === 'Enter' && handleAddMapping()}
                />
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-medium text-slate-700 dark:text-slate-300">Role</label>
                <select
                  value={role}
                  onChange={e => setRole(e.target.value as Role)}
                  className="h-9 rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-700 focus:border-indigo-500 focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
                >
                  {ROLES.map(r => <option key={r} value={r}>{r.replace('_', ' ')}</option>)}
                </select>
              </div>
              <div className="flex-1 min-w-[150px]">
                <Input
                  label="Notes (optional)"
                  placeholder="e.g. New hire, starts Monday"
                  value={notes}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNotes(e.target.value)}
                />
              </div>
              <div className="flex items-end">
                <Button onClick={handleAddMapping} disabled={upsertRole.isPending} className="gap-1.5">
                  {upsertRole.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}
                  Add Mapping
                </Button>
              </div>
            </div>

            {/* Existing mappings */}
            {mappingsLoading ? (
              <div className="flex items-center gap-2 py-4 text-xs text-slate-500">
                <Loader2 className="h-4 w-4 animate-spin" /> Loading...
              </div>
            ) : mappings.length > 0 ? (
              <div className="overflow-hidden rounded-lg border border-slate-200 dark:border-slate-800">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-slate-100 dark:border-slate-800">
                      {['Email', 'Role', 'Notes', 'Created', ''].map(h => (
                        <th key={h} className="px-4 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {mappings.map((m: any) => (
                      <tr key={m.email} className="border-b border-slate-50 last:border-0 hover:bg-slate-50/50 dark:border-slate-800/50 dark:hover:bg-slate-800/30">
                        <td className="px-4 py-3 text-xs text-slate-900 dark:text-slate-100">{m.email}</td>
                        <td className="px-4 py-3">
                          <span className={cn('rounded-full px-2 py-0.5 text-[10px] font-medium', ROLE_COLORS[m.role] ?? 'bg-slate-100 text-slate-600')}>
                            {m.role.replace('_', ' ')}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-xs text-slate-500 dark:text-slate-400">{m.notes ?? '—'}</td>
                        <td className="px-4 py-3 text-xs text-slate-400">
                          {new Date(m.createdAt).toLocaleDateString()}
                        </td>
                        <td className="px-4 py-3">
                          <button
                            onClick={() => handleDeleteMapping(m.email)}
                            className="text-slate-400 hover:text-red-500 transition-colors"
                            title="Remove mapping"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-xs text-slate-500 dark:text-slate-400">No role mappings yet. Add emails above to pre-assign roles.</p>
            )}
          </CardContent>
        </Card>

        {/* Manage existing users */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm flex items-center gap-2">
              <UserCog className="h-4 w-4 text-indigo-600" />
              Manage Active Users
            </CardTitle>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Change roles for users who have already signed in. Changes take effect on their next session.
            </p>
          </CardHeader>
          <CardContent>
            {usersLoading ? (
              <div className="flex items-center gap-2 py-4 text-xs text-slate-500">
                <Loader2 className="h-4 w-4 animate-spin" /> Loading users...
              </div>
            ) : (
              <div className="overflow-hidden rounded-lg border border-slate-200 dark:border-slate-800">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-slate-100 dark:border-slate-800">
                      {['User', 'Email', 'Current Role', 'Change Role'].map(h => (
                        <th key={h} className="px-4 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {users.map((u: any) => (
                      <tr key={u.id} className="border-b border-slate-50 last:border-0 hover:bg-slate-50/50 dark:border-slate-800/50 dark:hover:bg-slate-800/30">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <Avatar className="h-7 w-7">
                              <AvatarFallback name={u.name} className="text-xs">{getInitials(u.name)}</AvatarFallback>
                            </Avatar>
                            <div>
                              <p className="text-xs font-medium text-slate-900 dark:text-slate-100">{u.name}</p>
                              <p className="text-[10px] text-slate-500">{u.designation ?? '—'}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-xs text-slate-500 dark:text-slate-400">{u.email}</td>
                        <td className="px-4 py-3">
                          <span className={cn('rounded-full px-2 py-0.5 text-[10px] font-medium', ROLE_COLORS[u.role] ?? 'bg-slate-100 text-slate-600')}>
                            {u.role?.replace('_', ' ')}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          {u.id === session?.user?.id ? (
                            <span className="text-xs text-slate-400 italic">You</span>
                          ) : (
                            <select
                              defaultValue={u.role}
                              onChange={e => handleChangeUserRole(u.id, e.target.value)}
                              className="h-7 rounded-lg border border-slate-200 bg-white px-2 text-xs text-slate-700 focus:border-indigo-500 focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
                            >
                              {ROLES.map(r => <option key={r} value={r}>{r.replace('_', ' ')}</option>)}
                            </select>
                          )}
                        </td>
                      </tr>
                    ))}
                    {users.length === 0 && (
                      <tr>
                        <td colSpan={4} className="px-4 py-8 text-center text-xs text-slate-500">
                          No users have signed in yet.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
