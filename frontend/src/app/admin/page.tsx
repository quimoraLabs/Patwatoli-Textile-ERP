'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { Setting, AuditLog, Backup, Item, User } from '@/types';
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
  Users,
  Edit2,
  Pencil,
  X,
  UserPlus,
  Power,
} from 'lucide-react';

export default function AdminPage() {
  const [tab, setTab] = useState<'users' | 'items' | 'settings' | 'backups' | 'audit'>('users');

  // Users Management
  const [users, setUsers] = useState<User[]>([]);
  const [newUserOpen, setNewUserOpen] = useState(false);
  const [newUserData, setNewUserData] = useState({
    name: '',
    email: '',
    phone: '',
    password: '',
    role: 'accountant' as 'super_admin' | 'admin' | 'accountant' | 'viewer',
  });

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
  const [editingItem, setEditingItem] = useState<Item | null>(null);
  const [addVariantItemId, setAddVariantItemId] = useState<string | null>(null);
  const [newVariantData, setNewVariantData] = useState({ size: 'A', rate: 100 });
  const [editingVariant, setEditingVariant] = useState<{ id: string; size: string; rate: number } | null>(null);

  const [loading, setLoading] = useState(false);

  const fetchUsers = async () => {
    try {
      const res = await api.getUsers({ limit: 100 });
      setUsers(res.data);
    } catch (err: any) {
      console.error(err);
    }
  };

  const fetchSettings = async () => {
    try {
      const data = await api.getSettings();
      setSettings(data);
      const form: Record<string, string> = {};
      data.forEach((s) => (form[s.key] = s.value));
      setSettingsForm(form);
    } catch (err: any) {
      console.error(err);
    }
  };

  const fetchAudit = async () => {
    try {
      const res = await api.getAuditLogs({ limit: 50 });
      setAuditLogs(res.data);
    } catch (err: any) {
      console.error(err);
    }
  };

  const fetchBackups = async () => {
    try {
      const data = await api.getBackups();
      setBackups(data);
    } catch (err: any) {
      console.error(err);
    }
  };

  const fetchItems = async () => {
    try {
      const res = await api.getItems({ limit: 100 });
      setItems(res.data);
    } catch (err: any) {
      console.error(err);
    }
  };

  useEffect(() => {
    setLoading(true);
    if (tab === 'users') fetchUsers().finally(() => setLoading(false));
    if (tab === 'settings') fetchSettings().finally(() => setLoading(false));
    if (tab === 'audit') fetchAudit().finally(() => setLoading(false));
    if (tab === 'backups') fetchBackups().finally(() => setLoading(false));
    if (tab === 'items') fetchItems().finally(() => setLoading(false));
  }, [tab]);

  // User Actions
  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.createUser(newUserData);
      setNewUserOpen(false);
      setNewUserData({ name: '', email: '', phone: '', password: '', role: 'accountant' });
      fetchUsers();
    } catch (err: any) {
      alert(err.message || 'Failed to create user');
    }
  };

  const handleDeleteUser = async (userId: string, userName: string) => {
    if (
      !confirm(
        `Schedule user "${userName}" for temporary deletion?\n\n• The account will enter a 14-day standby period.\n• The user will receive an alert and has the right to revoke this deletion.\n• If remaining in standby after 14 days, the account will be deleted.`
      )
    )
      return;
    try {
      await api.deleteUser(userId);
      alert(`User "${userName}" has been scheduled for deletion with 14-day standby validity.`);
      fetchUsers();
    } catch (err: any) {
      alert(err.message || 'Failed to schedule user deletion');
    }
  };

  const handleRevokeUserDeletion = async (userId: string, userName: string) => {
    try {
      await api.revokeUserDeletion(userId);
      alert(`Scheduled deletion for "${userName}" has been revoked successfully. Account is now active.`);
      fetchUsers();
    } catch (err: any) {
      alert(err.message || 'Failed to revoke user deletion');
    }
  };

  const handlePermanentDeleteUser = async (userId: string, userName: string) => {
    if (!confirm(`Permanently and irreversibly delete user "${userName}"? This cannot be undone.`)) return;
    try {
      await api.permanentDeleteUser(userId);
      alert(`User "${userName}" has been permanently deleted.`);
      fetchUsers();
    } catch (err: any) {
      alert(err.message || 'Failed to permanently delete user');
    }
  };

  const handleToggleUserStatus = async (user: User) => {
    try {
      await api.updateUser(user.id, { is_active: !user.is_active });
      fetchUsers();
    } catch (err: any) {
      alert(err.message || 'Failed to update user status');
    }
  };

  // Settings Actions
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

  // Backup Actions
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

  // Item Actions
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

  const handleUpdateItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingItem) return;
    try {
      await api.updateItem(editingItem.id, { name: editingItem.name, unit: editingItem.unit });
      setEditingItem(null);
      fetchItems();
    } catch (err: any) {
      alert(err.message || 'Failed to update item');
    }
  };

  const handleDeleteItem = async (itemId: string, itemName: string) => {
    if (!confirm(`Are you sure you want to delete "${itemName}"?`)) return;
    try {
      await api.deleteItem(itemId);
      fetchItems();
    } catch (err: any) {
      alert(err.message || 'Failed to delete item');
    }
  };

  const handleAddVariant = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!addVariantItemId) return;
    try {
      await api.addVariant(addVariantItemId, newVariantData);
      setAddVariantItemId(null);
      setNewVariantData({ size: 'A', rate: 100 });
      fetchItems();
    } catch (err: any) {
      alert(err.message || 'Failed to add variant');
    }
  };

  const handleUpdateVariantRate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingVariant) return;
    try {
      await api.updateVariant(editingVariant.id, { rate: editingVariant.rate });
      setEditingVariant(null);
      fetchItems();
    } catch (err: any) {
      alert(err.message || 'Failed to update variant rate');
    }
  };

  const handleDeleteVariant = async (variantId: string) => {
    if (!confirm('Are you sure you want to delete this size variant?')) return;
    try {
      await api.deleteVariant(variantId);
      fetchItems();
    } catch (err: any) {
      alert(err.message || 'Failed to delete variant');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white tracking-tight">Super Admin Control Panel</h1>
        <p className="text-xs text-slate-400 mt-1">
          User access control, item pricing master, database snapshots & security audit trails
        </p>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-800 pb-3 overflow-x-auto">
        {[
          { key: 'users', label: 'User Accounts & RBAC', icon: Users },
          { key: 'items', label: 'Item & Variant Master', icon: Layers },
          { key: 'settings', label: 'Company & Tax Settings', icon: SettingsIcon },
          { key: 'backups', label: 'Database Snapshots', icon: Database },
          { key: 'audit', label: 'Audit Trail Logs', icon: History },
        ].map((t) => {
          const Icon = t.icon;
          const isActive = tab === t.key;
          return (
            <button
              key={t.key}
              onClick={() => setTab(t.key as any)}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
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
      <div className="glass-panel rounded-2xl p-4 sm:p-6 border border-slate-700/50">
        {loading ? (
          <div className="py-16 text-center text-slate-500 text-xs">Loading panel data...</div>
        ) : tab === 'users' ? (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row gap-3 sm:items-center justify-between">
              <div>
                <h2 className="text-sm font-bold text-white">System Users & Role-Based Permissions</h2>
                <p className="text-xs text-slate-400">
                  Manage staff credentials and assign roles (super_admin, admin, accountant, viewer)
                </p>
              </div>
              <button
                onClick={() => setNewUserOpen(true)}
                className="flex items-center gap-1.5 px-3.5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold shadow-md shadow-indigo-600/30 transition-colors cursor-pointer"
              >
                <UserPlus className="h-3.5 w-3.5" />
                <span>Add User</span>
              </button>
            </div>

            <div className="overflow-x-auto rounded-xl border border-slate-800 bg-slate-900/40">
              <table className="w-full text-left text-xs min-w-175">
                <thead className="bg-slate-800/80 text-slate-300 border-b border-slate-700">
                  <tr>
                    <th className="py-3 px-4 font-semibold">User / Name</th>
                    <th className="py-3 px-4 font-semibold">Email</th>
                    <th className="py-3 px-4 font-semibold">Phone</th>
                    <th className="py-3 px-4 font-semibold">Role</th>
                    <th className="py-3 px-4 font-semibold">Status</th>
                    <th className="py-3 px-4 font-semibold text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/70 text-slate-300">
                  {users.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-slate-500">
                        No users found.
                      </td>
                    </tr>
                  ) : (
                    users.map((u) => (
                      <tr key={u.id} className="hover:bg-slate-800/30 transition-colors">
                        <td className="py-3 px-4 font-medium text-white">{u.name}</td>
                        <td className="py-3 px-4 text-slate-300">{u.email}</td>
                        <td className="py-3 px-4 text-slate-400">{u.phone || '—'}</td>
                        <td className="py-3 px-4">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wider ${
                              u.role === 'super_admin'
                                ? 'bg-purple-500/15 text-purple-300 border border-purple-500/30'
                                : u.role === 'admin'
                                ? 'bg-indigo-500/15 text-indigo-300 border border-indigo-500/30'
                                : u.role === 'accountant'
                                ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30'
                                : 'bg-slate-700/50 text-slate-300 border border-slate-600'
                            }`}
                          >
                            {u.role.replace('_', ' ')}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          {u.deletion_status === 'standby_deletion' ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-amber-500/15 text-amber-300 border border-amber-500/25">
                              ⏳ Standby Deletion ({u.deletion_alert?.days_remaining ?? 14}d left)
                            </span>
                          ) : (
                            <span
                              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                                u.is_active
                                  ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/25'
                                  : 'bg-rose-500/15 text-rose-300 border border-rose-500/25'
                              }`}
                            >
                              {u.is_active ? 'Active' : 'Inactive'}
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            {u.deletion_status === 'standby_deletion' ? (
                              <>
                                <button
                                  onClick={() => handleRevokeUserDeletion(u.id, u.name)}
                                  title="Revoke scheduled deletion & reactivate user"
                                  className="px-2.5 py-1 rounded-lg bg-emerald-500/15 text-emerald-300 hover:bg-emerald-500/25 border border-emerald-500/30 text-[11px] font-semibold transition-colors cursor-pointer"
                                >
                                  Revoke Deletion
                                </button>
                                <button
                                  onClick={() => handlePermanentDeleteUser(u.id, u.name)}
                                  title="Permanently remove user"
                                  className="p-1.5 rounded-lg bg-rose-500/15 text-rose-300 hover:bg-rose-500/25 border border-rose-500/30 transition-colors cursor-pointer"
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </button>
                              </>
                            ) : (
                              <>
                                <button
                                  onClick={() => handleToggleUserStatus(u)}
                                  title={u.is_active ? 'Deactivate user' : 'Activate user'}
                                  className="p-1.5 rounded-lg bg-slate-800 text-slate-300 hover:text-white border border-slate-700 transition-colors cursor-pointer"
                                >
                                  <Power className="h-3.5 w-3.5" />
                                </button>
                                <button
                                  onClick={() => handleDeleteUser(u.id, u.name)}
                                  title="Schedule user for temporary deletion (14-day standby period)"
                                  className="p-1.5 rounded-lg bg-rose-500/15 text-rose-300 hover:bg-rose-500/25 border border-rose-500/30 transition-colors cursor-pointer"
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Create User Modal */}
            {newUserOpen && (
              <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
                <div className="glass-panel rounded-2xl p-6 border border-slate-700 max-w-md w-full shadow-2xl">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-bold text-base text-white">Create New User</h3>
                    <button
                      onClick={() => setNewUserOpen(false)}
                      className="text-slate-400 hover:text-white"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                  <form onSubmit={handleCreateUser} className="space-y-4">
                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1">Full Name</label>
                      <input
                        type="text"
                        required
                        value={newUserData.name}
                        onChange={(e) => setNewUserData({ ...newUserData, name: e.target.value })}
                        placeholder="e.g. Ramesh Kumar"
                        className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1">Email Address</label>
                      <input
                        type="email"
                        required
                        value={newUserData.email}
                        onChange={(e) => setNewUserData({ ...newUserData, email: e.target.value })}
                        placeholder="e.g. ramesh@patwatoli.in"
                        className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1">Phone Number (Optional)</label>
                      <input
                        type="text"
                        value={newUserData.phone}
                        onChange={(e) => setNewUserData({ ...newUserData, phone: e.target.value })}
                        placeholder="e.g. +91 9876543210"
                        className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1">Password</label>
                      <input
                        type="password"
                        required
                        minLength={6}
                        value={newUserData.password}
                        onChange={(e) => setNewUserData({ ...newUserData, password: e.target.value })}
                        placeholder="Minimum 6 characters"
                        className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1">Role & Permissions</label>
                      <select
                        value={newUserData.role}
                        onChange={(e) => setNewUserData({ ...newUserData, role: e.target.value as any })}
                        className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
                      >
                        <option value="accountant">Accountant (Invoices, Khaata & Payments)</option>
                        <option value="viewer">Viewer (Read-only access)</option>
                        <option value="admin">Admin (Operational management)</option>
                        <option value="super_admin">Super Admin (Full control)</option>
                      </select>
                    </div>

                    <div className="flex justify-end gap-3 pt-2">
                      <button
                        type="button"
                        onClick={() => setNewUserOpen(false)}
                        className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white bg-slate-800 transition-colors"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        className="px-4 py-2 rounded-xl text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 transition-colors"
                      >
                        Create User
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            )}


          </div>
        ) : tab === 'items' ? (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row gap-3 sm:items-center justify-between">
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

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {items.map((item) => (
                <div key={item.id} className="p-4 rounded-xl bg-slate-800/40 border border-slate-700/50 space-y-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="text-sm font-bold text-white">{item.name}</h3>
                      <span className="text-[11px] text-slate-400 capitalize">Unit: {item.unit}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setEditingItem(item)}
                        title="Edit Item"
                        className="p-1.5 rounded-lg bg-slate-800 text-indigo-300 hover:text-white border border-slate-700 transition-colors cursor-pointer"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                      <button
                        onClick={() => handleDeleteItem(item.id, item.name)}
                        title="Delete Item"
                        className="p-1.5 rounded-lg bg-rose-500/15 text-rose-300 hover:bg-rose-500/25 border border-rose-500/30 transition-colors cursor-pointer"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>

                  <div className="space-y-2 pt-2 border-t border-slate-700/50 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-semibold text-slate-400 uppercase">Size Rates (₹):</span>
                      <button
                        onClick={() => setAddVariantItemId(item.id)}
                        className="text-[11px] text-indigo-400 hover:text-indigo-300 font-semibold flex items-center gap-1"
                      >
                        <Plus className="h-3 w-3" /> Add Size
                      </button>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {item.variants?.map((v) => (
                        <div
                          key={v.id}
                          className="flex items-center gap-2 px-2.5 py-1 rounded-lg bg-slate-900 border border-slate-700 text-slate-200 text-xs font-medium"
                        >
                          <span>
                            Size {v.size}: <strong className="text-indigo-400">₹{v.rate}</strong>
                          </span>
                          <button
                            onClick={() => setEditingVariant({ id: v.id, size: v.size, rate: v.rate })}
                            title="Edit Rate"
                            className="text-slate-400 hover:text-indigo-300 cursor-pointer"
                          >
                            <Pencil className="h-3 w-3" />
                          </button>
                          <button
                            onClick={() => handleDeleteVariant(v.id)}
                            title="Delete Size Variant"
                            className="text-slate-400 hover:text-rose-400 cursor-pointer"
                          >
                            <Trash2 className="h-3 w-3" />
                          </button>
                        </div>
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

            {/* Edit Item Modal */}
            {editingItem && (
              <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
                <div className="glass-panel rounded-2xl p-6 border border-slate-700 max-w-md w-full shadow-2xl">
                  <h3 className="font-bold text-base text-white mb-4">Edit Item: {editingItem.name}</h3>
                  <form onSubmit={handleUpdateItem} className="space-y-4">
                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1">Item Name</label>
                      <input
                        type="text"
                        required
                        value={editingItem.name}
                        onChange={(e) => setEditingItem({ ...editingItem, name: e.target.value })}
                        className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1">Unit</label>
                      <select
                        value={editingItem.unit}
                        onChange={(e) => setEditingItem({ ...editingItem, unit: e.target.value as any })}
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
                        onClick={() => setEditingItem(null)}
                        className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white bg-slate-800 transition-colors"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        className="px-4 py-2 rounded-xl text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 transition-colors"
                      >
                        Save Changes
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            )}

            {/* Add Variant Modal */}
            {addVariantItemId && (
              <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
                <div className="glass-panel rounded-2xl p-6 border border-slate-700 max-w-sm w-full shadow-2xl">
                  <h3 className="font-bold text-base text-white mb-4">Add Size Variant</h3>
                  <form onSubmit={handleAddVariant} className="space-y-4">
                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1">Size</label>
                      <select
                        value={newVariantData.size}
                        onChange={(e) => setNewVariantData({ ...newVariantData, size: e.target.value })}
                        className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
                      >
                        <option value="A">Size A</option>
                        <option value="AA">Size AA</option>
                        <option value="AAA">Size AAA</option>
                        <option value="K1">Size K1</option>
                        <option value="K2">Size K2</option>
                        <option value="K3">Size K3</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1">Rate (₹)</label>
                      <input
                        type="number"
                        min="0"
                        step="any"
                        required
                        value={newVariantData.rate}
                        onChange={(e) => setNewVariantData({ ...newVariantData, rate: parseFloat(e.target.value) || 0 })}
                        className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
                      />
                    </div>
                    <div className="flex justify-end gap-3 pt-2">
                      <button
                        type="button"
                        onClick={() => setAddVariantItemId(null)}
                        className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white bg-slate-800 transition-colors"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        className="px-4 py-2 rounded-xl text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 transition-colors"
                      >
                        Add Size
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            )}

            {/* Edit Variant Rate Modal */}
            {editingVariant && (
              <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
                <div className="glass-panel rounded-2xl p-6 border border-slate-700 max-w-sm w-full shadow-2xl">
                  <h3 className="font-bold text-base text-white mb-4">Edit Rate for Size {editingVariant.size}</h3>
                  <form onSubmit={handleUpdateVariantRate} className="space-y-4">
                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1">Rate (₹)</label>
                      <input
                        type="number"
                        min="0"
                        step="any"
                        required
                        value={editingVariant.rate}
                        onChange={(e) => setEditingVariant({ ...editingVariant, rate: parseFloat(e.target.value) || 0 })}
                        className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-slate-200 focus:outline-none focus:border-indigo-500 font-medium"
                      />
                    </div>
                    <div className="flex justify-end gap-3 pt-2">
                      <button
                        type="button"
                        onClick={() => setEditingVariant(null)}
                        className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white bg-slate-800 transition-colors"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        className="px-4 py-2 rounded-xl text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 transition-colors"
                      >
                        Save Rate
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            )}
          </div>
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
        ) : tab === 'backups' ? (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row gap-3 sm:items-center justify-between">
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
              <table className="w-full text-left text-xs min-w-137.5">
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
