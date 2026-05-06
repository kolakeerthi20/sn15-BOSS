'use client';
import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Shield, Eye, EyeOff, Zap, BarChart3, Users, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAppStore } from '@/store/app-store';

const DEMO_ACCOUNTS = [
  { name: 'Sarah Chen', role: 'Project Manager', email: 'sarah@boss.dev' },
  { name: 'Marcus Rodriguez', role: 'Senior Developer', email: 'marcus@boss.dev' },
  { name: 'Liam Walsh', role: 'Admin / CTO', email: 'liam@boss.dev' },
  { name: 'Priya Sharma', role: 'Team Lead', email: 'priya@boss.dev' },
];

const FEATURES = [
  { icon: BarChart3, text: 'Real-time project health & analytics' },
  { icon: Users, text: 'Resource utilization & workload tracking' },
  { icon: Zap, text: 'Daily accountability & work logging' },
  { icon: CheckCircle2, text: 'AI-powered delay prediction' },
];

export default function LoginPage() {
  const { login } = useAppStore();
  const router = useRouter();
  const [email, setEmail] = useState('sarah@boss.dev');
  const [password, setPassword] = useState('demo123');
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    const ok = await login(email, password);
    setLoading(false);
    if (ok) router.replace('/dashboard');
    else setError('Invalid email or password. Use password: demo123');
  };

  return (
    <div className="flex min-h-screen">
      {/* Left — brand panel */}
      <div className="hidden w-1/2 flex-col justify-between bg-gradient-to-br from-indigo-600 via-indigo-700 to-violet-800 p-12 lg:flex">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/20">
            <Shield className="h-5 w-5 text-white" />
          </div>
          <span className="text-xl font-bold text-white tracking-tight">BOSS</span>
          <span className="rounded-full bg-white/15 px-2 py-0.5 text-xs text-white/80">Enterprise</span>
        </div>

        <div>
          <h1 className="text-4xl font-bold text-white leading-tight">
            The operating system<br />for your team.
          </h1>
          <p className="mt-4 text-lg text-indigo-200">
            Track every resource, every day, every deliverable — in one unified platform.
          </p>

          <div className="mt-8 space-y-3">
            {FEATURES.map(({ icon: Icon, text }) => (
              <div key={text} className="flex items-center gap-3">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white/15">
                  <Icon className="h-4 w-4 text-white" />
                </div>
                <span className="text-sm text-indigo-100">{text}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-2xl bg-white/10 p-5">
          <p className="text-sm text-indigo-100 italic">
            &ldquo;BOSS gave us complete visibility into every project. We cut delayed deliveries by 60% in the first quarter.&rdquo;
          </p>
          <div className="mt-3 flex items-center gap-2">
            <div className="h-7 w-7 rounded-full bg-white/25 flex items-center justify-center text-xs font-bold text-white">RC</div>
            <div>
              <p className="text-xs font-semibold text-white">Rachel Cole</p>
              <p className="text-[10px] text-indigo-300">VP Engineering, TechVentures Inc.</p>
            </div>
          </div>
        </div>
      </div>

      {/* Right — form */}
      <div className="flex flex-1 flex-col items-center justify-center px-6 py-12 lg:px-16">
        <div className="w-full max-w-sm">
          {/* Mobile logo */}
          <div className="mb-8 flex items-center gap-2 lg:hidden">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-600">
              <Shield className="h-4 w-4 text-white" />
            </div>
            <span className="text-lg font-bold text-slate-900 dark:text-white">BOSS</span>
          </div>

          <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Welcome back</h2>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Sign in to your workspace</p>

          <form onSubmit={handleSubmit} className="mt-8 space-y-4">
            <Input
              label="Work Email"
              type="email"
              placeholder="you@company.com"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              autoComplete="email"
            />
            <div>
              <Input
                label="Password"
                type={showPw ? 'text' : 'password'}
                placeholder="••••••••"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                autoComplete="current-password"
              />
              <button
                type="button"
                onClick={() => setShowPw(!showPw)}
                className="mt-1 text-xs text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
              >
                {showPw ? 'Hide password' : 'Show password'}
              </button>
            </div>

            {error && (
              <div className="rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700 dark:bg-red-950/30 dark:text-red-400">
                {error}
              </div>
            )}

            <Button type="submit" loading={loading} className="w-full">
              Sign In
            </Button>
          </form>

          {/* Demo accounts */}
          <div className="mt-8">
            <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-slate-400">Demo accounts (password: demo123)</p>
            <div className="grid grid-cols-2 gap-2">
              {DEMO_ACCOUNTS.map(acc => (
                <button
                  key={acc.email}
                  type="button"
                  onClick={() => { setEmail(acc.email); setPassword('demo123'); }}
                  className="rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-left transition-colors hover:border-indigo-300 hover:bg-indigo-50 dark:border-slate-700 dark:bg-slate-900 dark:hover:border-indigo-600 dark:hover:bg-indigo-950/20"
                >
                  <p className="text-xs font-medium text-slate-900 dark:text-slate-100">{acc.name}</p>
                  <p className="text-[10px] text-slate-500 dark:text-slate-400">{acc.role}</p>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
