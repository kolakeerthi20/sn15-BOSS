'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import {
  Users, Clock, CheckCircle, ChevronDown, Loader2,
  ShieldCheck, Star, Code2, UserCheck, AlertTriangle,
} from 'lucide-react';
import { useAuthStore } from '@/store/auth.store';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

interface OrgUser {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  role: string;
  auth_provider: string;
  avatar_url?: string;
  google_picture?: string;
  department?: string;
  designation?: string;
  status: string;
  last_login_at?: string;
  assigned_by_name?: string;
  role_assigned_at?: string;
  created_at: string;
}

// ─── Role metadata ────────────────────────────────────────────────────────────

const ROLE_META: Record<string, { label: string; color: string; bg: string; icon: React.ReactNode }> = {
  project_manager: { label: 'Project Manager', color: 'text-purple-700', bg: 'bg-purple-100', icon: <ShieldCheck size={13} /> },
  lead:            { label: 'Lead',             color: 'text-blue-700',   bg: 'bg-blue-100',   icon: <Star size={13} /> },
  senior_developer:{ label: 'Senior Developer', color: 'text-green-700',  bg: 'bg-green-100',  icon: <Code2 size={13} /> },
  intern:          { label: 'Intern',           color: 'text-orange-700', bg: 'bg-orange-100', icon: <UserCheck size={13} /> },
  pending:         { label: 'Pending',          color: 'text-gray-500',   bg: 'bg-gray-100',   icon: <Clock size={13} /> },
};

function RoleBadge({ role }: { role: string }) {
  const m = ROLE_META[role] ?? ROLE_META.pending;
  return (
    <span className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full ${m.color} ${m.bg}`}>
      {m.icon} {m.label}
    </span>
  );
}

function Avatar({ user }: { user: OrgUser }) {
  const src = user.avatar_url || user.google_picture;
  const initials = `${user.first_name?.[0] ?? ''}${user.last_name?.[0] ?? ''}`.toUpperCase() || user.email[0].toUpperCase();
  const colours = ['bg-brand-100 text-brand-700', 'bg-purple-100 text-purple-700', 'bg-green-100 text-green-700', 'bg-orange-100 text-orange-700'];
  const idx = user.email.charCodeAt(0) % colours.length;
  if (src) return <img src={src} alt={initials} className="w-9 h-9 rounded-full object-cover flex-shrink-0" />;
  return <div className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-semibold flex-shrink-0 ${colours[idx]}`}>{initials}</div>;
}

