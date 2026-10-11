'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { authStorage, api } from '@/lib/api';
import { User } from '@/types';
import { LogOut, User as UserIcon, Shield, Clock, Plus } from 'lucide-react';
import Link from 'next/link';

export default function Navbar() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    setUser(authStorage.getUser());
  }, []);

  const handleLogout = async () => {
    try {
      await api.logout();
    } catch {
      authStorage.clear();
    }
    router.push('/login');
  };

  return (
    <header className="h-16 border-b border-slate-700/50 bg-slate-900/60 backdrop-blur-md sticky top-0 z-20 px-8 flex items-center justify-between ml-64">
      {/* Left Greeting & Time */}
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2 text-xs text-slate-400 bg-slate-800/60 px-3 py-1.5 rounded-lg border border-slate-700/40">
          <Clock className="h-3.5 w-3.5 text-indigo-400" />
          <span>{new Date().toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' })}</span>
        </div>
      </div>

      {/* Right Controls */}
      <div className="flex items-center gap-4">
        <Link
          href="/invoices/new"
          className="flex items-center gap-2 bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-500 hover:to-indigo-400 text-white text-xs font-semibold px-3.5 py-2 rounded-lg shadow-md shadow-indigo-600/20 transition-all cursor-pointer"
        >
          <Plus className="h-3.5 w-3.5" />
          <span>New Invoice</span>
        </Link>

        {/* User Card */}
        {user ? (
          <div className="flex items-center gap-3 pl-4 border-l border-slate-700/50">
            <div className="text-right">
              <div className="text-xs font-semibold text-slate-200">{user.name}</div>
              <div className="text-[11px] text-indigo-400 capitalize flex items-center justify-end gap-1 font-medium">
                <Shield className="h-3 w-3" />
                {user.role.replace('_', ' ')}
              </div>
            </div>
            <button
              onClick={handleLogout}
              title="Logout"
              className="p-2 rounded-lg hover:bg-rose-500/10 text-slate-400 hover:text-rose-400 border border-slate-700/50 transition-colors cursor-pointer"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        ) : (
          <Link
            href="/login"
            className="flex items-center gap-2 text-xs text-indigo-400 hover:text-indigo-300 font-medium px-3 py-1.5 rounded-lg border border-indigo-500/30 hover:bg-indigo-500/10 transition-colors"
          >
            <UserIcon className="h-3.5 w-3.5" />
            <span>Login</span>
          </Link>
        )}
      </div>
    </header>
  );
}
