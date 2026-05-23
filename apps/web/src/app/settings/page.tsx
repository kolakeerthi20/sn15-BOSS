'use client';

import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { User, Palette, Bell, Save, Loader2, Moon, Sun, Monitor } from 'lucide-react';
import { AppLayout } from '@/components/layout/app-layout';
import { usersApi } from '@/lib/api';
import { useAuthStore } from '@/store/auth.store';
import { useTheme } from 'next-themes';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

const TABS = [
  { key: 'profile',        label: 'Profile',       icon: User },
  { key: 'appearance',     label: 'Appearance',    icon: Palette },
  { key: 'notifications',  label: 'Notifications', icon: Bell },
] as const;

type Tab = typeof TABS[number]['key'];

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState<Tab>('profile');

  return (
    <AppLayout>
      <div className="p-6 max-w-4xl mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-foreground">Settings</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Manage your account preferences</p>
        </div>

        <div className="flex gap-6">
          {/* Sidebar nav */}
          <nav className="w-44 flex-shrink-0 space-y-0.5">
            {TABS.map(({ key, label, icon: Icon }) => (
              <button
                key={key}
                onClick={() => setActiveTab(key)}
                className={cn(
                  'w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition text-left',
                  activeTab === key
                    ? 'bg-brand-50 text-brand-700'
                    : 'text-muted-foreground hover:text-foreground hover:bg-accent',
                )}
              >
                <Icon size={15} />
                {label}
              </button>
            ))}
          </nav>

          {/* Content */}
          <div className="flex-1 min-w-0">
            {activeTab === 'profile'       && <ProfileSection />}
            {activeTab === 'appearance'    && <AppearanceSection />}
            {activeTab === 'notifications' && <NotificationsSection />}
          </div>
        </div>
      </div>
    </AppLayout>
  );
}

// ─── Profile Section ──────────────────────────────────────────────────────────

function ProfileSection() {
  const { user, updateUser } = useAuthStore();
  const queryClient = useQueryClient();

  const { data: profileData, isLoading } = useQuery({
    queryKey: ['users', 'me'],
    queryFn: () => usersApi.me(),
  });

  const profile = profileData?.data || {};

  const [form, setForm] = useState({
    first_name: '',
    last_name: '',
    phone: '',
    department: '',
    designation: '',
    timezone: 'UTC',
  });

  useEffect(() => {
    if (profile.first_name) {
      setForm({
        first_name:  profile.first_name  || '',
        last_name:   profile.last_name   || '',
        phone:       profile.phone       || '',
        department:  profile.department  || '',
        designation: profile.designation || '',
        timezone:    profile.timezone    || 'UTC',
      });
    }
  }, [profile.first_name]);

  const { mutate: save, isPending } = useMutation({
    mutationFn: () => usersApi.updateMe(form),
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ['users', 'me'] });
      // Update auth store so sidebar reflects new name
      updateUser(data.data || {});
      toast.success('Profile updated!');
    },
    onError: () => toast.error('Failed to update profile'),
  });

  if (isLoading) {
    return <div className="space-y-4">{[...Array(5)].map((_, i) => <div key={i} className="h-12 animate-pulse bg-muted rounded-lg" />)}</div>;
  }

  return (
    <motion.div initial={{ opacity: 0, x: 8 }} animate={{ opacity: 1, x: 0 }} className="space-y-5">
      {/* Avatar row */}
      <div className="flex items-center gap-4 p-4 bg-card border border-border rounded-xl">
        {profile.avatar_url ? (
          <img src={profile.avatar_url} alt="avatar" className="w-14 h-14 rounded-full object-cover" />
        ) : (
          <div className="w-14 h-14 rounded-full bg-brand-100 text-brand-700 flex items-center justify-center text-xl font-semibold">
            {profile.first_name?.[0]}{profile.last_name?.[0]}
          </div>
        )}
        <div>
          <p className="font-semibold text-foreground">{profile.first_name} {profile.last_name}</p>
          <p className="text-sm text-muted-foreground capitalize">{profile.role?.replace(/_/g, ' ')} · {profile.email}</p>
        </div>
      </div>

      {/* Form fields */}
      <div className="bg-card border border-border rounded-xl p-5 space-y-4">
        <h3 className="font-medium text-foreground">Personal Information</h3>
        <div className="grid grid-cols-2 gap-4">
          {[
            { key: 'first_name', label: 'First Name', placeholder: 'John' },
            { key: 'last_name',  label: 'Last Name',  placeholder: 'Doe' },
          ].map(({ key, label, placeholder }) => (
            <div key={key}>
              <label className="block text-sm font-medium text-foreground mb-1">{label}</label>
              <input
                value={(form as any)[key]}
                onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
                placeholder={placeholder}
                className="w-full px-3 py-2 border border-border rounded-lg text-sm bg-background focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
            </div>
          ))}
        </div>

        <div className="grid grid-cols-2 gap-4">
          {[
            { key: 'department',  label: 'Department',  placeholder: 'Engineering' },
            { key: 'designation', label: 'Designation', placeholder: 'Senior Developer' },
          ].map(({ key, label, placeholder }) => (
            <div key={key}>
              <label className="block text-sm font-medium text-foreground mb-1">{label}</label>
              <input
                value={(form as any)[key]}
                onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
                placeholder={placeholder}
                className="w-full px-3 py-2 border border-border rounded-lg text-sm bg-background focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
            </div>
          ))}
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">Phone</label>
            <input
              value={form.phone}
              onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
              placeholder="+1 (555) 000-0000"
              className="w-full px-3 py-2 border border-border rounded-lg text-sm bg-background focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">Timezone</label>
            <select
              value={form.timezone}
              onChange={e => setForm(f => ({ ...f, timezone: e.target.value }))}
              className="w-full px-3 py-2 border border-border rounded-lg text-sm bg-background focus:outline-none focus:ring-2 focus:ring-brand-500"
            >
              <option value="UTC">UTC</option>
              <option value="America/New_York">Eastern (ET)</option>
              <option value="America/Chicago">Central (CT)</option>
              <option value="America/Denver">Mountain (MT)</option>
              <option value="America/Los_Angeles">Pacific (PT)</option>
              <option value="Europe/London">London (GMT)</option>
              <option value="Europe/Paris">Paris (CET)</option>
              <option value="Asia/Kolkata">India (IST)</option>
              <option value="Asia/Singapore">Singapore (SGT)</option>
              <option value="Asia/Tokyo">Tokyo (JST)</option>
              <option value="Australia/Sydney">Sydney (AEST)</option>
            </select>
          </div>
        </div>

        <button
          onClick={() => save()}
          disabled={isPending}
          className="flex items-center gap-2 px-4 py-2 bg-brand-500 text-white rounded-lg text-sm font-medium hover:bg-brand-600 transition disabled:opacity-60"
        >
          {isPending ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
          Save Changes
        </button>
      </div>
    </motion.div>
  );
}

