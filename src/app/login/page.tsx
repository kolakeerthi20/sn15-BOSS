'use client';
import React, { useState, useEffect } from 'react';
import { signIn, useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { Shield, Zap, BarChart3, Users, CheckCircle2, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';

const FEATURES = [
  { icon: BarChart3, text: 'Real-time project health & analytics' },
  { icon: Users, text: 'Resource utilization & workload tracking' },
  { icon: Zap, text: 'Daily accountability & work logging' },
  { icon: CheckCircle2, text: 'AI-powered delay prediction' },
];

function GoogleIcon() {
  return (
    <svg className="h-5 w-5" viewBox="0 0 24 24">
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
    </svg>
  );
}

export default function LoginPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (status === 'authenticated') router.replace('/dashboard');
  }, [status, router]);

  const handleGoogleSignIn = async () => {
    setLoading(true);
    setError('');
    try {
      await signIn('google', { callbackUrl: '/dashboard' });
    } catch {
      setError('Sign-in failed. Please try again.');
      setLoading(false);
    }
  };

  if (status === 'loading' || status === 'authenticated') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 dark:bg-slate-950">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-indigo-200 border-t-indigo-600" />
      </div>
    );
  }

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

      {/* Right — sign in */}
      <div className="flex flex-1 flex-col items-center justify-center px-6 py-12 lg:px-16 bg-white dark:bg-slate-950">
        <div className="w-full max-w-sm">
          {/* Mobile logo */}
          <div className="mb-8 flex items-center gap-2 lg:hidden">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-600">
              <Shield className="h-4 w-4 text-white" />
            </div>
            <span className="text-lg font-bold text-slate-900 dark:text-white">BOSS</span>
          </div>

          <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Welcome</h2>
          <p className="mt-1.5 text-sm text-slate-500 dark:text-slate-400">
            Sign in with your Google account to access your workspace.
          </p>

          <div className="mt-8 space-y-4">
            {error && (
              <div className="flex items-center gap-2 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700 dark:bg-red-950/30 dark:text-red-400">
                <AlertCircle className="h-4 w-4 shrink-0" />
                {error}
              </div>
            )}

            <button
              onClick={handleGoogleSignIn}
              disabled={loading}
              className="flex w-full items-center justify-center gap-3 rounded-xl border border-slate-200 bg-white px-5 py-3 text-sm font-medium text-slate-700 shadow-sm transition-all hover:bg-slate-50 hover:shadow-md disabled:opacity-60 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
            >
              {loading
                ? <div className="h-5 w-5 animate-spin rounded-full border-2 border-slate-300 border-t-indigo-500" />
                : <GoogleIcon />
              }
              {loading ? 'Signing in…' : 'Continue with Google'}
            </button>
          </div>

          <div className="mt-8 rounded-xl border border-slate-100 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-900">
            <p className="text-xs font-semibold text-slate-600 dark:text-slate-400 mb-2">How access works</p>
            <ul className="space-y-1.5 text-xs text-slate-500 dark:text-slate-400">
              <li className="flex items-start gap-1.5">
                <span className="mt-0.5 h-3.5 w-3.5 shrink-0 text-indigo-500">①</span>
                Sign in with your Google account
              </li>
              <li className="flex items-start gap-1.5">
                <span className="mt-0.5 h-3.5 w-3.5 shrink-0 text-indigo-500">②</span>
                Your role is assigned by your admin (default: Employee)
              </li>
              <li className="flex items-start gap-1.5">
                <span className="mt-0.5 h-3.5 w-3.5 shrink-0 text-indigo-500">③</span>
                Admins can pre-assign roles from Settings → Roles
              </li>
            </ul>
          </div>

          <p className="mt-6 text-center text-xs text-slate-400 dark:text-slate-500">
            By signing in you agree to our Terms of Service and Privacy Policy.
          </p>
        </div>
      </div>
    </div>
  );
}
