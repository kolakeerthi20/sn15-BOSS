import React from 'react';
import { ProtectedLayout } from '@/components/layout/protected-layout';
export default function AnalyticsLayout({ children }: { children: React.ReactNode }) {
  return <ProtectedLayout>{children}</ProtectedLayout>;
}