// ─── Appearance Section ───────────────────────────────────────────────────────

function AppearanceSection() {
  const { theme, setTheme } = useTheme();

  const themes = [
    { key: 'light', label: 'Light',  icon: Sun,     desc: 'Clean and bright interface' },
    { key: 'dark',  label: 'Dark',   icon: Moon,    desc: 'Easy on the eyes in low light' },
    { key: 'system',label: 'System', icon: Monitor, desc: 'Follows your OS preference' },
  ] as const;

  return (
    <motion.div initial={{ opacity: 0, x: 8 }} animate={{ opacity: 1, x: 0 }}>
      <div className="bg-card border border-border rounded-xl p-5">
        <h3 className="font-medium text-foreground mb-4">Theme</h3>
        <div className="grid grid-cols-3 gap-3">
          {themes.map(({ key, label, icon: Icon, desc }) => (
            <button
              key={key}
              onClick={() => setTheme(key)}
              className={cn(
                'flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition text-center',
                theme === key
                  ? 'border-brand-500 bg-brand-50 text-brand-700'
                  : 'border-border hover:border-brand-300 text-muted-foreground',
              )}
            >
              <Icon size={24} />
              <span className="text-sm font-medium">{label}</span>
              <span className="text-xs opacity-70">{desc}</span>
            </button>
          ))}
        </div>
      </div>
    </motion.div>
  );
}

// ─── Notifications Section ────────────────────────────────────────────────────

function NotificationsSection() {
  const { user } = useAuthStore();
  const queryClient = useQueryClient();

  const prefs = (user?.preferences as any)?.notifications || { email: true, inApp: true };
  const [emailNotifs, setEmailNotifs] = useState(prefs.email ?? true);
  const [inAppNotifs, setInAppNotifs] = useState(prefs.inApp ?? true);

  const { mutate: save, isPending } = useMutation({
    mutationFn: () => usersApi.updateMe({
      preferences: { notifications: { email: emailNotifs, inApp: inAppNotifs } },
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users', 'me'] });
      toast.success('Notification preferences saved!');
    },
    onError: () => toast.error('Failed to save preferences'),
  });

  const Toggle = ({ value, onChange, label, desc }: { value: boolean; onChange: (v: boolean) => void; label: string; desc: string }) => (
    <div className="flex items-center justify-between py-3 border-b border-border last:border-0">
      <div>
        <p className="text-sm font-medium text-foreground">{label}</p>
        <p className="text-xs text-muted-foreground mt-0.5">{desc}</p>
      </div>
      <button
        onClick={() => onChange(!value)}
        className={cn(
          'w-11 h-6 rounded-full transition-colors relative',
          value ? 'bg-brand-500' : 'bg-muted',
        )}
      >
        <span className={cn(
          'absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform',
          value ? 'translate-x-5' : 'translate-x-0',
        )} />
      </button>
    </div>
  );

  return (
    <motion.div initial={{ opacity: 0, x: 8 }} animate={{ opacity: 1, x: 0 }}>
      <div className="bg-card border border-border rounded-xl p-5">
        <h3 className="font-medium text-foreground mb-4">Notification Preferences</h3>
        <Toggle
          value={inAppNotifs}
          onChange={setInAppNotifs}
          label="In-app notifications"
          desc="Receive notifications within the BOSS platform"
        />
        <Toggle
          value={emailNotifs}
          onChange={setEmailNotifs}
          label="Email notifications"
          desc="Get email alerts for important updates"
        />
        <div className="mt-4">
          <button
            onClick={() => save()}
            disabled={isPending}
            className="flex items-center gap-2 px-4 py-2 bg-brand-500 text-white rounded-lg text-sm font-medium hover:bg-brand-600 transition disabled:opacity-60"
          >
            {isPending ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
            Save Preferences
          </button>
        </div>
      </div>
    </motion.div>
  );
}
