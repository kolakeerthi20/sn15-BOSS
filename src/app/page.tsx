'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';

export default function Root() {
  const { status } = useSession();
  const router = useRouter();
  useEffect(() => {
    if (status === 'authenticated') router.replace('/dashboard');
    else if (status === 'unauthenticated') router.replace('/login');
  }, [status, router]);
  return null;
}
