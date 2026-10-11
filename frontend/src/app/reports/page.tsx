'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import {
  BarChart3,
  Calendar,
  Download,
  Filter,
  FileSpreadsheet,
  TrendingUp,
  Receipt,
  Layers,
} from 'lucide-react';

export default function ReportsPage() {
  const [tab, setTab] = useState<'sales' | 'merchant' | 'item' | 'gst'>('sales');
  const [fromDate, setFromDate] = useState(() => {
    const d = new Date();
    d.setDate(1);
    return d.toISOString().split('T')[0];
  });
  const [toDate, setToDate] = useState(() => new Date().toISOString().split('T')[0]);

  const [salesData, setSalesData] = useState<any[]>([]);
  const [merchantData, setMerchantData] = useState<any[]>([]);
  const [itemData, setItemData] = useState<any[]>([]);
  const [gstData, setGstData] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const fetchReports = async () => {
    setLoading(true);
    try {
      if (tab === 'sales') {
        const data = await api.getSalesReport(fromDate, toDate);
        setSalesData(data);
      } else if (tab === 'merchant') {
        const data = await api.getMerchantWiseReport(fromDate, toDate);
        setMerchantData(data);
      } else if (tab === 'item') {
        const data = await api.getItemWiseReport(fromDate, toDate);
        setItemData(data);
      } else if (tab === 'gst') {
        const data = await api.getGSTReport(fromDate, toDate);
        setGstData(data);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReports();
  }, [tab, fromDate, toDate]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Financial & Tax Reports (रिपोर्ट)</h1>
          <p className="text-xs text-slate-400 mt-1">
            GSTR-1 tax filings, sales analytics, buyer-wise turnover, and fabric volume
          </p>
        </div>

        {/* Date Filter */}
        <div className="flex items-center gap-2 bg-slate-900/80 p-1.5 rounded-xl border border-slate-700/60">
          <Calendar className="h-3.5 w-3.5 text-slate-400 ml-2" />
          <input
            type="date"
            value={fromDate}
            onChange={(e) => setFromDate(e.target.value)}
            className="bg-transparent text-xs text-slate-200 focus:outline-none"
          />
          <span className="text-slate-500 text-xs">to</span>
          <input
            type="date"
            value={toDate}
            onChange={(e) => setToDate(e.target.value)}
            className="bg-transparent text-xs text-slate-200 focus:outline-none mr-2"
          />
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
        {[
          { key: 'sales', label: 'Daily Sales Report', icon: TrendingUp },
          { key: 'merchant', label: 'Merchant-Wise Turnover', icon: Receipt },
          { key: 'item', label: 'Item & Variant Volume', icon: Layers },
          { key: 'gst', label: 'GSTR-1 Tax Summary', icon: FileSpreadsheet },
        ].map((t) => {
          const Icon = t.icon;
          const isActive = tab === t.key;
          return (
            <button
              key={t.key}
              onClick={() => setTab(t.key as any)}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                isActive
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              <Icon className="h-3.5 w-3.5" />
              <span>{t.label}</span>
            </button>
          );
        })}
      </div>

      {/* Tab Content */}
      <div className="glass-panel rounded-2xl p-6 border border-slate-700/50">
        {loading ? (
          <div className="py-16 text-center text-slate-500 text-xs">
            <div className="h-6 w-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
            Loading report data...
          </div>
        ) : tab === 'sales' ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-800/60 text-slate-400 border-b border-slate-700">
                <tr>
                  <th className="py-3 px-4 font-semibold">Date</th>
                  <th className="py-3 px-4 font-semibold text-center">Invoices</th>
                  <th className="py-3 px-4 font-semibold text-right">Taxable (₹)</th>
                  <th className="py-3 px-4 font-semibold text-right">CGST (2.5%)</th>
                  <th className="py-3 px-4 font-semibold text-right">SGST (2.5%)</th>
                  <th className="py-3 px-4 font-semibold text-right">Total (₹)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800 text-slate-300">
                {salesData.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-slate-500">
                      No sales recorded in selected date range.
                    </td>
                  </tr>
                ) : (
                  salesData.map((row, idx) => (
                    <tr key={idx} className="hover:bg-slate-800/30 transition-colors">
                      <td className="py-3 px-4 text-white font-medium">{row.date}</td>
                      <td className="py-3 px-4 text-center">{row.invoices_count}</td>
                      <td className="py-3 px-4 text-right">₹{row.taxable_amount.toFixed(2)}</td>
                      <td className="py-3 px-4 text-right text-indigo-300">₹{row.cgst.toFixed(2)}</td>
                      <td className="py-3 px-4 text-right text-indigo-300">₹{row.sgst.toFixed(2)}</td>
                      <td className="py-3 px-4 text-right font-bold text-white">₹{row.total_amount.toFixed(2)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        ) : tab === 'merchant' ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-800/60 text-slate-400 border-b border-slate-700">
                <tr>
                  <th className="py-3 px-4 font-semibold">Merchant (व्यापारी)</th>
                  <th className="py-3 px-4 font-semibold">Phone</th>
                  <th className="py-3 px-4 font-semibold">GSTIN</th>
                  <th className="py-3 px-4 font-semibold text-right">Total Invoiced (₹)</th>
                  <th className="py-3 px-4 font-semibold text-right">Total Paid (₹)</th>
                  <th className="py-3 px-4 font-semibold text-right">Current Balance (₹)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800 text-slate-300">
                {merchantData.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-slate-500">
                      No merchant sales recorded in selected range.
                    </td>
                  </tr>
                ) : (
                  merchantData.map((m, idx) => (
                    <tr key={idx} className="hover:bg-slate-800/30 transition-colors">
                      <td className="py-3 px-4 font-semibold text-white">{m.merchant_name}</td>
                      <td className="py-3 px-4 text-slate-400">{m.phone || '—'}</td>
                      <td className="py-3 px-4 text-slate-400">{m.gstin || '—'}</td>
                      <td className="py-3 px-4 text-right font-medium">₹{m.total_invoiced.toFixed(2)}</td>
                      <td className="py-3 px-4 text-right text-emerald-400">₹{m.total_paid.toFixed(2)}</td>
                      <td className="py-3 px-4 text-right font-bold text-indigo-300">
                        ₹{m.current_balance.toFixed(2)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        ) : tab === 'item' ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-800/60 text-slate-400 border-b border-slate-700">
                <tr>
                  <th className="py-3 px-4 font-semibold">Item Name (कपड़ा)</th>
                  <th className="py-3 px-4 font-semibold text-center">Variant Size</th>
                  <th className="py-3 px-4 font-semibold">Unit</th>
                  <th className="py-3 px-4 font-semibold text-right">Total Quantity</th>
                  <th className="py-3 px-4 font-semibold text-right">Total Turnover (₹)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800 text-slate-300">
                {itemData.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-slate-500">
                      No item sales recorded in selected range.
                    </td>
                  </tr>
                ) : (
                  itemData.map((it, idx) => (
                    <tr key={idx} className="hover:bg-slate-800/30 transition-colors">
                      <td className="py-3 px-4 font-semibold text-white">{it.item_name}</td>
                      <td className="py-3 px-4 text-center font-bold text-indigo-300">{it.variant_size}</td>
                      <td className="py-3 px-4 text-slate-400 capitalize">{it.unit}</td>
                      <td className="py-3 px-4 text-right font-medium">{it.total_qty}</td>
                      <td className="py-3 px-4 text-right font-bold text-white">₹{it.total_amount.toFixed(2)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="p-4 rounded-xl bg-slate-800/50 border border-slate-700 text-center">
                <span className="text-xs text-slate-400">Active Invoices (GSTR-1)</span>
                <div className="text-2xl font-bold text-white mt-1">{gstData?.active_bills || 0}</div>
              </div>
              <div className="p-4 rounded-xl bg-slate-800/50 border border-slate-700 text-center">
                <span className="text-xs text-slate-400">Total Taxable Value</span>
                <div className="text-2xl font-bold text-indigo-300 mt-1">₹{gstData?.taxable_amount?.toFixed(2) || '0.00'}</div>
              </div>
              <div className="p-4 rounded-xl bg-slate-800/50 border border-slate-700 text-center">
                <span className="text-xs text-slate-400">Total GST Collected (5%)</span>
                <div className="text-2xl font-bold text-emerald-400 mt-1">₹{gstData?.total_tax?.toFixed(2) || '0.00'}</div>
              </div>
            </div>

            <div className="p-6 rounded-xl bg-slate-900 border border-slate-800 space-y-3 text-xs">
              <h3 className="font-bold text-sm text-white mb-2">Tax Breakdown Summary</h3>
              <div className="flex justify-between text-slate-400 py-1 border-b border-slate-800">
                <span>Central GST (CGST @ 2.5%):</span>
                <span className="font-semibold text-white">₹{gstData?.cgst?.toFixed(2) || '0.00'}</span>
              </div>
              <div className="flex justify-between text-slate-400 py-1 border-b border-slate-800">
                <span>State GST (SGST @ 2.5%):</span>
                <span className="font-semibold text-white">₹{gstData?.sgst?.toFixed(2) || '0.00'}</span>
              </div>
              <div className="flex justify-between text-slate-200 py-2 text-sm font-bold">
                <span>Grand Total (Invoice Gross):</span>
                <span className="text-emerald-400">₹{gstData?.grand_total?.toFixed(2) || '0.00'}</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
