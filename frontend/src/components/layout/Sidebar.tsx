'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
  LayoutDashboard, 
  FileText, 
  PlusCircle, 
  Users, 
  BarChart3, 
  ShieldCheck,
  Layers,
  Sparkles
} from 'lucide-react';

const navigation = [
  { name: 'Dashboard', href: '/', icon: LayoutDashboard },
  { name: 'Invoices & Sales', href: '/invoices', icon: FileText },
  { name: 'New Invoice', href: '/invoices/new', icon: PlusCircle },
  { name: 'Parties & Khaata', href: '/party', icon: Users },
  { name: 'Reports & GST', href: '/reports', icon: BarChart3 },
  { name: 'Admin Panel', href: '/admin', icon: ShieldCheck },
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-64 glass-panel border-r border-slate-700/50 flex flex-col h-screen fixed left-0 top-0 z-30">
      {/* Brand Header */}
      <div className="p-6 border-b border-slate-700/50 flex items-center space-x-3">
        <div className="h-10 w-10 rounded-xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-cyan-400 flex items-center justify-center shadow-lg shadow-indigo-500/30">
          <Layers className="h-5 w-5 text-white" />
        </div>
        <div>
          <h1 className="font-bold text-base text-white tracking-wide">Patwatoli ERP</h1>
          <p className="text-xs text-indigo-400 font-medium flex items-center gap-1">
            <Sparkles className="h-3 w-3" /> Textile Core V1
          </p>
        </div>
      </div>

      {/* Navigation Links */}
      <nav className="flex-1 px-4 py-6 space-y-1.5 overflow-y-auto">
        {navigation.map((item) => {
          const isActive = pathname === item.href;
          const Icon = item.icon;
          return (
            <Link
              key={item.name}
              href={item.href}
              className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all ${
                isActive
                  ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30 border border-indigo-400/30 font-semibold'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              <Icon className={`h-4 w-4 ${isActive ? 'text-white' : 'text-slate-400'}`} />
              <span>{item.name}</span>
            </Link>
          );
        })}
      </nav>

      {/* Cluster Details Footer */}
      <div className="p-4 m-4 rounded-xl bg-slate-800/40 border border-slate-700/40 text-xs text-slate-400">
        <div className="flex items-center justify-between mb-1">
          <span className="font-semibold text-slate-300">Patwatoli Cluster</span>
          <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse"></span>
        </div>
        <p className="text-[11px] text-slate-500">Gaya, Bihar • V1 Active</p>
      </div>
    </aside>
  );
}
