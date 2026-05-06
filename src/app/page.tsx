'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAppStore } from '@/store/app-store';

export default function Root() {
  const { isAuthenticated } = useAppStore();
  const router = useRouter();
  useEffect(() => {
    router.replace(isAuthenticated ? '/dashboard' : '/login');
  }, [isAuthenticated, router]);
  return null;
}
