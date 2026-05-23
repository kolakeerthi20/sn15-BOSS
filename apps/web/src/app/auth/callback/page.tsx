'use client';

/**
 * /auth/callback
 *
 * The NestJS Google OAuth callback redirects here with:
 *   ?accessToken=...&refreshToken=...&role=...
 *
 * Strategy:
 * 1. Read tokens from URL query params
 * 2. Fetch the full user profile from /auth/me using plain fetch (NOT the Axios
 *    instance — that has an error interceptor that redirects on 401 before we
 *    can handle it ourselves)
 * 3. Store in Zustand + set the boss-token cookie for middleware
 * 4. Route based on role
 */

import { useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Loader2, Zap } from 'lucide-react';
import { toast } from 'sonner';
import { useAuthStore } from '@/store/auth.store';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

export default function AuthCallbackPage() {
  const router      = useRouter();
  const searchParams = useSearchParams();
  const { setAuth } = useAuthStore();

  useEffect(() => {
    const accessToken  = searchParams.get('accessToken');
    const refreshToken = searchParams.get('refreshToken');

    if (!accessToken || !refreshToken) {
      toast.error('Authentication failed. Please sign in again.');
      router.replace('/auth/login');
      return;
    }

    // Use plain fetch — completely bypasses the Axios error interceptor
    fetch(`${API_BASE}/api/v1/auth/me`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    })
      .then(async (res) => {
        if (!res.ok) throw new Error(`/auth/me returned ${res.status}`);
        const body = await res.json();
        // API wraps responses: { success, data }
        const user = body.data ?? body;
        const tenantSlug =
          user.tenant_slug ||
          (typeof localStorage !== 'undefined' && localStorage.getItem('tenantSlug')) ||
          'acme';

        setAuth(user, accessToken, refreshToken, tenantSlug);
        toast.success(`Welcome, ${user.first_name || user.email}!`);

        if (user.role === 'pending') {
          router.replace('/auth/pending');
        } else {
          router.replace('/dashboard');
        }
      })
      .catch((err) => {
        console.error('Google callback /auth/me failed:', err);
        toast.error('Could not load your profile. Please try again.');
        router.replace('/auth/login');
      });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="min-h-screen bg-gradient-to-br from-brand-50 via-white to-indigo-50 flex items-center justify-center">
      <div className="flex flex-col items-center gap-4 text-gray-500">
        <div className="w-12 h-12 bg-brand-500 rounded-xl flex items-center justify-center mb-2">
          <Zap className="w-7 h-7 text-white" />
        </div>
        <Loader2 className="animate-spin text-brand-500" size={28} />
        <p className="text-sm">Completing sign-in…</p>
      </div>
    </div>
  );
}
