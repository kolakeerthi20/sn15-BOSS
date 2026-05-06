import React from 'react';
import { ProtectedLayout } from '@/components/layout/protected-layout';
export default function ResourcesLayout({ children }: { children: React.ReactNode }) {
  return <ProtectedLayout>{children}</ProtectedLayout>;
}
