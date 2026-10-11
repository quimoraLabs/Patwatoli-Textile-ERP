'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';
import { DashboardMetrics } from '@/types';
import {
  TrendingUp,
  CreditCard,
  AlertCircle,
  FileText,
  Users,
  ArrowUpRight,
  ArrowDownRight,
  Plus,
  RefreshCw,
  Clock,
  CheckCircle2,
  XCircle,
} from 'lucide-react';

export default function DashboardPage() {
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchDashboard = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.getDashboardMetrics();
      setMetrics(data);
    } catch (err: any) {
      setError(err.message || 'Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboard();
  }, []);

  if (loading && !metrics) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
          <span className="text-xs text-slate-400">Loading Patwatoli ERP metrics...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Cluster Operations Dashboard</h1>
          <p className="text-xs text-slate-400 mt-1">
            Real-time financial performance, merchant balances & textile sales
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={fetchDashboard}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium text-slate-300 hover:text-white bg-slate-800/80 hover:bg-slate-700 border border-slate-700 transition-colors cursor-pointer"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            <span>Refresh</span>
          </button>
          <Link
            href="/invoices/new"
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 shadow-md shadow-indigo-600/30 transition-all cursor-pointer"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>Create Invoice</span>
          </Link>
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs">
          {error}
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {/* Monthly Sales */}
        <div className="glass-panel glass-panel-hover rounded-2xl p-5 border border-slate-700/50">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">This Month Sales</span>
            <div className="h-8 w-8 rounded-lg bg-indigo-500/15 text-indigo-400 flex items-center justify-center">
              <TrendingUp className="h-4 w-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-white">
            ₹{metrics?.monthly_sales.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </div>
          <div className="mt-2 text-xs text-slate-400 flex items-center gap-1">
            <span className="text-emerald-400 font-medium">₹{metrics?.monthly_tax.toLocaleString('en-IN')}</span>
            <span>GST tax included</span>
          </div>
        </div>

        {/* Total Outstanding */}
        <div className="glass-panel glass-panel-hover rounded-2xl p-5 border border-slate-700/50">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Total Outstanding</span>
            <div className="h-8 w-8 rounded-lg bg-amber-500/15 text-amber-400 flex items-center justify-center">
              <AlertCircle className="h-4 w-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-amber-300">
            ₹{metrics?.total_outstanding.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </div>
          <div className="mt-2 text-xs text-slate-400 flex items-center gap-1">
            <ArrowUpRight className="h-3.5 w-3.5 text-amber-400" />
            <span>Owed by merchants</span>
          </div>
        </div>

        {/* Monthly Income */}
        <div className="glass-panel glass-panel-hover rounded-2xl p-5 border border-slate-700/50">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Collections / Income</span>
            <div className="h-8 w-8 rounded-lg bg-emerald-500/15 text-emerald-400 flex items-center justify-center">
              <CreditCard className="h-4 w-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-emerald-300">
            ₹{metrics?.monthly_income.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </div>
          <div className="mt-2 text-xs text-slate-400 flex items-center gap-1">
            <ArrowDownRight className="h-3.5 w-3.5 text-emerald-400" />
            <span>Payments received</span>
          </div>
        </div>

        {/* Advance Balances */}
        <div className="glass-panel glass-panel-hover rounded-2xl p-5 border border-slate-700/50">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Advance Balance</span>
            <div className="h-8 w-8 rounded-lg bg-cyan-500/15 text-cyan-400 flex items-center justify-center">
              <Users className="h-4 w-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-cyan-300">
            ₹{metrics?.total_advance.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </div>
          <div className="mt-2 text-xs text-slate-400 flex items-center gap-1">
            <span>Advance payments held</span>
          </div>
        </div>
      </div>

      {/* Two Column Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Invoices Table (2 Cols) */}
        <div className="lg:col-span-2 glass-panel rounded-2xl p-6 border border-slate-700/50 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <FileText className="h-4 w-4 text-indigo-400" />
              <h2 className="text-sm font-bold text-white">Recent Sales Invoices</h2>
            </div>
            <Link href="/invoices" className="text-xs text-indigo-400 hover:text-indigo-300 font-medium">
              View All →
            </Link>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-800/50 text-slate-400 border-b border-slate-700/50">
                <tr>
                  <th className="py-2.5 px-3 font-semibold">Invoice #</th>
                  <th className="py-2.5 px-3 font-semibold">Buyer (व्यापारी)</th>
                  <th className="py-2.5 px-3 font-semibold">Date</th>
                  <th className="py-2.5 px-3 font-semibold text-right">Amount</th>
                  <th className="py-2.5 px-3 font-semibold text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800 text-slate-300">
                {metrics?.recent_invoices.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-6 text-center text-slate-500">
                      No invoices recorded yet. Click &quot;Create Invoice&quot; to begin.
                    </td>
                  </tr>
                ) : (
                  metrics?.recent_invoices.map((inv) => (
                    <tr key={inv.id} className="hover:bg-slate-800/30 transition-colors">
                      <td className="py-2.5 px-3 font-semibold text-indigo-300">
                        <Link href={`/invoices/${inv.id}`}>{inv.invoice_no}</Link>
                      </td>
                      <td className="py-2.5 px-3">{inv.merchant_name}</td>
                      <td className="py-2.5 px-3 text-slate-400">{inv.invoice_date}</td>
                      <td className="py-2.5 px-3 text-right font-medium text-white">
                        ₹{inv.total_amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        {inv.status === 'active' ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-emerald-500/15 text-emerald-300 border border-emerald-500/20">
                            <CheckCircle2 className="h-2.5 w-2.5" /> Active
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-rose-500/15 text-rose-300 border border-rose-500/20">
                            <XCircle className="h-2.5 w-2.5" /> Cancelled
                          </span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Top Merchants (1 Col) */}
        <div className="glass-panel rounded-2xl p-6 border border-slate-700/50 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-cyan-400" />
              <h2 className="text-sm font-bold text-white">Top Merchants (व्यापारी)</h2>
            </div>
            <Link href="/party" className="text-xs text-cyan-400 hover:text-cyan-300 font-medium">
              Khaata →
            </Link>
          </div>

          <div className="space-y-3">
            {metrics?.top_merchants.length === 0 ? (
              <p className="text-xs text-slate-500 py-4 text-center">No merchants active yet.</p>
            ) : (
              metrics?.top_merchants.map((m) => (
                <div
                  key={m.merchant_id}
                  className="p-3 rounded-xl bg-slate-800/40 border border-slate-700/40 flex items-center justify-between text-xs"
                >
                  <div>
                    <div className="font-semibold text-slate-200">{m.merchant_name}</div>
                    <div className="text-[11px] text-slate-400">
                      Billed: ₹{m.total_sales.toLocaleString('en-IN')}
                    </div>
                  </div>
                  <div className="text-right">
                    <span
                      className={`text-xs font-semibold px-2 py-0.5 rounded-md ${
                        m.current_balance > 0
                          ? 'bg-amber-500/15 text-amber-300'
                          : m.current_balance < 0
                          ? 'bg-cyan-500/15 text-cyan-300'
                          : 'bg-slate-700/30 text-slate-400'
                      }`}
                    >
                      ₹{Math.abs(m.current_balance).toLocaleString('en-IN')}
                    </span>
                    <div className="text-[10px] text-slate-500 mt-0.5">
                      {m.current_balance > 0 ? 'Outstanding' : m.current_balance < 0 ? 'Advance' : 'Settled'}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
