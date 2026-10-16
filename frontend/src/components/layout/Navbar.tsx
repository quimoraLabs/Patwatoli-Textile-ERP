'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { authStorage, api } from '@/lib/api';
import { User } from '@/types';
import { usePwa } from '@/components/pwa/PwaProvider';
import {
  LogOut,
  User as UserIcon,
  Shield,
  Clock,
  Plus,
  KeyRound,
  X,
  CheckCircle2,
  Lock,
  Mail,
  Phone,
  Download,
  Menu,
} from 'lucide-react';
import Link from 'next/link';

interface NavbarProps {
  onOpenMobileSidebar?: () => void;
}

export default function Navbar({ onOpenMobileSidebar }: NavbarProps) {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [profileModalOpen, setProfileModalOpen] = useState(false);

  // Profile Edit State
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [updatingProfile, setUpdatingProfile] = useState(false);
  const [profileSuccess, setProfileSuccess] = useState<string | null>(null);
  const [profileError, setProfileError] = useState<string | null>(null);

  // Password Change State
  const [passwordModalOpen, setPasswordModalOpen] = useState(false);
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [updatingPassword, setUpdatingPassword] = useState(false);
  const [passwordSuccess, setPasswordSuccess] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);

  const { isInstallable, isInstalled, promptInstall } = usePwa();

  const [revokingDeletion, setRevokingDeletion] = useState(false);
  const [revokeSuccess, setRevokeSuccess] = useState<string | null>(null);

  useEffect(() => {
    const u = authStorage.getUser();
    setUser(u);
    if (u) {
      setName(u.name);
      setPhone(u.phone || '');
      api.getMe().then((fresh: User) => {
        setUser(fresh);
        authStorage.setUser(fresh);
      }).catch(() => {});
    }
  }, []);

  const handleRevokeDeletion = async () => {
    setRevokingDeletion(true);
    try {
      const res = await api.revokeMyDeletion();
      setUser(res);
      authStorage.setUser(res);
      setRevokeSuccess('Scheduled deletion revoked successfully. Your account is fully active!');
      setTimeout(() => setRevokeSuccess(null), 5000);
    } catch (err: any) {
      alert(err.message || 'Failed to revoke deletion');
    } finally {
      setRevokingDeletion(false);
    }
  };

  const handleLogout = async () => {
    try {
      await api.logout();
    } catch {
      authStorage.clear();
    }
    router.push('/login');
  };

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setUpdatingProfile(true);
    setProfileError(null);
    setProfileSuccess(null);
    try {
      const updated = await api.updateProfile({ name, phone });
      setUser(updated);
      setProfileSuccess('Profile updated successfully!');
      setTimeout(() => setProfileSuccess(null), 3000);
    } catch (err: any) {
      setProfileError(err.message || 'Failed to update profile');
    } finally {
      setUpdatingProfile(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError(null);
    setPasswordSuccess(null);

    if (newPassword !== confirmPassword) {
      setPasswordError('New passwords do not match');
      return;
    }

    if (newPassword.length < 6) {
      setPasswordError('Password must be at least 6 characters');
      return;
    }

    setUpdatingPassword(true);
    try {
      await api.changePassword({ old_password: oldPassword, new_password: newPassword });
      setPasswordSuccess('Password changed successfully!');
      setOldPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setTimeout(() => {
        setPasswordModalOpen(false);
        setPasswordSuccess(null);
      }, 2000);
    } catch (err: any) {
      setPasswordError(err.message || 'Failed to change password');
    } finally {
      setUpdatingPassword(false);
    }
  };

  return (
    <>
      <header className="h-16 border-b border-slate-700/50 bg-slate-900/60 backdrop-blur-md sticky top-0 z-20 px-3 sm:px-6 lg:px-8 flex items-center justify-between lg:ml-64">
        {/* Left Greeting & Mobile Toggle */}
        <div className="flex items-center gap-2 sm:gap-4">
          <button
            type="button"
            onClick={onOpenMobileSidebar}
            className="lg:hidden p-2 rounded-xl text-slate-300 hover:text-white hover:bg-slate-800 border border-slate-700/60 transition-colors cursor-pointer"
            title="Open Menu"
          >
            <Menu className="h-5 w-5" />
          </button>

          <div className="lg:hidden flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-indigo-500"></span>
            <span className="font-bold text-xs sm:text-sm text-white">Patwatoli ERP</span>
          </div>

          <div className="hidden sm:flex items-center gap-2 text-xs text-slate-400 bg-slate-800/60 px-3 py-1.5 rounded-lg border border-slate-700/40">
            <Clock className="h-3.5 w-3.5 text-indigo-400" />
            <span>{new Date().toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' })}</span>
          </div>
        </div>

        {/* Right Controls */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* PWA Install Button */}
          {isInstallable && !isInstalled && (
            <button
              type="button"
              onClick={promptInstall}
              title="Install Patwatoli ERP Desktop/Mobile App"
              className="flex items-center gap-1.5 bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 text-xs font-semibold px-2.5 sm:px-3 py-1.5 sm:py-2 rounded-lg transition-all cursor-pointer"
            >
              <Download className="h-3.5 w-3.5 text-indigo-400" />
              <span className="hidden md:inline">Install App</span>
            </button>
          )}

          <Link
            href="/invoices/new"
            className="flex items-center gap-1.5 sm:gap-2 bg-linear-to-r from-indigo-600 to-indigo-500 hover:from-indigo-500 hover:to-indigo-400 text-white text-xs font-semibold px-2.5 sm:px-3.5 py-1.5 sm:py-2 rounded-lg shadow-md shadow-indigo-600/20 transition-all cursor-pointer"
          >
            <Plus className="h-3.5 w-3.5" />
            <span className="hidden xs:inline sm:inline">New Bill</span>
          </Link>

          {/* User Card */}
          {user ? (
            <div className="flex items-center gap-2 sm:gap-3 pl-2 sm:pl-4 border-l border-slate-700/50">
              <button
                type="button"
                onClick={() => setProfileModalOpen(true)}
                className="text-right hover:opacity-80 transition-opacity cursor-pointer group max-w-22.5 sm:max-w-none"
                title="View & Edit Profile"
              >
                <div className="text-xs font-semibold text-slate-200 group-hover:text-indigo-300 transition-colors truncate">
                  {user.name}
                </div>
                <div className="hidden sm:flex text-[11px] text-indigo-400 capitalize items-center justify-end gap-1 font-medium">
                  <Shield className="h-3 w-3" />
                  {user.role.replace('_', ' ')}
                </div>
              </button>

              <button
                onClick={handleLogout}
                title="Logout"
                className="p-1.5 sm:p-2 rounded-lg hover:bg-rose-500/10 text-slate-400 hover:text-rose-400 border border-slate-700/50 transition-colors cursor-pointer"
              >
                <LogOut className="h-4 w-4" />
              </button>
            </div>
          ) : (
            <Link
              href="/login"
              className="flex items-center gap-1.5 sm:gap-2 text-xs text-indigo-400 hover:text-indigo-300 font-medium px-2.5 sm:px-3 py-1.5 rounded-lg border border-indigo-500/30 hover:bg-indigo-500/10 transition-colors"
            >
              <UserIcon className="h-3.5 w-3.5" />
              <span>Login</span>
            </Link>
          )}
        </div>
      </header>

      {/* Standby Deletion Alert Banner */}
      {user?.deletion_alert?.is_standby && (
        <div className="lg:ml-64 bg-amber-500/15 border-b border-amber-500/30 px-4 sm:px-8 py-3 flex flex-col sm:flex-row gap-2 sm:items-center justify-between text-xs text-amber-200">
          <div className="flex items-center gap-2.5">
            <span className="text-base">⚠️</span>
            <span>
              <strong>Security Alert:</strong> Your account is currently scheduled for deletion. Standby validity expires in{' '}
              <strong className="text-amber-100 font-bold">{user.deletion_alert.days_remaining} days</strong>.
              If this was unauthorized or you want to keep your account, you can revoke this deletion immediately.
            </span>
          </div>
          <button
            onClick={handleRevokeDeletion}
            disabled={revokingDeletion}
            className="px-3 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-lg transition-colors cursor-pointer disabled:opacity-50 text-[11px] shrink-0"
          >
            {revokingDeletion ? 'Revoking...' : 'Revoke Deletion & Keep Account'}
          </button>
        </div>
      )}

      {revokeSuccess && (
        <div className="ml-64 bg-emerald-500/15 border-b border-emerald-500/30 px-8 py-2.5 text-xs text-emerald-300 flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4 text-emerald-400" />
          <span>{revokeSuccess}</span>
        </div>
      )}

      {/* Profile & User Info Modal */}
      {profileModalOpen && user && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="glass-panel w-full max-w-md p-6 rounded-2xl border border-slate-700 shadow-2xl relative space-y-5">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-indigo-500/20 text-indigo-400 rounded-xl">
                  <UserIcon className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">User Profile (प्रोफ़ाइल)</h3>
                  <p className="text-[11px] text-slate-400">View and update your personal credentials</p>
                </div>
              </div>
              <button
                onClick={() => setProfileModalOpen(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {profileSuccess && (
              <div className="p-3 bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs rounded-xl flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
                <span>{profileSuccess}</span>
              </div>
            )}

            {profileError && (
              <div className="p-3 bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs rounded-xl">
                {profileError}
              </div>
            )}

            <form onSubmit={handleUpdateProfile} className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Full Name</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Email Address</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-500" />
                  <input
                    type="email"
                    disabled
                    value={user.email}
                    className="w-full pl-9 pr-3 py-2 bg-slate-900/50 border border-slate-800 rounded-xl text-xs text-slate-400 cursor-not-allowed"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Phone Number</label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-500" />
                    <input
                      type="text"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="e.g. 9876543210"
                      className="w-full pl-9 pr-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Role & Authority</label>
                  <div className="px-3 py-2 bg-slate-900/50 border border-slate-800 rounded-xl text-xs text-indigo-400 font-semibold capitalize flex items-center gap-1.5">
                    <Shield className="h-3.5 w-3.5" />
                    {user.role.replace('_', ' ')}
                  </div>
                </div>
              </div>

              <div className="pt-2 flex items-center justify-between gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setProfileModalOpen(false);
                    setPasswordModalOpen(true);
                  }}
                  className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs rounded-xl font-medium transition-colors flex items-center gap-1.5 cursor-pointer"
                >
                  <KeyRound className="h-3.5 w-3.5 text-indigo-400" />
                  <span>Change Password</span>
                </button>

                <button
                  type="submit"
                  disabled={updatingProfile}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold rounded-xl shadow-md shadow-indigo-600/20 transition-all cursor-pointer disabled:opacity-50"
                >
                  {updatingProfile ? 'Saving...' : 'Save Profile'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Change Password Modal */}
      {passwordModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="glass-panel w-full max-w-sm p-6 rounded-2xl border border-slate-700 shadow-2xl relative space-y-5">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-indigo-500/20 text-indigo-400 rounded-xl">
                  <KeyRound className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">Change Password</h3>
                  <p className="text-[11px] text-slate-400">Update your account login password</p>
                </div>
              </div>
              <button
                onClick={() => setPasswordModalOpen(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {passwordSuccess && (
              <div className="p-3 bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs rounded-xl flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
                <span>{passwordSuccess}</span>
              </div>
            )}

            {passwordError && (
              <div className="p-3 bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs rounded-xl">
                {passwordError}
              </div>
            )}

            <form onSubmit={handleChangePassword} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Current Password</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-500" />
                  <input
                    type="password"
                    required
                    value={oldPassword}
                    onChange={(e) => setOldPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full pl-9 pr-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">New Password</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-500" />
                  <input
                    type="password"
                    required
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Min 6 characters"
                    className="w-full pl-9 pr-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Confirm New Password</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-500" />
                  <input
                    type="password"
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Re-enter new password"
                    className="w-full pl-9 pr-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setPasswordModalOpen(false)}
                  className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs rounded-xl font-medium transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={updatingPassword}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold rounded-xl shadow-md shadow-indigo-600/20 transition-all cursor-pointer disabled:opacity-50"
                >
                  {updatingPassword ? 'Updating...' : 'Update Password'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
