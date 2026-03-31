'use client';
import { useAuth } from '@/hooks/use-auth';
import { Sidebar } from './sidebar';
import { Topbar } from './topbar';
import { useRouter } from 'next/navigation';
import { useEffect, type ReactNode } from 'react';

export function Shell({ children }: { children: ReactNode }) {
  const { isAuthenticated, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !isAuthenticated) router.push('/login');
  }, [loading, isAuthenticated, router]);

  if (loading) return <div className="flex h-screen items-center justify-center"><p className="text-muted-foreground">Loading...</p></div>;
  if (!isAuthenticated) return null;

  return (
    <div className="flex h-screen">
      <Sidebar />
      <div className="flex flex-1 flex-col overflow-hidden">
        <Topbar />
        <main className="flex-1 overflow-auto p-6">{children}</main>
        <footer className="border-t px-6 py-2 text-center text-xs text-muted-foreground">
          MA Finance Hub &mdash; Powered by MAiSHQ
        </footer>
      </div>
    </div>
  );
}
