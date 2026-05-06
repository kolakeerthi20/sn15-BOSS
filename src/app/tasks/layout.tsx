import React from 'react';
import { ProtectedLayout } from '@/components/layout/protected-layout';
export default function TasksLayout({ children }: { children: React.ReactNode }) {
  return <ProtectedLayout>{children}</ProtectedLayout>;
}
