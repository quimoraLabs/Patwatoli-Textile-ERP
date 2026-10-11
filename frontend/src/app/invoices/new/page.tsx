'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { api } from '@/lib/api';
import { Item, Merchant } from '@/types';
import {
  FilePlus,
  Trash2,
  Plus,
  ArrowLeft,
  CheckCircle,
  Calculator,
  UserCheck,
} from 'lucide-react';

interface InvoiceRow {
  itemId: string;
  variantId: string;
  size: string;
  qty: number;
  rate: number;
  amount: number;
}

export default function NewInvoicePage() {
  const router = useRouter();
  const [merchants, setMerchants] = useState<Merchant[]>([]);
  const [items, setItems] = useState<Item[]>([]);
  const [selectedMerchantId, setSelectedMerchantId] = useState('');
  const [invoiceDate, setInvoiceDate] = useState(new Date().toISOString().split('T')[0]);
  const [rows, setRows] = useState<InvoiceRow[]>([
    { itemId: '', variantId: '', size: '', qty: 1, rate: 0, amount: 0 },
  ]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([api.getMerchants({ limit: 100 }), api.getItems({ limit: 100 })])
      .then(([mRes, iRes]) => {
        setMerchants(mRes.data);
        setItems(iRes.data);
        if (mRes.data.length > 0) setSelectedMerchantId(mRes.data[0].id);
      })
      .catch((err) => setError(err.message));
  }, []);

  const selectedMerchant = merchants.find((m) => m.id === selectedMerchantId);

  const handleItemChange = (rowIndex: number, itemId: string) => {
    const item = items.find((i) => i.id === itemId);
    const newRows = [...rows];
    newRows[rowIndex].itemId = itemId;

    if (item && item.variants.length > 0) {
      const v = item.variants[0];
      newRows[rowIndex].variantId = v.id;
      newRows[rowIndex].size = v.size;
      newRows[rowIndex].rate = v.rate;
      newRows[rowIndex].amount = Math.round(newRows[rowIndex].qty * v.rate * 100) / 100;
    } else {
      newRows[rowIndex].variantId = '';
      newRows[rowIndex].size = '';
      newRows[rowIndex].rate = 0;
      newRows[rowIndex].amount = 0;
    }
    setRows(newRows);
  };

  const handleVariantChange = (rowIndex: number, variantId: string) => {
    const item = items.find((i) => i.id === rows[rowIndex].itemId);
    const variant = item?.variants.find((v) => v.id === variantId);
    const newRows = [...rows];
    newRows[rowIndex].variantId = variantId;
    if (variant) {
      newRows[rowIndex].size = variant.size;
      newRows[rowIndex].rate = variant.rate;
      newRows[rowIndex].amount = Math.round(newRows[rowIndex].qty * variant.rate * 100) / 100;
    }
    setRows(newRows);
  };

  const handleQtyChange = (rowIndex: number, qty: number) => {
    const newRows = [...rows];
    newRows[rowIndex].qty = qty;
    newRows[rowIndex].amount = Math.round(qty * newRows[rowIndex].rate * 100) / 100;
    setRows(newRows);
  };

  const handleRateChange = (rowIndex: number, rate: number) => {
    const newRows = [...rows];
    newRows[rowIndex].rate = rate;
    newRows[rowIndex].amount = Math.round(newRows[rowIndex].qty * rate * 100) / 100;
    setRows(newRows);
  };

  const addRow = () => {
    setRows([...rows, { itemId: '', variantId: '', size: '', qty: 1, rate: 0, amount: 0 }]);
  };

  const removeRow = (index: number) => {
    if (rows.length === 1) return;
    setRows(rows.filter((_, i) => i !== index));
  };

  const taxableTotal = Math.round(rows.reduce((sum, r) => sum + r.amount, 0) * 100) / 100;
  const cgst = Math.round(taxableTotal * 0.025 * 100) / 100;
  const sgst = Math.round(taxableTotal * 0.025 * 100) / 100;
  const grandTotal = Math.round((taxableTotal + cgst + sgst) * 100) / 100;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedMerchantId) {
      setError('Please select a merchant');
      return;
    }

    const validItems = rows.filter((r) => r.itemId && r.variantId && r.qty > 0);
    if (validItems.length === 0) {
      setError('Please select at least one item and size variant');
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const invoice = await api.createInvoice({
        merchant_id: selectedMerchantId,
        invoice_date: invoiceDate,
        items: validItems.map((r) => ({
          item_id: r.itemId,
          variant_id: r.variantId,
          qty: r.qty,
          rate: r.rate,
        })),
      });

      router.push(`/invoices/${invoice.id}`);
    } catch (err: any) {
      setError(err.message || 'Failed to create invoice');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Top Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link
            href="/invoices"
            className="p-2 rounded-xl bg-slate-800 text-slate-300 hover:text-white border border-slate-700 transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-white tracking-tight">Create Sales Invoice (नया बिक्री बिल)</h1>
            <p className="text-xs text-slate-400 mt-0.5">
              Instant GST calculation, size variant billing & automatic Khaata ledger entry
            </p>
          </div>
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Form (2 cols) */}
        <div className="lg:col-span-2 space-y-6">
          {/* Party & Date Selection */}
          <div className="glass-panel rounded-2xl p-6 border border-slate-700/50 space-y-4">
            <h2 className="text-sm font-bold text-white flex items-center gap-2">
              <UserCheck className="h-4 w-4 text-indigo-400" />
              <span>Merchant & Billing Date</span>
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Select Merchant (व्यापारी) <span className="text-indigo-400">*</span>
                </label>
                <select
                  required
                  value={selectedMerchantId}
                  onChange={(e) => setSelectedMerchantId(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
                >
                  <option value="">Select a merchant...</option>
                  {merchants.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name} {m.phone ? `(${m.phone})` : ''}
                    </option>
                  ))}
                </select>
                {selectedMerchant && (
                  <div className="mt-2 text-[11px] text-slate-400 flex items-center gap-2">
                    <span>Balance: </span>
                    <span
                      className={`font-semibold ${
                        selectedMerchant.current_balance > 0
                          ? 'text-amber-400'
                          : selectedMerchant.current_balance < 0
                          ? 'text-cyan-400'
                          : 'text-emerald-400'
                      }`}
                    >
                      ₹{Math.abs(selectedMerchant.current_balance).toFixed(2)}{' '}
                      {selectedMerchant.current_balance > 0 ? 'Due' : selectedMerchant.current_balance < 0 ? 'Advance' : 'Nil'}
                    </span>
                  </div>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Invoice Date <span className="text-indigo-400">*</span>
                </label>
                <input
                  type="date"
                  required
                  value={invoiceDate}
                  onChange={(e) => setInvoiceDate(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
                />
              </div>
            </div>
          </div>

          {/* Line Items Table */}
          <div className="glass-panel rounded-2xl p-6 border border-slate-700/50 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold text-white flex items-center gap-2">
                <FilePlus className="h-4 w-4 text-indigo-400" />
                <span>Textile Item Breakdown</span>
              </h2>
              <button
                type="button"
                onClick={addRow}
                className="flex items-center gap-1.5 px-3 py-1 bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 rounded-lg text-xs font-semibold border border-indigo-500/30 transition-colors cursor-pointer"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>Add Row</span>
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-800/60 text-slate-400 border-b border-slate-700/50">
                  <tr>
                    <th className="py-2.5 px-3 font-semibold">Cloth / Item</th>
                    <th className="py-2.5 px-3 font-semibold">Size Variant</th>
                    <th className="py-2.5 px-3 font-semibold w-24">Qty</th>
                    <th className="py-2.5 px-3 font-semibold w-28">Rate (₹)</th>
                    <th className="py-2.5 px-3 font-semibold text-right">Amount (₹)</th>
                    <th className="py-2.5 px-2 w-10"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {rows.map((row, index) => {
                    const currentItem = items.find((i) => i.id === row.itemId);
                    return (
                      <tr key={index} className="hover:bg-slate-800/30 transition-colors">
                        <td className="py-2.5 px-3">
                          <select
                            required
                            value={row.itemId}
                            onChange={(e) => handleItemChange(index, e.target.value)}
                            className="w-full px-2.5 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
                          >
                            <option value="">Select Item...</option>
                            {items.map((i) => (
                              <option key={i.id} value={i.id}>
                                {i.name} ({i.unit})
                              </option>
                            ))}
                          </select>
                        </td>
                        <td className="py-2.5 px-3">
                          <select
                            required
                            disabled={!currentItem}
                            value={row.variantId}
                            onChange={(e) => handleVariantChange(index, e.target.value)}
                            className="w-full px-2.5 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-xs text-slate-200 focus:outline-none focus:border-indigo-500 disabled:opacity-40"
                          >
                            <option value="">Select Size...</option>
                            {currentItem?.variants.map((v) => (
                              <option key={v.id} value={v.id}>
                                Size {v.size} (₹{v.rate})
                              </option>
                            ))}
                          </select>
                        </td>
                        <td className="py-2.5 px-3">
                          <input
                            type="number"
                            min="0.1"
                            step="any"
                            required
                            value={row.qty}
                            onChange={(e) => handleQtyChange(index, parseFloat(e.target.value) || 0)}
                            className="w-full px-2.5 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-xs text-slate-200 text-right focus:outline-none focus:border-indigo-500"
                          />
                        </td>
                        <td className="py-2.5 px-3">
                          <input
                            type="number"
                            min="0"
                            step="any"
                            required
                            value={row.rate}
                            onChange={(e) => handleRateChange(index, parseFloat(e.target.value) || 0)}
                            className="w-full px-2.5 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-xs text-slate-200 text-right focus:outline-none focus:border-indigo-500"
                          />
                        </td>
                        <td className="py-2.5 px-3 text-right font-semibold text-slate-200">
                          ₹{row.amount.toFixed(2)}
                        </td>
                        <td className="py-2.5 px-2 text-center">
                          <button
                            type="button"
                            onClick={() => removeRow(index)}
                            disabled={rows.length === 1}
                            className="p-1.5 text-slate-500 hover:text-rose-400 disabled:opacity-20 transition-colors cursor-pointer"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Calculation & Summary Sidebar (1 col) */}
        <div className="space-y-6">
          <div className="glass-panel rounded-2xl p-6 border border-slate-700/50 space-y-5">
            <h2 className="text-sm font-bold text-white flex items-center gap-2">
              <Calculator className="h-4 w-4 text-emerald-400" />
              <span>Bill Calculation (GST)</span>
            </h2>

            <div className="space-y-3 text-xs divide-y divide-slate-800">
              <div className="flex items-center justify-between text-slate-400 pt-1">
                <span>Taxable Amount (कपड़ा मूल्य):</span>
                <span className="font-semibold text-white">₹{taxableTotal.toFixed(2)}</span>
              </div>
              <div className="flex items-center justify-between text-slate-400 pt-2">
                <span>CGST (2.5%):</span>
                <span className="font-semibold text-indigo-300">₹{cgst.toFixed(2)}</span>
              </div>
              <div className="flex items-center justify-between text-slate-400 pt-2">
                <span>SGST (2.5%):</span>
                <span className="font-semibold text-indigo-300">₹{sgst.toFixed(2)}</span>
              </div>
              <div className="flex items-center justify-between text-sm font-bold text-white pt-3">
                <span>Grand Total (कुल बिल):</span>
                <span className="text-base text-emerald-400">₹{grandTotal.toFixed(2)}</span>
              </div>
            </div>

            {/* Projected Ledger Balance */}
            {selectedMerchant && (
              <div className="p-3.5 rounded-xl bg-slate-800/50 border border-slate-700/50 text-xs space-y-1">
                <span className="text-[11px] text-slate-400 font-medium">Projected Khaata Balance:</span>
                <div className="text-sm font-bold text-indigo-300">
                  ₹{(selectedMerchant.current_balance + grandTotal).toFixed(2)} (Outstanding)
                </div>
              </div>
            )}

            <button
              type="submit"
              disabled={submitting || taxableTotal <= 0}
              className="w-full py-3 px-4 bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-500 hover:to-indigo-400 text-white font-semibold rounded-xl text-xs shadow-lg shadow-indigo-600/30 flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-50"
            >
              {submitting ? (
                <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              ) : (
                <>
                  <CheckCircle className="h-4 w-4" />
                  <span>Generate & Post Invoice</span>
                </>
              )}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