function AssignRoleDropdown({ user, callerRole, onAssign, loading }: {
  user: OrgUser; callerRole: string; onAssign: (id: string, role: string) => void; loading: boolean;
}) {
  const [open, setOpen] = useState(false);
  const assignable = callerRole === 'project_manager'
    ? ['project_manager', 'lead', 'senior_developer', 'intern']
    : ['senior_developer', 'intern'];

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(v => !v)}
        disabled={loading}
        className="flex items-center gap-1.5 text-xs font-medium border border-gray-300 rounded-lg px-3 py-1.5 hover:bg-gray-50 transition disabled:opacity-50"
      >
        {loading ? <Loader2 size={12} className="animate-spin" /> : null}
        Assign role <ChevronDown size={12} className={`transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      <AnimatePresence>
        {open && (
          <motion.ul
            initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.15 }}
            className="absolute right-0 mt-1 bg-white border border-gray-200 rounded-xl shadow-lg z-20 py-1 min-w-[170px]"
          >
            {assignable.map(role => {
              const m = ROLE_META[role];
              return (
                <li key={role}>
                  <button
                    className={`w-full flex items-center gap-2 px-3 py-2 text-xs hover:bg-gray-50 transition ${user.role === role ? 'font-semibold' : ''}`}
                    onClick={() => { onAssign(user.id, role); setOpen(false); }}
                  >
                    <span className={m.color}>{m.icon}</span>
                    <span>{m.label}</span>
                    {user.role === role && <CheckCircle size={11} className="ml-auto text-green-500" />}
                  </button>
                </li>
              );
            })}
          </motion.ul>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── helpers ─────────────────────────────────────────────────────────────────

async function apiFetch(path: string, opts: RequestInit = {}) {
  const token = localStorage.getItem('accessToken');
  const res = await fetch(`${API}/api/v1${path}`, {
    ...opts,
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}`, ...opts.headers },
  });
  if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
  const body = await res.json();
  return body.data ?? body;
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function TeamPage() {
  const { user: me } = useAuthStore();
  const [tab, setTab] = useState<'pending' | 'all'>('pending');
  const [pendingUsers, setPendingUsers] = useState<OrgUser[]>([]);
  const [allUsers, setAllUsers]         = useState<OrgUser[]>([]);
  const [loadingPending, setLoadingPending] = useState(true);
  const [loadingAll, setLoadingAll]         = useState(false);
  const [assigningId, setAssigningId]       = useState<string | null>(null);

  const canManageRoles = !!(me?.role && ['project_manager', 'lead'].includes(me.role));

  // ── Fetch pending users ────────────────────────────────────────────────────
  const fetchPending = useCallback(async () => {
    setLoadingPending(true);
    try {
      const data = await apiFetch('/auth/pending-users');
      setPendingUsers(Array.isArray(data) ? data : []);
    } catch (e: any) {
      toast.error('Could not load pending users: ' + e.message);
    } finally {
      setLoadingPending(false);
    }
  }, []);

  // ── Fetch all users ───────────────────────────────────────────────────────
  const fetchAll = useCallback(async () => {
    setLoadingAll(true);
    try {
      const data = await apiFetch('/auth/users-with-roles');
      setAllUsers(Array.isArray(data) ? data : []);
    } catch (e: any) {
      toast.error('Could not load members: ' + e.message);
    } finally {
      setLoadingAll(false);
    }
  }, []);

  // Run fetches once the store is hydrated and the user is a manager
  useEffect(() => {
    if (!canManageRoles) return;
    fetchPending();
  }, [canManageRoles, fetchPending]);

  useEffect(() => {
    if (!canManageRoles || tab !== 'all') return;
    fetchAll();
  }, [canManageRoles, tab, fetchAll]);

  // ── Assign role ───────────────────────────────────────────────────────────
  const handleAssign = async (userId: string, role: string) => {
    setAssigningId(userId);
    try {
      await apiFetch('/auth/assign-role', {
        method: 'PATCH',
        body: JSON.stringify({ targetUserId: userId, newRole: role }),
      });
      toast.success(`Role updated to "${ROLE_META[role]?.label ?? role}"`);
      fetchPending();
      if (tab === 'all') fetchAll();
    } catch (e: any) {
      toast.error('Failed to assign role: ' + e.message);
    } finally {
      setAssigningId(null);
    }
  };

  // ── Guard ──────────────────────────────────────────────────────────────────
  if (me && !canManageRoles) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-gray-400 gap-3">
        <AlertTriangle size={40} className="text-amber-400" />
        <p className="font-medium text-gray-600">Access restricted</p>
        <p className="text-sm">Only Leads and Project Managers can manage team roles.</p>
      </div>
    );
  }

  const usersToShow = tab === 'pending' ? pendingUsers : allUsers;
  const loading     = tab === 'pending' ? loadingPending : loadingAll;

  return (
    <div className="max-w-5xl mx-auto py-8 px-4">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Team & Roles</h1>
          <p className="text-gray-500 text-sm mt-1">Manage role assignments for your organization</p>
        </div>
        <div className="flex items-center gap-2 text-sm text-gray-500">
          <Users size={15} />
          <span><span className="font-semibold text-gray-800">{pendingUsers.length}</span> pending</span>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 rounded-xl p-1 w-fit mb-6">
        {([
          { key: 'pending', label: 'Pending Approval', icon: <Clock size={14} />, count: pendingUsers.length },
          { key: 'all',     label: 'All Members',      icon: <Users size={14} />, count: null },
        ] as const).map(({ key, label, icon, count }) => (
          <button key={key} onClick={() => setTab(key)}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition ${tab === key ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
          >
            {icon}{label}
            {count !== null && count > 0 && (
              <span className="ml-1 bg-red-500 text-white rounded-full text-xs w-5 h-5 flex items-center justify-center">{count}</span>
            )}
          </button>
        ))}
      </div>

      {/* List */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="animate-spin text-brand-500" size={28} />
        </div>
      ) : usersToShow.length === 0 ? (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center py-20 text-gray-400">
          <CheckCircle size={40} className="mx-auto mb-3 text-green-400" />
          <p className="font-medium text-gray-600">
            {tab === 'pending' ? 'No pending users — everyone has a role!' : 'No members found.'}
          </p>
        </motion.div>
      ) : (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-2">
          {usersToShow.map(u => (
            <motion.div key={u.id} layout initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
              className="flex items-center gap-4 bg-white border border-gray-100 rounded-xl px-4 py-3 hover:border-gray-200 transition shadow-sm"
            >
              <Avatar user={u} />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-medium text-gray-900 text-sm">{u.first_name} {u.last_name}</span>
                  <RoleBadge role={u.role} />
                  {u.auth_provider === 'google' && (
                    <span className="text-xs text-gray-400 bg-gray-50 border border-gray-200 px-1.5 py-0.5 rounded-md">Google</span>
                  )}
                </div>
                <p className="text-xs text-gray-400 truncate">{u.email}</p>
                {u.assigned_by_name && u.role !== 'pending' && (
                  <p className="text-xs text-gray-400 mt-0.5">Assigned by <span className="font-medium text-gray-600">{u.assigned_by_name}</span></p>
                )}
              </div>
              <div className="flex-shrink-0">
                <AssignRoleDropdown user={u} callerRole={me!.role} onAssign={handleAssign} loading={assigningId === u.id} />
              </div>
            </motion.div>
          ))}
        </motion.div>
      )}
    </div>
  );
}
