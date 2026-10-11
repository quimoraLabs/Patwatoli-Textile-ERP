'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { Merchant, MerchantLedger } from '@/types';
import {
  Users,
  Plus,
  CreditCard,
  Search,
  BookOpen,
  ArrowUpRight,
  ArrowDownRight,
  CheckCircle,
  Phone,
  MapPin,
  Calendar,
} from 'lucide-react';

export default function PartyPage() {
  const [merchants, setMerchants] = useState<Merchant[]>([]);
  const [selectedMerchant, setSelectedMerchant] = useState<Merchant | null>(null);
  const [ledger, setLedger] = useState<MerchantLedger | null>(null);
  const [loading, setLoading] = useState(true);
  const [ledgerLoading, setLedgerLoading] = useState(false);
  const [search, setSearch] = useState('');

  // Modals
  const [createMerchantOpen, setCreateMerchantOpen] = useState(false);
  const [newMerchantData, setNewMerchantData] = useState({
    name: '',
    phone: '',
    address: '',
    gstin: '',
    opening_balance: 0,
  });

  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [paymentData, setPaymentData] = useState({
    amount: '',
    payment_mode: 'cash',
    payment_date: new Date().toISOString().split('T')[0],
  });

  const fetchMerchants = async () => {
    setLoading(true);
    try {
      const res = await api.getMerchants({ search: search || undefined, limit: 100 });
      setMerchants(res.data);
      if (res.data.length > 0 && !selectedMerchant) {
        setSelectedMerchant(res.data[0]);
      }
    } finally {
      setLoading(false);
    }
  };

  const fetchLedger = async (merchantId: string) => {
    setLedgerLoading(true);
    try {
      const res = await api.getMerchantLedger(merchantId);
      setLedger(res.data);
    } finally {
      setLedgerLoading(false);
    }
  };

  useEffect(() => {
    fetchMerchants();
  }, [search]);

  useEffect(() => {
    if (selectedMerchant) {
      fetchLedger(selectedMerchant.id);
    }
  }, [selectedMerchant]);

  const handleCreateMerchant = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const m = await api.createMerchant({
        name: newMerchantData.name,
        phone: newMerchantData.phone || undefined,
        address: newMerchantData.address || undefined,
        gstin: newMerchantData.gstin || undefined,
        opening_balance: Number(newMerchantData.opening_balance) || 0,
      });
      setCreateMerchantOpen(false);
      setNewMerchantData({ name: '', phone: '', address: '', gstin: '', opening_balance: 0 });
      fetchMerchants();
      setSelectedMerchant(m);
    } catch (err: any) {
      alert(err.message || 'Failed to create merchant');
    }
  };

  const handleRecordPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedMerchant) return;
    try {
      await api.createPayment({
        merchant_id: selectedMerchant.id,
        amount: parseFloat(paymentData.amount),
        payment_mode: paymentData.payment_mode,
        payment_date: paymentData.payment_date,
      });
      setPaymentModalOpen(false);
      setPaymentData({
        amount: '',
        payment_mode: 'cash',
        payment_date: new Date().toISOString().split('T')[0],
      });
      fetchMerchants();
      fetchLedger(selectedMerchant.id);
    } catch (err: any) {
      alert(err.message || 'Failed to record payment');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Parties & Khaata Ledger (व्यापारी एवं खाता)</h1>
          <p className="text-xs text-slate-400 mt-1">
            Merchant accounts, debit/credit transaction history and running Khaata statements
          </p>
        </div>
        <button
          onClick={() => setCreateMerchantOpen(true)}
          className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold shadow-lg shadow-indigo-600/30 transition-all cursor-pointer self-start"
        >
          <Plus className="h-4 w-4" />
          <span>Add Merchant</span>
        </button>
      </div>

      {/* Main 2-Column Split */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Merchant Directory (4 cols) */}
        <div className="lg:col-span-4 glass-panel rounded-2xl p-4 border border-slate-700/50 space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search merchants..."
              className="w-full pl-9 pr-3 py-1.5 bg-slate-900 border border-slate-700 rounded-xl text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
            />
          </div>

          <div className="space-y-2 max-h-[calc(100vh-280px)] overflow-y-auto pr-1">
            {merchants.length === 0 ? (
              <p className="text-xs text-slate-500 py-6 text-center">No merchants found</p>
            ) : (
              merchants.map((m) => {
                const isSelected = selectedMerchant?.id === m.id;
                return (
                  <div
                    key={m.id}
                    onClick={() => setSelectedMerchant(m)}
                    className={`p-3.5 rounded-xl border transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-indigo-600/20 border-indigo-500/50 shadow-md shadow-indigo-500/10'
                        : 'bg-slate-800/40 border-slate-700/40 hover:bg-slate-800/80'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="text-xs font-bold text-white">{m.name}</div>
                        {m.phone && (
                          <div className="text-[11px] text-slate-400 flex items-center gap-1 mt-0.5">
                            <Phone className="h-3 w-3" /> {m.phone}
                          </div>
                        )}
                      </div>
                      <span
                        className={`text-[11px] font-bold px-2 py-0.5 rounded-md ${
                          m.current_balance > 0
                            ? 'bg-amber-500/15 text-amber-300'
                            : m.current_balance < 0
                            ? 'bg-cyan-500/15 text-cyan-300'
                            : 'bg-slate-700/30 text-slate-400'
                        }`}
                      >
                        ₹{Math.abs(m.current_balance).toFixed(2)}
                      </span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Right Column: Active Khaata Ledger (8 cols) */}
        <div className="lg:col-span-8 glass-panel rounded-2xl p-6 border border-slate-700/50 space-y-6">
          {selectedMerchant ? (
            <>
              {/* Selected Merchant Summary Header */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-6 border-b border-slate-800 gap-4">
                <div>
                  <h2 className="text-lg font-bold text-white">{selectedMerchant.name}</h2>
                  <div className="flex flex-wrap items-center gap-4 text-xs text-slate-400 mt-1">
                    {selectedMerchant.phone && <span>Phone: {selectedMerchant.phone}</span>}
                    {selectedMerchant.gstin && <span>GSTIN: {selectedMerchant.gstin}</span>}
                    {selectedMerchant.address && <span>{selectedMerchant.address}</span>}
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <div className="text-[11px] text-slate-400 uppercase font-semibold">Current Balance</div>
                    <div
                      className={`text-xl font-bold ${
                        selectedMerchant.current_balance > 0
                          ? 'text-amber-400'
                          : selectedMerchant.current_balance < 0
                          ? 'text-cyan-400'
                          : 'text-emerald-400'
                      }`}
                    >
                      ₹{Math.abs(selectedMerchant.current_balance).toFixed(2)}{' '}
                      <span className="text-xs">
                        {selectedMerchant.current_balance > 0 ? '(Due / बाक़ी)' : selectedMerchant.current_balance < 0 ? '(Advance / जमा)' : '(Nil)'}
                      </span>
                    </div>
                  </div>

                  <button
                    onClick={() => setPaymentModalOpen(true)}
                    className="flex items-center gap-1.5 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-semibold shadow-lg shadow-emerald-600/30 transition-all cursor-pointer"
                  >
                    <CreditCard className="h-4 w-4" />
                    <span>Record Payment</span>
                  </button>
                </div>
              </div>

              {/* Ledger Entries Table */}
              <div className="space-y-3">
                <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
                  <BookOpen className="h-4 w-4 text-indigo-400" />
                  <span>Khaata Statement (खाता विवरण)</span>
                </h3>

                <div className="overflow-x-auto rounded-xl border border-slate-800">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-800/60 text-slate-400 border-b border-slate-700/50">
                      <tr>
                        <th className="py-2.5 px-3 font-semibold">Date</th>
                        <th className="py-2.5 px-3 font-semibold">Transaction Details</th>
                        <th className="py-2.5 px-3 font-semibold text-right">Debit (+)</th>
                        <th className="py-2.5 px-3 font-semibold text-right">Credit (-)</th>
                        <th className="py-2.5 px-3 font-semibold text-right">Running Balance</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800 text-slate-300">
                      {ledgerLoading ? (
                        <tr>
                          <td colSpan={5} className="py-8 text-center text-slate-500">
                            Loading ledger entries...
                          </td>
                        </tr>
                      ) : !ledger || ledger.entries.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="py-8 text-center text-slate-500">
                            No transactions recorded yet for this merchant.
                          </td>
                        </tr>
                      ) : (
                        ledger.entries.map((entry) => (
                          <tr key={entry.id} className="hover:bg-slate-800/30 transition-colors">
                            <td className="py-2.5 px-3 text-slate-400">{entry.entry_date}</td>
                            <td className="py-2.5 px-3 font-medium text-slate-200">
                              {entry.reference_text}
                            </td>
                            <td className="py-2.5 px-3 text-right font-medium text-amber-300">
                              {entry.debit > 0 ? `+₹${entry.debit.toFixed(2)}` : '—'}
                            </td>
                            <td className="py-2.5 px-3 text-right font-medium text-emerald-400">
                              {entry.credit > 0 ? `-₹${entry.credit.toFixed(2)}` : '—'}
                            </td>
                            <td className="py-2.5 px-3 text-right font-bold text-white">
                              ₹{entry.balance.toFixed(2)}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          ) : (
            <div className="py-24 text-center text-slate-500 text-xs">
              Select a merchant on the left to inspect their Khaata statement.
            </div>
          )}
        </div>
      </div>

      {/* Create Merchant Modal */}
      {createMerchantOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="glass-panel rounded-2xl p-6 border border-slate-700 max-w-md w-full shadow-2xl">
            <h3 className="font-bold text-base text-white mb-4">Add Merchant (व्यापारी जोड़ें)</h3>
            <form onSubmit={handleCreateMerchant} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Merchant Name (नाम) <span className="text-indigo-400">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={newMerchantData.name}
                  onChange={(e) => setNewMerchantData({ ...newMerchantData, name: e.target.value })}
                  placeholder="e.g. Shyam Sundar Textiles"
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Phone Number (फोन)</label>
                <input
                  type="text"
                  value={newMerchantData.phone}
                  onChange={(e) => setNewMerchantData({ ...newMerchantData, phone: e.target.value })}
                  placeholder="e.g. 9835012345"
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">GSTIN (Optional)</label>
                <input
                  type="text"
                  value={newMerchantData.gstin}
                  onChange={(e) => setNewMerchantData({ ...newMerchantData, gstin: e.target.value })}
                  placeholder="e.g. 10ABCDE1234F1Z5"
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Address / Town</label>
                <input
                  type="text"
                  value={newMerchantData.address}
                  onChange={(e) => setNewMerchantData({ ...newMerchantData, address: e.target.value })}
                  placeholder="e.g. Manpur Main Road, Gaya"
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Opening Balance (आरंभिक शेष - Positive for Due, Negative for Advance)
                </label>
                <input
                  type="number"
                  step="any"
                  value={newMerchantData.opening_balance}
                  onChange={(e) => setNewMerchantData({ ...newMerchantData, opening_balance: parseFloat(e.target.value) || 0 })}
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setCreateMerchantOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white bg-slate-800 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 transition-colors"
                >
                  Create Merchant
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Record Payment Modal */}
      {paymentModalOpen && selectedMerchant && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="glass-panel rounded-2xl p-6 border border-emerald-500/30 max-w-md w-full shadow-2xl">
            <h3 className="font-bold text-base text-white mb-2">Record Payment (भुगतान दर्ज करें)</h3>
            <p className="text-xs text-slate-400 mb-4">
              Recording payment for <strong className="text-white">{selectedMerchant.name}</strong>
            </p>

            <form onSubmit={handleRecordPayment} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Payment Amount (₹)</label>
                <input
                  type="number"
                  min="1"
                  step="any"
                  required
                  value={paymentData.amount}
                  onChange={(e) => setPaymentData({ ...paymentData, amount: e.target.value })}
                  placeholder="e.g. 5000"
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-slate-200 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Payment Mode</label>
                  <select
                    value={paymentData.payment_mode}
                    onChange={(e) => setPaymentData({ ...paymentData, payment_mode: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-slate-200 focus:outline-none focus:border-emerald-500"
                  >
                    <option value="cash">Cash (नकद)</option>
                    <option value="bank">Bank Transfer</option>
                    <option value="upi">UPI / QR</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Date</label>
                  <input
                    type="date"
                    required
                    value={paymentData.payment_date}
                    onChange={(e) => setPaymentData({ ...paymentData, payment_date: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-slate-200 focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setPaymentModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white bg-slate-800 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-500 transition-colors"
                >
                  Post to Khaata
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
