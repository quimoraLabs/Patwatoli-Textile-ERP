'use client';

import { use, useEffect, useState } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';
import { Invoice } from '@/types';
import {
  ArrowLeft,
  Printer,
  Download,
  Ban,
  CheckCircle2,
  XCircle,
  AlertTriangle,
} from 'lucide-react';

export default function InvoiceDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const resolvedParams = use(params);
  const id = resolvedParams.id;
  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [cancelModalOpen, setCancelModalOpen] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [cancelling, setCancelling] = useState(false);

  const [downloadingPdf, setDownloadingPdf] = useState(false);

  const fetchInvoice = async () => {
    setLoading(true);
    try {
      const data = await api.getInvoice(id);
      setInvoice(data);
    } catch (err: any) {
      setError(err.message || 'Failed to load invoice');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInvoice();
  }, [id]);

  const handleDownloadPdf = async () => {
    if (!invoice) return;
    setDownloadingPdf(true);
    try {
      await api.downloadInvoicePDF(invoice.id, invoice.invoice_no);
    } catch (err: any) {
      // Fallback: open URL directly with query token
      window.open(api.getInvoicePdfUrl(invoice.id), '_blank');
    } finally {
      setDownloadingPdf(false);
    }
  };

  const handleCancelSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setCancelling(true);
    try {
      await api.cancelInvoice(id, cancelReason);
      setCancelModalOpen(false);
      fetchInvoice();
    } catch (err: any) {
      alert(err.message || 'Failed to cancel invoice');
    } finally {
      setCancelling(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="h-8 w-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (error || !invoice) {
    return (
      <div className="p-8 text-center space-y-4">
        <p className="text-sm text-rose-400">{error || 'Invoice not found'}</p>
        <Link href="/invoices" className="text-xs text-indigo-400 hover:underline">
          ← Back to Invoices
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Top Action Bar */}
      <div className="flex items-center justify-between no-print">
        <Link
          href="/invoices"
          className="flex items-center gap-2 text-xs text-slate-400 hover:text-white transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Back to Invoices</span>
        </Link>
        <div className="flex items-center gap-3">
          <button
            onClick={() => window.print()}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold text-slate-200 bg-slate-800 hover:bg-slate-700 border border-slate-700 transition-colors cursor-pointer"
          >
            <Printer className="h-3.5 w-3.5" />
            <span>Print Invoice</span>
          </button>
          <button
            onClick={handleDownloadPdf}
            disabled={downloadingPdf}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 shadow-md shadow-indigo-600/30 transition-all cursor-pointer disabled:opacity-50"
          >
            {downloadingPdf ? (
              <div className="h-3.5 w-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <Download className="h-3.5 w-3.5" />
            )}
            <span>{downloadingPdf ? 'Downloading...' : 'Download PDF'}</span>
          </button>
          {invoice.status === 'active' && (
            <button
              onClick={() => setCancelModalOpen(true)}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold text-rose-300 bg-rose-500/15 hover:bg-rose-500/25 border border-rose-500/30 transition-colors cursor-pointer"
            >
              <Ban className="h-3.5 w-3.5" />
              <span>Cancel Invoice</span>
            </button>
          )}
        </div>
      </div>

      {/* Printable Invoice Container */}
      <div className="glass-panel rounded-2xl p-8 border border-slate-700/50 space-y-8 bg-slate-900/90 text-slate-200">
        {/* Invoice Header */}
        <div className="flex justify-between items-start border-b border-slate-800 pb-6">
          <div>
            <h1 className="text-xl font-bold text-white tracking-wide">PATWATOLI TEXTILE</h1>
            <p className="text-xs text-slate-400 mt-1">Patwatoli Weaving Cluster, Gaya, Bihar</p>
            <p className="text-xs text-slate-400">HSN: 5208 (Cotton Handloom / Powerloom Fabric)</p>
          </div>
          <div className="text-right space-y-1">
            <div className="text-sm font-bold text-indigo-400 tracking-wider">TAX INVOICE</div>
            <div className="text-xs font-semibold text-white">Invoice #: {invoice.invoice_no}</div>
            <div className="text-xs text-slate-400">Date & Time: {invoice.invoice_date}</div>
            <div className="pt-1">
              {invoice.status === 'active' ? (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/15 text-emerald-300 border border-emerald-500/25">
                  <CheckCircle2 className="h-3 w-3" /> Active
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-rose-500/15 text-rose-300 border border-rose-500/25">
                  <XCircle className="h-3 w-3" /> Cancelled
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Bill To Info */}
        <div className="p-4 rounded-xl bg-slate-800/40 border border-slate-800 text-xs space-y-1">
          <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">
            Bill To (क्रेता):
          </div>
          <div className="text-sm font-bold text-white">{invoice.merchant_name}</div>
          {invoice.merchant_phone && <div className="text-slate-400">Phone: {invoice.merchant_phone}</div>}
          {invoice.merchant_gstin && <div className="text-slate-400">GSTIN: {invoice.merchant_gstin}</div>}
        </div>

        {/* Items Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border border-slate-800">
            <thead className="bg-slate-800/80 text-slate-300 border-b border-slate-700">
              <tr>
                <th className="py-2.5 px-3 font-semibold">#</th>
                <th className="py-2.5 px-3 font-semibold">Description</th>
                <th className="py-2.5 px-3 font-semibold text-center">Size</th>
                <th className="py-2.5 px-3 font-semibold text-right">Qty</th>
                <th className="py-2.5 px-3 font-semibold text-right">Rate (₹)</th>
                <th className="py-2.5 px-3 font-semibold text-right">Amount (₹)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {invoice.items?.map((it, idx) => (
                <tr key={it.id}>
                  <td className="py-2.5 px-3 text-slate-400">{idx + 1}</td>
                  <td className="py-2.5 px-3 font-medium text-white">
                    {it.item_name} {it.unit ? `(${it.unit})` : ''}
                  </td>
                  <td className="py-2.5 px-3 text-center text-indigo-300 font-semibold">{it.variant_size}</td>
                  <td className="py-2.5 px-3 text-right">{it.qty}</td>
                  <td className="py-2.5 px-3 text-right">₹{it.rate.toFixed(2)}</td>
                  <td className="py-2.5 px-3 text-right font-semibold text-white">₹{it.amount.toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Totals Summary */}
        <div className="flex justify-end">
          <div className="w-72 space-y-2 text-xs divide-y divide-slate-800">
            <div className="flex justify-between text-slate-400 pt-1">
              <span>Taxable Amount:</span>
              <span className="font-semibold text-white">₹{invoice.taxable_amount.toFixed(2)}</span>
            </div>
            {invoice.cgst > 0 && (
              <div className="flex justify-between text-slate-400 pt-2">
                <span>CGST (2.5%):</span>
                <span className="font-semibold text-indigo-300">₹{invoice.cgst.toFixed(2)}</span>
              </div>
            )}
            {invoice.sgst > 0 && (
              <div className="flex justify-between text-slate-400 pt-2">
                <span>SGST (2.5%):</span>
                <span className="font-semibold text-indigo-300">₹{invoice.sgst.toFixed(2)}</span>
              </div>
            )}
            <div className="flex justify-between text-sm font-bold text-white pt-3">
              <span>Grand Total:</span>
              <span className="text-emerald-400">₹{invoice.total_amount.toFixed(2)}</span>
            </div>
          </div>
        </div>

        {invoice.status === 'cancelled' && invoice.cancel_reason && (
          <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs space-y-1">
            <div className="font-bold flex items-center gap-1.5">
              <AlertTriangle className="h-4 w-4" />
              <span>Cancellation Details</span>
            </div>
            <p>Reason: {invoice.cancel_reason}</p>
          </div>
        )}

        {/* Footer notes */}
        <div className="pt-6 border-t border-slate-800 text-[11px] text-slate-500 text-center">
          Computer generated tax invoice • Valid for Patwatoli cluster commercial records
        </div>
      </div>

      {/* Cancel Modal */}
      {cancelModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="glass-panel rounded-2xl p-6 border border-rose-500/30 max-w-md w-full shadow-2xl">
            <h3 className="font-bold text-base text-white mb-2">Cancel Invoice {invoice.invoice_no}</h3>
            <p className="text-xs text-slate-300 mb-4">
              This will update status to cancelled and post a reversing credit of ₹{invoice.total_amount.toFixed(2)} in the Khaata.
            </p>
            <form onSubmit={handleCancelSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Cancellation Reason</label>
                <textarea
                  required
                  rows={3}
                  value={cancelReason}
                  onChange={(e) => setCancelReason(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-slate-200 focus:outline-none focus:border-rose-500"
                ></textarea>
              </div>
              <div className="flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setCancelModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white bg-slate-800 transition-colors"
                >
                  Close
                </button>
                <button
                  type="submit"
                  disabled={cancelling}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-white bg-rose-600 hover:bg-rose-500 transition-colors disabled:opacity-50"
                >
                  {cancelling ? 'Cancelling...' : 'Confirm'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
