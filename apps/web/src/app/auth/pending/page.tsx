'use client';

/**
 * /auth/pending
 *
 * Shown to users whose role is still 'pending' — they signed up with Google
 * but haven't been assigned a role yet by a Lead or Project Manager.
 */

import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { Clock, LogOut, Zap, Mail } from 'lucide-react';
import { useAuthStore } from '@/store/auth.store';
import { authApi } from '@/lib/api';

export default function PendingPage() {
  const router  = useRouter();
  const { user, logout, accessToken } = useAuthStore();

  const handleLogout = async () => {
    try { await authApi.logout(accessToken!); } catch {}
    logout();
    router.replace('/auth/login');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 via-white to-orange-50 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.4, ease: 'easeOut' }}
        className="w-full max-w-md"
      >
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 mb-3">
            <div className="w-10 h-10 bg-brand-500 rounded-xl flex items-center justify-center">
              <Zap className="w-6 h-6 text-white" />
            </div>
            <span className="text-2xl font-bold text-gray-900">BOSS</span>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-xl border border-amber-100 p-8 text-center">
          {/* Animated clock icon */}
          <motion.div
            animate={{ rotate: [0, 10, -10, 0] }}
            transition={{ repeat: Infinity, duration: 3, ease: 'easeInOut' }}
            className="inline-flex items-center justify-center w-16 h-16 bg-amber-100 rounded-full mb-5"
          >
            <Clock className="w-8 h-8 text-amber-600" />
          </motion.div>

          <h1 className="text-2xl font-semibold text-gray-900 mb-2">
            Account Pending Approval
          </h1>
          <p className="text-gray-500 text-sm mb-4">
            You've signed in successfully, but your account needs a role assignment
            before you can access the platform.
          </p>

          {user && (
            <div className="bg-gray-50 rounded-xl p-4 mb-6 text-left">
              <div className="flex items-center gap-3">
                {user.avatar_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={user.avatar_url}
                    alt="avatar"
                    className="w-10 h-10 rounded-full object-cover"
                  />
                ) : (
                  <div className="w-10 h-10 rounded-full bg-brand-100 flex items-center justify-center text-brand-700 font-semibold text-sm">
                    {(user.first_name?.[0] ?? user.email[0]).toUpperCase()}
                  </div>
                )}
                <div>
                  <p className="font-medium text-gray-900 text-sm">
                    {user.first_name} {user.last_name}
                  </p>
                  <p className="text-xs text-gray-500 flex items-center gap-1">
                    <Mail size={11} /> {user.email}
                  </p>
                </div>
              </div>
            </div>
          )}

          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-6 text-sm text-amber-800 text-left">
            <p className="font-medium mb-1">What happens next?</p>
            <ul className="space-y-1 text-xs list-disc list-inside text-amber-700">
              <li>A <strong>Lead</strong> or <strong>Project Manager</strong> in your org will assign your role.</li>
              <li>You'll receive access once they approve you.</li>
              <li>Ask your team's Lead or PM to log in and assign your role.</li>
            </ul>
          </div>

          <button
            onClick={handleLogout}
            className="flex items-center justify-center gap-2 w-full border border-gray-200 text-gray-600 rounded-lg py-2.5 text-sm font-medium hover:bg-gray-50 transition"
          >
            <LogOut size={15} />
            Sign out
          </button>
        </div>
      </motion.div>
    </div>
  );
}
