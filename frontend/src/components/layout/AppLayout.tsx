'use client';

import { Suspense, useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { authStorage } from '@/lib/api';
import Sidebar from './Sidebar';
import Navbar from './Navbar';

function AppLayoutContent({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  const isPublicAuthPage =
    pathname === '/login' ||
    pathname === '/register' ||
    pathname === '/forgot-password' ||
    pathname === '/reset-password';

  useEffect(() => {
    setMounted(true);
    if (!isPublicAuthPage) {
      const token = authStorage.getToken();
      if (!token) {
        router.push('/login');
      }
    }
  }, [isPublicAuthPage, router]);

  if (!mounted) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-500"></div>
      </div>
    );
  }

  if (isPublicAuthPage) {
    return <main className="min-h-screen">{children}</main>;
  }

  return (
    <div className="min-h-screen bg-slate-950 flex">
      <Sidebar mobileOpen={mobileSidebarOpen} onClose={() => setMobileSidebarOpen(false)} />
      <div className="flex-1 flex flex-col min-w-0">
        <Navbar onOpenMobileSidebar={() => setMobileSidebarOpen(true)} />
        <main className="flex-1 p-3.5 sm:p-6 lg:p-8 lg:ml-64 overflow-y-auto min-w-0">
          {children}
        </main>
      </div>
    </div>
  );
}

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-slate-950 flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-500"></div>
        </div>
      }
    >
      <AppLayoutContent>{children}</AppLayoutContent>
    </Suspense>
  );
}
