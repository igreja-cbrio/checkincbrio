import { Outlet, Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { MobileHeader, MobileNav } from './MobileNav';
import { Loader2 } from 'lucide-react';

export function AppLayout() {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="flex min-h-[100dvh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  return (
    <div className="min-h-[100dvh] bg-background flex flex-col">
      <MobileHeader />
      <main className="flex-1 px-4 py-4 pb-24 overflow-y-auto">
        <Outlet />
      </main>
      <MobileNav />
    </div>
  );
}
