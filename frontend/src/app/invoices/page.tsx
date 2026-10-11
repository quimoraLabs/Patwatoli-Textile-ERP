'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';
import { Invoice } from '@/types';
import {
  FileText,
  Plus,
  Search,
  Download,
  Ban,
  Filter,
  CheckCircle2,
  XCircle,
  Eye,
  AlertTriangle,
} from 'lucide-react';

export default function InvoicesPage() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState('');
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [cancelModalOpen, setCancelModalOpen] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [cancelling, setCancelling] = useState(false);

  const fetchInvoices = async () => {
    setLoading(true);
    try {
      const res = await api.getInvoices({ status: statusFilter || undefined });
      setInvoices(res.data);
    } catch (err: any) {
      setError(err.message || 'Failed to load invoices');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInvoices();
  }, [statusFilter]);

  const handleCancelSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedInvoice) return;
    setCancelling(true);
    try {
      await api.cancelInvoice(selectedInvoice.id, cancelReason);
      setCancelModalOpen(false);
      setCancelReason('');
      fetchInvoices();
    } catch (err: any) {
      alert(err.message || 'Cancellation failed');
    } finally {
      setCancelling(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Sales Invoices (बिक्री बिल)</h1>
          <p className="text-xs text-slate-400 mt-1">
            Browse GST and Non-GST sales invoices, download PDFs, and manage cancellations
          </p>
        </div>
        <Link
          href="/invoices/new"
          className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold shadow-lg shadow-indigo-600/30 transition-all cursor-pointer self-start"
        >
          <Plus className="h-4 w-4" />
          <span>Create New Invoice</span>
        </Link>
      </div>

      {/* Filter Bar */}
      <div className="glass-panel rounded-xl p-4 border border-slate-700/50 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Filter className="h-4 w-4 text-slate-400" />
          <div className="flex items-center gap-2">
            <button
              onClick={() => setStatusFilter('')}
              className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                statusFilter === ''
                  ? 'bg-indigo-600 text-white'
                  : 'bg-slate-800 text-slate-400 hover:text-white'
              }`}
            >
              All
            </button>
            <button
              onClick={() => setStatusFilter('active')}
              className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                statusFilter === 'active'
                  ? 'bg-emerald-600 text-white'
                  : 'bg-slate-800 text-slate-400 hover:text-white'
              }`}
            >
              Active
            </button>
            <button
              onClick={() => setStatusFilter('cancelled')}
              className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                statusFilter === 'cancelled'
                  ? 'bg-rose-600 text-white'
                  : 'bg-slate-800 text-slate-400 hover:text-white'
              }`}
            >
              Cancelled
            </button>
          </div>
        </div>
        <span className="text-xs text-slate-400 font-medium">Total: {invoices.length} invoices</span>
      </div>

      {/* Table */}
      <div className="glass-panel rounded-2xl border border-slate-700/50 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-800/60 text-slate-400 border-b border-slate-700/50">
              <tr>
                <th className="py-3 px-4 font-semibold">Invoice #</th>
                <th className="py-3 px-4 font-semibold">Merchant (व्यापारी)</th>
                <th className="py-3 px-4 font-semibold">Date</th>
                <th className="py-3 px-4 font-semibold text-right">Taxable</th>
                <th className="py-3 px-4 font-semibold text-right">CGST + SGST</th>
                <th className="py-3 px-4 font-semibold text-right">Grand Total</th>
                <th className="py-3 px-4 font-semibold text-center">Status</th>
                <th className="py-3 px-4 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800 text-slate-300">
              {loading ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-500">
                    <div className="h-6 w-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
                    Loading invoices...
                  </td>
                </tr>
              ) : invoices.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-500">
                    No invoices found. Click &quot;Create New Invoice&quot; to generate your first bill.
                  </td>
                </tr>
              ) : (
                invoices.map((inv) => (
                  <tr key={inv.id} className="hover:bg-slate-800/40 transition-colors">
                    <td className="py-3 px-4 font-semibold text-indigo-300">
                      <Link href={`/invoices/${inv.id}`} className="hover:underline">
                        {inv.invoice_no}
                      </Link>
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-medium text-slate-200">{inv.merchant_name}</div>
                      {inv.merchant_phone && <div className="text-[11px] text-slate-500">{inv.merchant_phone}</div>}
                    </td>
                    <td className="py-3 px-4 text-slate-400">{inv.invoice_date}</td>
                    <td className="py-3 px-4 text-right">₹{inv.taxable_amount.toFixed(2)}</td>
                    <td className="py-3 px-4 text-right text-indigo-300">
                      ₹{(inv.cgst + inv.sgst).toFixed(2)}
                    </td>
                    <td className="py-3 px-4 text-right font-bold text-white">
                      ₹{inv.total_amount.toFixed(2)}
                    </td>
                    <td className="py-3 px-4 text-center">
                      {inv.status === 'active' ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/15 text-emerald-300 border border-emerald-500/25">
                          <CheckCircle2 className="h-3 w-3" /> Active
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-rose-500/15 text-rose-300 border border-rose-500/25">
                          <XCircle className="h-3 w-3" /> Cancelled
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Link
                          href={`/invoices/${inv.id}`}
                          title="View Details"
                          className="p-1.5 rounded-lg bg-slate-800 text-slate-300 hover:text-white border border-slate-700 transition-colors"
                        >
                          <Eye className="h-3.5 w-3.5" />
                        </Link>
                        <a
                          href={api.getInvoicePdfUrl(inv.id)}
                          target="_blank"
                          rel="noreferrer"
                          title="Download PDF"
                          className="p-1.5 rounded-lg bg-slate-800 text-indigo-400 hover:text-indigo-300 border border-slate-700 transition-colors"
                        >
                          <Download className="h-3.5 w-3.5" />
                        </a>
                        {inv.status === 'active' && (
                          <button
                            onClick={() => {
                              setSelectedInvoice(inv);
                              setCancelModalOpen(true);
                            }}
                            title="Cancel Invoice"
                            className="p-1.5 rounded-lg bg-rose-500/15 text-rose-300 hover:bg-rose-500/25 border border-rose-500/30 transition-colors cursor-pointer"
                          >
                            <Ban className="h-3.5 w-3.5" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Cancel Invoice Modal */}
      {cancelModalOpen && selectedInvoice && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="glass-panel rounded-2xl p-6 border border-rose-500/30 max-w-md w-full shadow-2xl animate-in fade-in zoom-in-95">
            <div className="flex items-center gap-3 text-rose-400 mb-4">
              <AlertTriangle className="h-6 w-6" />
              <h3 className="font-bold text-base text-white">Cancel Invoice {selectedInvoice.invoice_no}</h3>
            </div>
            <p className="text-xs text-slate-300 mb-4 leading-relaxed">
              Cancelling this invoice will preserve transaction history and automatically post a{' '}
              <strong className="text-white">reversing credit of ₹{selectedInvoice.total_amount.toFixed(2)}</strong> to{' '}
              {selectedInvoice.merchant_name}&apos;s Khaata ledger.
            </p>

            <form onSubmit={handleCancelSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Reason for Cancellation <span className="text-rose-400">*</span>
                </label>
                <textarea
                  required
                  rows={3}
                  value={cancelReason}
                  onChange={(e) => setCancelReason(e.target.value)}
                  placeholder="e.g. Return of gamcha cloth / Incorrect rate applied"
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-slate-200 focus:outline-none focus:border-rose-500"
                ></textarea>
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setCancelModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white bg-slate-800 transition-colors cursor-pointer"
                >
                  Close
                </button>
                <button
                  type="submit"
                  disabled={cancelling}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-white bg-rose-600 hover:bg-rose-500 transition-colors cursor-pointer disabled:opacity-50"
                >
                  {cancelling ? 'Cancelling...' : 'Confirm Cancellation'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
