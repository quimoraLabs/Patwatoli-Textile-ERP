'use client';

import { useState } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';
import { Layers, Mail, ArrowRight, ArrowLeft, KeyRound, CheckCircle2, Copy, Check } from 'lucide-react';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resetToken, setResetToken] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await api.forgotPassword(email);
      setResetToken(res.reset_token);
    } catch (err: any) {
      setError(err.message || 'Failed to request password reset');
    } finally {
      setLoading(false);
    }
  };

  const copyToken = () => {
    if (resetToken) {
      navigator.clipboard.writeText(resetToken);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-6 relative overflow-hidden bg-slate-950">
      {/* Background ambient lighting */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-indigo-600/20 rounded-full blur-3xl pointer-events-none"></div>
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-cyan-600/15 rounded-full blur-3xl pointer-events-none"></div>

      <div className="w-full max-w-md relative z-10">
        <div className="glass-panel rounded-2xl p-8 border border-slate-700/60 shadow-2xl">
          {/* Logo & Header */}
          <div className="text-center mb-6">
            <div className="h-12 w-12 rounded-2xl bg-linear-to-tr from-indigo-600 via-indigo-500 to-cyan-400 mx-auto flex items-center justify-center shadow-xl shadow-indigo-600/30 mb-3">
              <KeyRound className="h-6 w-6 text-white" />
            </div>
            <h2 className="text-xl font-bold text-white tracking-tight">Forgot Password</h2>
            <p className="text-xs text-slate-400 mt-1">
              Enter your registered email to receive a password reset authorization token
            </p>
          </div>

          {error && (
            <div className="mb-5 p-3 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
              <span>{error}</span>
            </div>
          )}

          {!resetToken ? (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">Registered Email</label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-3 h-4 w-4 text-slate-400" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="owner@patwatoli.example"
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-900/80 border border-slate-700 rounded-xl text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 px-4 bg-linear-to-r from-indigo-600 via-indigo-500 to-indigo-600 hover:opacity-95 text-white font-semibold rounded-xl text-xs shadow-lg shadow-indigo-600/30 flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-50"
              >
                {loading ? (
                  <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                ) : (
                  <>
                    <span>Generate Reset Token</span>
                    <ArrowRight className="h-4 w-4" />
                  </>
                )}
              </button>
            </form>
          ) : (
            <div className="space-y-4">
              <div className="p-3.5 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs flex items-start gap-2">
                <CheckCircle2 className="h-4 w-4 shrink-0 mt-0.5 text-emerald-400" />
                <div>
                  <p className="font-semibold">Reset Authorization Token Issued!</p>
                  <p className="text-[11px] text-emerald-400/90 mt-0.5">
                    Your password reset token has been generated. Use it below to set your new password.
                  </p>
                </div>
              </div>

              <div className="p-3 bg-slate-900 rounded-xl border border-slate-700/80">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-[11px] font-semibold text-slate-400">Authorization Token</span>
                  <button
                    onClick={copyToken}
                    className="text-[11px] text-indigo-400 hover:text-indigo-300 flex items-center gap-1 cursor-pointer"
                  >
                    {copied ? <Check className="h-3 w-3 text-emerald-400" /> : <Copy className="h-3 w-3" />}
                    <span>{copied ? 'Copied' : 'Copy'}</span>
                  </button>
                </div>
                <p className="text-xs font-mono text-slate-300 break-all select-all bg-slate-950 p-2 rounded-lg border border-slate-800">
                  {resetToken}
                </p>
              </div>

              <Link
                href={`/reset-password?token=${encodeURIComponent(resetToken)}`}
                className="w-full py-2.5 px-4 bg-linear-to-r from-indigo-600 to-indigo-500 hover:opacity-95 text-white font-semibold rounded-xl text-xs shadow-lg shadow-indigo-600/30 flex items-center justify-center gap-2 transition-all cursor-pointer text-center"
              >
                <span>Proceed to Reset Password</span>
                <ArrowRight className="h-4 w-4 inline" />
              </Link>
            </div>
          )}

          <div className="mt-6 pt-4 border-t border-slate-800 text-center">
            <Link
              href="/login"
              className="text-xs text-slate-400 hover:text-indigo-300 transition-colors inline-flex items-center gap-1.5 font-medium"
            >
              <ArrowLeft className="h-3.5 w-3.5" /> Back to Sign In
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
