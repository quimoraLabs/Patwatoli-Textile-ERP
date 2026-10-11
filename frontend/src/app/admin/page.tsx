'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { Setting, AuditLog, Backup, Item } from '@/types';
import {
  ShieldCheck,
  Settings as SettingsIcon,
  Database,
  History,
  Download,
  Plus,
  Save,
  Trash2,
  Layers,
  Check,
} from 'lucide-react';

export default function AdminPage() {
  const [tab, setTab] = useState<'settings' | 'audit' | 'backups' | 'items'>('settings');

  // Settings
  const [settings, setSettings] = useState<Setting[]>([]);
  const [settingsForm, setSettingsForm] = useState<Record<string, string>>({});
  const [settingsSaved, setSettingsSaved] = useState(false);

  // Audit Logs
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);

  // Backups
  const [backups, setBackups] = useState<Backup[]>([]);
  const [backupLoading, setBackupLoading] = useState(false);

  // Items Master
  const [items, setItems] = useState<Item[]>([]);
  const [newItemOpen, setNewItemOpen] = useState(false);
  const [newItemData, setNewItemData] = useState({
    name: '',
    unit: 'piece',
    variants: [
      { size: 'A', rate: 120 },
      { size: 'AA', rate: 140 },
    ],
  });

  const [loading, setLoading] = useState(false);

  const fetchSettings = async () => {
    const data = await api.getSettings();
    setSettings(data);
    const form: Record<string, string> = {};
    data.forEach((s) => (form[s.key] = s.value));
    setSettingsForm(form);
  };

  const fetchAudit = async () => {
    const res = await api.getAuditLogs({ limit: 50 });
    setAuditLogs(res.data);
  };

  const fetchBackups = async () => {
    const data = await api.getBackups();
    setBackups(data);
  };

  const fetchItems = async () => {
    const res = await api.getItems({ limit: 100 });
    setItems(res.data);
  };

  useEffect(() => {
    setLoading(true);
    if (tab === 'settings') fetchSettings().finally(() => setLoading(false));
    if (tab === 'audit') fetchAudit().finally(() => setLoading(false));
    if (tab === 'backups') fetchBackups().finally(() => setLoading(false));
    if (tab === 'items') fetchItems().finally(() => setLoading(false));
  }, [tab]);

  const handleSettingsSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.updateSettings(settingsForm);
      setSettingsSaved(true);
      setTimeout(() => setSettingsSaved(false), 3000);
    } catch (err: any) {
      alert(err.message || 'Failed to update settings');
    }
  };

  const handleTriggerBackup = async () => {
    setBackupLoading(true);
    try {
      await api.triggerBackup();
      fetchBackups();
    } catch (err: any) {
      alert(err.message || 'Backup failed');
    } finally {
      setBackupLoading(false);
    }
  };

  const handleCreateItem = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.createItem(newItemData);
      setNewItemOpen(false);
      setNewItemData({
        name: '',
        unit: 'piece',
        variants: [
          { size: 'A', rate: 120 },
          { size: 'AA', rate: 140 },
        ],
      });
      fetchItems();
    } catch (err: any) {
      alert(err.message || 'Failed to create item');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white tracking-tight">Super Admin Control Panel</h1>
        <p className="text-xs text-slate-400 mt-1">
          Cluster configuration, item pricing master, database backups & security audit trails
        </p>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
        {[
          { key: 'settings', label: 'Company & Tax Settings', icon: SettingsIcon },
          { key: 'items', label: 'Item & Variant Pricing Master', icon: Layers },
          { key: 'backups', label: 'Database Snapshots', icon: Database },
          { key: 'audit', label: 'Audit Trail Logs', icon: History },
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

      {/* Tab Panes */}
      <div className="glass-panel rounded-2xl p-6 border border-slate-700/50">
        {loading ? (
          <div className="py-16 text-center text-slate-500 text-xs">Loading panel data...</div>
        ) : tab === 'settings' ? (
          <form onSubmit={handleSettingsSave} className="space-y-5 max-w-2xl">
            <h2 className="text-sm font-bold text-white mb-2">Business Configuration Defaults</h2>

            {settings.map((s) => (
              <div key={s.key}>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  {s.key} {s.description && <span className="text-slate-500 font-normal">({s.description})</span>}
                </label>
                <input
                  type="text"
                  value={settingsForm[s.key] || ''}
                  onChange={(e) => setSettingsForm({ ...settingsForm, [s.key]: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
                />
              </div>
            ))}

            <div className="flex items-center gap-3 pt-3">
              <button
                type="submit"
                className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold transition-colors cursor-pointer"
              >
                <Save className="h-3.5 w-3.5" />
                <span>Save Changes</span>
              </button>
              {settingsSaved && (
                <span className="text-xs text-emerald-400 flex items-center gap-1">
                  <Check className="h-3.5 w-3.5" /> Settings saved successfully
                </span>
              )}
            </div>
          </form>
        ) : tab === 'items' ? (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-sm font-bold text-white">Finished Goods & Size-Wise Variant Rates</h2>
                <p className="text-xs text-slate-400">Pre-configured pricing snapshot used when creating invoices</p>
              </div>
              <button
                onClick={() => setNewItemOpen(true)}
                className="flex items-center gap-1.5 px-3.5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold shadow-md shadow-indigo-600/30 transition-colors cursor-pointer"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>Add Item Master</span>
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {items.map((item) => (
                <div key={item.id} className="p-4 rounded-xl bg-slate-800/40 border border-slate-700/50 space-y-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="text-sm font-bold text-white">{item.name}</h3>
                      <span className="text-[11px] text-slate-400 capitalize">Unit: {item.unit}</span>
                    </div>
                  </div>

                  <div className="space-y-1.5 pt-2 border-t border-slate-700/50 text-xs">
                    <span className="text-[11px] font-semibold text-slate-400 uppercase">Size Rates (₹):</span>
                    <div className="flex flex-wrap gap-2">
                      {item.variants?.map((v) => (
                        <span
                          key={v.id}
                          className="px-2.5 py-1 rounded-lg bg-slate-900 border border-slate-700 text-slate-200 text-xs font-medium"
                        >
                          Size {v.size}: <strong className="text-indigo-400">₹{v.rate}</strong>
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Create Item Modal */}
            {newItemOpen && (
              <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
                <div className="glass-panel rounded-2xl p-6 border border-slate-700 max-w-md w-full shadow-2xl">
                  <h3 className="font-bold text-base text-white mb-4">Add Finished Goods Item</h3>
                  <form onSubmit={handleCreateItem} className="space-y-4">
                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1">Item Name</label>
                      <input
                        type="text"
                        required
                        value={newItemData.name}
                        onChange={(e) => setNewItemData({ ...newItemData, name: e.target.value })}
                        placeholder="e.g. Pure Cotton Gamcha"
                        className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1">Unit of Measurement</label>
                      <select
                        value={newItemData.unit}
                        onChange={(e) => setNewItemData({ ...newItemData, unit: e.target.value as any })}
                        className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
                      >
                        <option value="piece">Piece (पीस)</option>
                        <option value="chauka">Chauka (चौका)</option>
                        <option value="jod">Jod (जोड़)</option>
                        <option value="meter">Meter (मीटर)</option>
                      </select>
                    </div>

                    <div className="flex justify-end gap-3 pt-2">
                      <button
                        type="button"
                        onClick={() => setNewItemOpen(false)}
                        className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white bg-slate-800 transition-colors"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        className="px-4 py-2 rounded-xl text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 transition-colors"
                      >
                        Save Item
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            )}
          </div>
        ) : tab === 'backups' ? (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-sm font-bold text-white">PostgreSQL Database Snapshots</h2>
                <p className="text-xs text-slate-400">Export complete transactional state for local safekeeping</p>
              </div>
              <button
                onClick={handleTriggerBackup}
                disabled={backupLoading}
                className="flex items-center gap-1.5 px-3.5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold shadow-md shadow-indigo-600/30 transition-colors cursor-pointer disabled:opacity-50"
              >
                <Database className="h-3.5 w-3.5" />
                <span>{backupLoading ? 'Backing up...' : 'Trigger Backup Now'}</span>
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-800/60 text-slate-400 border-b border-slate-700">
                  <tr>
                    <th className="py-3 px-4 font-semibold">Snapshot File</th>
                    <th className="py-3 px-4 font-semibold">Size</th>
                    <th className="py-3 px-4 font-semibold">Status</th>
                    <th className="py-3 px-4 font-semibold text-right">Download</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800 text-slate-300">
                  {backups.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="py-8 text-center text-slate-500">
                        No backup files generated yet. Click &quot;Trigger Backup Now&quot; to export.
                      </td>
                    </tr>
                  ) : (
                    backups.map((b) => (
                      <tr key={b.id} className="hover:bg-slate-800/30 transition-colors">
                        <td className="py-3 px-4 font-semibold text-white">{b.filename}</td>
                        <td className="py-3 px-4 text-slate-400">{b.size_bytes} bytes</td>
                        <td className="py-3 px-4">
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/15 text-emerald-300">
                            {b.status}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right">
                          <a
                            href={api.getBackupDownloadUrl(b.id)}
                            className="inline-flex items-center gap-1 px-3 py-1 bg-slate-800 hover:bg-slate-700 text-indigo-400 rounded-lg font-medium border border-slate-700"
                          >
                            <Download className="h-3.5 w-3.5" />
                            <span>Download SQL</span>
                          </a>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <h2 className="text-sm font-bold text-white">System Audit Trail Records</h2>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-800/60 text-slate-400 border-b border-slate-700">
                  <tr>
                    <th className="py-3 px-4 font-semibold">Time</th>
                    <th className="py-3 px-4 font-semibold">User</th>
                    <th className="py-3 px-4 font-semibold">Action</th>
                    <th className="py-3 px-4 font-semibold">Module</th>
                    <th className="py-3 px-4 font-semibold">IP Address</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800 text-slate-300">
                  {auditLogs.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-8 text-center text-slate-500">
                        No audit logs found.
                      </td>
                    </tr>
                  ) : (
                    auditLogs.map((log) => (
                      <tr key={log.id} className="hover:bg-slate-800/30 transition-colors">
                        <td className="py-3 px-4 text-slate-400">{new Date(log.created_at).toLocaleString('en-IN')}</td>
                        <td className="py-3 px-4 font-medium text-white">{log.user_name || 'System / Guest'}</td>
                        <td className="py-3 px-4 capitalize">
                          <span className="font-semibold text-indigo-300">{log.action}</span>
                        </td>
                        <td className="py-3 px-4 text-slate-300">{log.module}</td>
                        <td className="py-3 px-4 text-slate-400">{log.ip_address || '—'}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
