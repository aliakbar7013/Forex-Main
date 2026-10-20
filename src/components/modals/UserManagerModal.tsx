'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { 
  X, 
  Users, 
  Plus, 
  Trash2, 
  Check, 
  Edit3, 
  Eye, 
  EyeOff, 
  ShieldCheck, 
  User, 
  Crown, 
  Clock, 
  Calendar,
  AlertCircle,
  ToggleLeft,
  ToggleRight,
  Layers,
  Sparkles,
  Loader2,
  Lock,
  Mail
} from 'lucide-react';
import { AppUser, UserDurationType } from '@/types';

interface UserManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUserRole?: string;
  currentUserId?: string;
}

const DURATION_OPTIONS: { id: UserDurationType; label: string; daysLabel: string }[] = [
  { id: '7_DAYS', label: '7 Days', daysLabel: '1 Week Access' },
  { id: '30_DAYS', label: '30 Days', daysLabel: '1 Month Access' },
  { id: '6_MONTHS', label: '6 Months', daysLabel: 'Half Year Access' },
  { id: '1_YEAR', label: '1 Year', daysLabel: '12 Months Access' },
  { id: 'LIFETIME', label: 'Lifetime', daysLabel: 'Permanent Access' }
];

const AVAILABLE_STRATEGIES = [
  { id: 'CBDR', name: 'CBDR 15m Strategy', desc: 'London 15m IPDA Range & Imbalance' },
  { id: 'STOP_HUNT', name: 'Stop Hunt 5m Model', desc: 'Asian Killzone 5m Liquidity Sweeps' },
  { id: 'NEW_YORK', name: 'New York Open (Indices)', desc: 'NAS100, US30, SPX500 Open Models' }
];

export function UserManagerModal({
  isOpen,
  onClose,
  currentUserRole = 'ADMIN',
  currentUserId
}: UserManagerModalProps) {
  const [users, setUsers] = useState<AppUser[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingUserId, setEditingUserId] = useState<string | null>(null);

  // Form Fields
  const [formEmail, setFormEmail] = useState('');
  const [formPassword, setFormPassword] = useState('');
  const [formName, setFormName] = useState('');
  const [formRole, setFormRole] = useState<'USER' | 'ADMIN'>('USER');
  const [formDuration, setFormDuration] = useState<UserDurationType>('30_DAYS');
  const [formStrategies, setFormStrategies] = useState<string[]>(['ALL']);
  const [showPassword, setShowPassword] = useState(false);

  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const fetchUsers = useCallback(async () => {
    try {
      setIsLoading(true);
      const res = await fetch('/api/admin/users', {
        headers: { 'x-user-id': currentUserId || '' }
      });
      const data = await res.json();
      if (data.success && Array.isArray(data.users)) {
        setUsers(data.users);
      }
    } catch (err) {
      console.error('Failed to load users', err);
    } finally {
      setIsLoading(false);
    }
  }, [currentUserId]);

  useEffect(() => {
    if (isOpen) {
      fetchUsers();
      setFeedback(null);
      setShowCreateForm(false);
      setEditingUserId(null);
    }
  }, [isOpen, fetchUsers]);

  const resetForm = () => {
    setFormEmail('');
    setFormPassword('');
    setFormName('');
    setFormRole('USER');
    setFormDuration('30_DAYS');
    setFormStrategies(['ALL']);
    setShowPassword(false);
    setEditingUserId(null);
    setShowCreateForm(false);
  };

  const handleStartEdit = (user: AppUser) => {
    setEditingUserId(user.id);
    setFormEmail(user.email);
    setFormPassword(''); // Leave blank unless changing
    setFormName(user.name);
    setFormRole(user.role);
    setFormDuration(user.duration_type);
    setFormStrategies(user.strategy_access || ['ALL']);
    setShowCreateForm(true);
    setFeedback(null);
  };

  const toggleStrategyInForm = (stratId: string) => {
    if (stratId === 'ALL') {
      setFormStrategies(['ALL']);
      return;
    }

    let next = formStrategies.filter(s => s !== 'ALL');
    if (next.includes(stratId)) {
      next = next.filter(s => s !== stratId);
    } else {
      next = [...next, stratId];
    }

    if (next.length === 0 || next.length === AVAILABLE_STRATEGIES.length) {
      setFormStrategies(['ALL']);
    } else {
      setFormStrategies(next);
    }
  };

  const handleSaveUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formEmail.trim()) {
      setFeedback({ type: 'error', message: 'Email address is required.' });
      return;
    }

    if (!editingUserId && (!formPassword || formPassword.length < 6)) {
      setFeedback({ type: 'error', message: 'Password must be at least 6 characters.' });
      return;
    }

    setIsSubmitting(true);
    setFeedback(null);

    try {
      if (editingUserId) {
        // Update user
        const res = await fetch('/api/admin/users', {
          method: 'PUT',
          headers: { 
            'Content-Type': 'application/json',
            'x-user-id': currentUserId || ''
          },
          body: JSON.stringify({
            id: editingUserId,
            name: formName.trim() || undefined,
            password: formPassword.trim() || undefined,
            role: formRole,
            strategy_access: formStrategies,
            duration_type: formDuration
          })
        });

        const data = await res.json();
        if (data.success) {
          setFeedback({ type: 'success', message: `User updated successfully!` });
          resetForm();
          await fetchUsers();
        } else {
          setFeedback({ type: 'error', message: data.error || 'Failed to update user.' });
        }
      } else {
        // Create user
        const res = await fetch('/api/admin/users', {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            'x-user-id': currentUserId || ''
          },
          body: JSON.stringify({
            email: formEmail.trim(),
            password: formPassword.trim(),
            name: formName.trim() || undefined,
            role: formRole,
            strategy_access: formStrategies,
            duration_type: formDuration
          })
        });

        const data = await res.json();
        if (data.success) {
          setFeedback({ type: 'success', message: `User ${formEmail} created successfully!` });
          resetForm();
          await fetchUsers();
        } else {
          setFeedback({ type: 'error', message: data.error || 'Failed to create user.' });
        }
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error communicating with server';
      setFeedback({ type: 'error', message: msg });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleStatus = async (user: AppUser) => {
    try {
      const nextActive = user.is_active === 1 ? 0 : 1;
      const res = await fetch('/api/admin/users', {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json',
          'x-user-id': currentUserId || ''
        },
        body: JSON.stringify({
          id: user.id,
          is_active: nextActive
        })
      });

      const data = await res.json();
      if (data.success) {
        setUsers(prev => prev.map(u => u.id === user.id ? { ...u, is_active: nextActive } : u));
      } else {
        setFeedback({ type: 'error', message: data.error || 'Failed to toggle status.' });
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to update user status';
      setFeedback({ type: 'error', message: msg });
    }
  };

  const handleDeleteUser = async (user: AppUser) => {
    if (!confirm(`Are you sure you want to delete user ${user.email}? This action cannot be undone.`)) return;

    try {
      const res = await fetch(`/api/admin/users?id=${user.id}`, {
        method: 'DELETE',
        headers: { 'x-user-id': currentUserId || '' }
      });

      const data = await res.json();
      if (data.success) {
        setUsers(prev => prev.filter(u => u.id !== user.id));
        setFeedback({ type: 'success', message: `User ${user.email} removed.` });
      } else {
        setFeedback({ type: 'error', message: data.error || 'Failed to delete user.' });
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to delete user';
      setFeedback({ type: 'error', message: msg });
    }
  };

  const formatRemainingDays = (user: AppUser) => {
    if (user.role === 'ADMIN' || !user.expires_at) {
      return { text: 'Lifetime Access', status: 'lifetime', color: 'text-emerald-700 bg-emerald-50 border-emerald-200' };
    }

    const diffMs = new Date(user.expires_at).getTime() - Date.now();
    const days = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

    if (days <= 0) {
      return { text: 'Expired', status: 'expired', color: 'text-rose-700 bg-rose-50 border-rose-200' };
    }
    if (days <= 3) {
      return { text: `${days} Days Left (Expiring Soon)`, status: 'warning', color: 'text-amber-800 bg-amber-50 border-amber-300' };
    }
    return { text: `${days} Days Left`, status: 'active', color: 'text-blue-700 bg-blue-50 border-blue-200' };
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-4xl bg-white border border-slate-200 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        
        {/* Modal Header */}
        <div className="p-4 sm:p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/80">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-blue-600 text-white flex items-center justify-center shadow-md shadow-blue-500/20">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-slate-900 flex items-center gap-2">
                <span>Trader Access &amp; Strategy Permissions</span>
                <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 border border-blue-200">
                  Admin Panel
                </span>
              </h2>
              <p className="text-xs text-slate-500 font-medium">
                Create user accounts, set access duration (7 days, 30 days, 6 months), and assign strategy permissions.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Content Scrollable Area */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-5 flex-1">
          
          {/* Feedback Banner */}
          {feedback && (
            <div className={`p-3.5 rounded-2xl text-xs font-semibold flex items-center justify-between gap-2 animate-in fade-in ${
              feedback.type === 'success' 
                ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' 
                : 'bg-rose-50 text-rose-800 border border-rose-200'
            }`}>
              <div className="flex items-center gap-2">
                {feedback.type === 'success' ? <Check className="w-4 h-4 text-emerald-600 shrink-0" /> : <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />}
                <span>{feedback.message}</span>
              </div>
              <button type="button" onClick={() => setFeedback(null)} className="p-1 hover:opacity-75">
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {/* Action Header: Create User Button & Stats */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50 border border-slate-200/80 rounded-2xl p-3 sm:p-4">
            <div className="flex items-center gap-4 text-xs font-medium text-slate-600">
              <span className="flex items-center gap-1.5 font-bold text-slate-900">
                <Users className="w-4 h-4 text-blue-600" />
                <span>{users.length} Registered Traders</span>
              </span>
              <span className="text-slate-300">•</span>
              <span className="text-emerald-700 font-bold">
                {users.filter(u => u.is_active === 1).length} Active
              </span>
            </div>

            <button
              type="button"
              onClick={() => {
                if (showCreateForm && !editingUserId) {
                  setShowCreateForm(false);
                } else {
                  resetForm();
                  setShowCreateForm(true);
                }
              }}
              className="flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 active:scale-[0.99] text-white font-bold text-xs shadow-xs transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4 stroke-[2.5]" />
              <span>{showCreateForm && !editingUserId ? 'Cancel' : 'Create New Trader'}</span>
            </button>
          </div>

          {/* User Creation / Editing Drawer Form */}
          {showCreateForm && (
            <form onSubmit={handleSaveUser} className="p-4 sm:p-5 rounded-2xl bg-blue-50/50 border border-blue-200/80 space-y-4 animate-in fade-in slide-in-from-top-2">
              <div className="flex items-center justify-between border-b border-blue-100 pb-2">
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <User className="w-4 h-4 text-blue-600" />
                  <span>{editingUserId ? `Edit Account: ${formEmail}` : 'Create New Trader Account'}</span>
                </h3>
                <span className="text-[11px] text-blue-700 font-medium">
                  Set permissions, duration &amp; strategy access
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                {/* Email */}
                <div className="space-y-1">
                  <label className="font-bold text-slate-700">Trader Email ID *</label>
                  <div className="relative">
                    <Mail className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="email"
                      required
                      disabled={Boolean(editingUserId)}
                      value={formEmail}
                      onChange={(e) => setFormEmail(e.target.value)}
                      placeholder="trader@gmail.com"
                      className="w-full bg-white border border-slate-300 rounded-xl pl-9 pr-3 py-2 text-slate-900 font-mono text-xs focus:outline-none focus:border-blue-600 disabled:bg-slate-100 disabled:text-slate-500"
                    />
                  </div>
                </div>

                {/* Trader Name */}
                <div className="space-y-1">
                  <label className="font-bold text-slate-700">Trader Name / Label</label>
                  <input
                    type="text"
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    placeholder="e.g. John Doe"
                    className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-slate-900 text-xs focus:outline-none focus:border-blue-600"
                  />
                </div>

                {/* Password with View Toggle */}
                <div className="space-y-1">
                  <label className="font-bold text-slate-700">
                    {editingUserId ? 'Password (leave blank to keep current)' : 'Account Password *'}
                  </label>
                  <div className="relative">
                    <Lock className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required={!editingUserId}
                      value={formPassword}
                      onChange={(e) => setFormPassword(e.target.value)}
                      placeholder={editingUserId ? '•••••••• (unchanged)' : 'Enter secure password...'}
                      className="w-full bg-white border border-slate-300 rounded-xl pl-9 pr-9 py-2 text-slate-900 font-mono text-xs focus:outline-none focus:border-blue-600"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 p-0.5"
                    >
                      {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>

                {/* Role */}
                <div className="space-y-1">
                  <label className="font-bold text-slate-700">System Role</label>
                  <select
                    value={formRole}
                    onChange={(e) => setFormRole(e.target.value as 'USER' | 'ADMIN')}
                    className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-slate-900 text-xs font-semibold focus:outline-none focus:border-blue-600 cursor-pointer"
                  >
                    <option value="USER">Trader (Scoped Strategy Access)</option>
                    <option value="ADMIN">Administrator (Full Master Privileges)</option>
                  </select>
                </div>
              </div>

              {/* Access Duration Selection */}
              <div className="space-y-2 pt-1 border-t border-blue-100">
                <label className="block text-xs font-bold text-slate-800">
                  Subscription Validity Period (Access Duration)
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                  {DURATION_OPTIONS.map(opt => (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => setFormDuration(opt.id)}
                      className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                        formDuration === opt.id
                          ? 'bg-blue-600 text-white border-blue-700 shadow-sm'
                          : 'bg-white hover:bg-slate-50 text-slate-800 border-slate-200'
                      }`}
                    >
                      <span className="block font-bold text-xs">{opt.label}</span>
                      <span className={`block text-[10px] mt-0.5 ${formDuration === opt.id ? 'text-blue-100' : 'text-slate-500'}`}>
                        {opt.daysLabel}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Strategy Access Permission */}
              <div className="space-y-2 pt-1 border-t border-blue-100">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-bold text-slate-800">
                    Strategy Permissions (Assign Individual or All)
                  </label>
                  <button
                    type="button"
                    onClick={() => setFormStrategies(['ALL'])}
                    className="text-[11px] font-bold text-blue-600 hover:text-blue-800 underline cursor-pointer"
                  >
                    Grant All 3 Strategies
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  {AVAILABLE_STRATEGIES.map(strat => {
                    const isSelected = formStrategies.includes('ALL') || formStrategies.includes(strat.id);
                    return (
                      <button
                        key={strat.id}
                        type="button"
                        onClick={() => toggleStrategyInForm(strat.id)}
                        className={`p-3 rounded-xl border text-left transition-all cursor-pointer flex items-start gap-2.5 ${
                          isSelected
                            ? 'bg-white border-blue-500 ring-2 ring-blue-500/20 text-slate-900 shadow-xs'
                            : 'bg-white/60 border-slate-200 text-slate-500 hover:border-slate-300'
                        }`}
                      >
                        <div className={`w-4 h-4 rounded mt-0.5 flex items-center justify-center shrink-0 border ${
                          isSelected ? 'bg-blue-600 border-blue-600 text-white' : 'border-slate-300 bg-white'
                        }`}>
                          {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                        </div>
                        <div>
                          <span className="font-bold text-xs block text-slate-900">{strat.name}</span>
                          <span className="text-[10px] text-slate-500 block leading-tight mt-0.5">{strat.desc}</span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Form Buttons */}
              <div className="flex items-center justify-end gap-2 pt-2 border-t border-blue-100">
                <button
                  type="button"
                  onClick={resetForm}
                  className="px-4 py-2 rounded-xl text-slate-600 hover:bg-slate-200 text-xs font-semibold transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs shadow-md shadow-blue-500/20 flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-50"
                >
                  {isSubmitting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                  <span>{editingUserId ? 'Save Changes' : 'Create Trader Account'}</span>
                </button>
              </div>
            </form>
          )}

          {/* User List Table */}
          <div className="rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-600 font-bold uppercase tracking-wider text-[10px] border-b border-slate-200">
                  <tr>
                    <th className="py-3 px-4">Trader Account</th>
                    <th className="py-3 px-4">Role</th>
                    <th className="py-3 px-4">Strategy Access</th>
                    <th className="py-3 px-4">Duration &amp; Expiry</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-sans">
                  {isLoading ? (
                    <tr>
                      <td colSpan={6} className="py-12 text-center text-slate-400">
                        <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2 text-blue-600" />
                        <span>Loading trader accounts...</span>
                      </td>
                    </tr>
                  ) : users.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-slate-500">
                        No registered users found. Click &quot;Create New Trader&quot; above to add one.
                      </td>
                    </tr>
                  ) : (
                    users.map(user => {
                      const remaining = formatRemainingDays(user);
                      const isMaster = user.email === 'admin@forex.com';

                      return (
                        <tr key={user.id} className="hover:bg-slate-50/80 transition-colors">
                          
                          {/* Trader Account */}
                          <td className="py-3.5 px-4 whitespace-nowrap">
                            <div className="flex items-center gap-2">
                              <div className="w-7 h-7 rounded-lg bg-slate-100 border border-slate-200 flex items-center justify-center font-bold text-slate-700 text-xs shrink-0">
                                {user.name ? user.name[0].toUpperCase() : 'U'}
                              </div>
                              <div>
                                <div className="font-bold text-slate-900 font-mono text-xs flex items-center gap-1.5">
                                  <span>{user.email}</span>
                                  {isMaster && (
                                    <span className="px-1.5 py-0.2 rounded text-[8px] font-black bg-amber-100 text-amber-900 border border-amber-300">
                                      OWNER
                                    </span>
                                  )}
                                </div>
                                <div className="text-[11px] text-slate-500 font-medium">
                                  {user.name}
                                </div>
                              </div>
                            </div>
                          </td>

                          {/* Role */}
                          <td className="py-3.5 px-4 whitespace-nowrap">
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                              user.role === 'ADMIN'
                                ? 'bg-purple-50 text-purple-700 border-purple-200'
                                : 'bg-slate-100 text-slate-700 border-slate-200'
                            }`}>
                              {user.role}
                            </span>
                          </td>

                          {/* Strategy Access */}
                          <td className="py-3.5 px-4">
                            <div className="flex flex-wrap items-center gap-1">
                              {user.strategy_access?.includes('ALL') ? (
                                <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200 whitespace-nowrap">
                                  ⚡ All 3 Strategies
                                </span>
                              ) : (
                                user.strategy_access?.map(strat => (
                                  <span key={strat} className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-blue-50 text-blue-800 border border-blue-200 whitespace-nowrap">
                                    {strat === 'CBDR' ? 'CBDR 15m' : strat === 'STOP_HUNT' ? 'Stop Hunt 5m' : 'NY Indices'}
                                  </span>
                                ))
                              )}
                            </div>
                          </td>

                          {/* Duration & Expiry */}
                          <td className="py-3.5 px-4 whitespace-nowrap">
                            <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold border ${remaining.color}`}>
                              {remaining.text}
                            </span>
                            {user.expires_at && (
                              <div className="text-[10px] text-slate-400 font-mono mt-0.5">
                                Exp: {new Date(user.expires_at).toLocaleDateString()}
                              </div>
                            )}
                          </td>

                          {/* Status */}
                          <td className="py-3.5 px-4 whitespace-nowrap">
                            <button
                              type="button"
                              disabled={isMaster}
                              onClick={() => handleToggleStatus(user)}
                              className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border transition-colors ${
                                user.is_active === 1
                                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
                                  : 'bg-slate-100 text-slate-500 border-slate-200 hover:bg-slate-200'
                              } ${isMaster ? 'opacity-70 cursor-not-allowed' : 'cursor-pointer'}`}
                            >
                              <span className={`w-1.5 h-1.5 rounded-full ${user.is_active === 1 ? 'bg-emerald-500' : 'bg-slate-400'}`} />
                              <span>{user.is_active === 1 ? 'Active' : 'Disabled'}</span>
                            </button>
                          </td>

                          {/* Actions */}
                          <td className="py-3.5 px-4 whitespace-nowrap text-right">
                            <div className="flex items-center justify-end gap-1">
                              <button
                                type="button"
                                onClick={() => handleStartEdit(user)}
                                className="p-1.5 rounded-lg text-slate-500 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                                title="Edit user duration & strategies"
                              >
                                <Edit3 className="w-3.5 h-3.5" />
                              </button>
                              
                              {!isMaster && (
                                <button
                                  type="button"
                                  onClick={() => handleDeleteUser(user)}
                                  className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                                  title="Delete user"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </div>
                          </td>

                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>

        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-slate-100 bg-slate-50 flex items-center justify-between text-xs text-slate-500">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            <span>Encrypted Credentials • Duration Expiration Enforced on Login</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-medium text-xs shadow-xs transition-colors cursor-pointer"
          >
            Close Panel
          </button>
        </div>

      </div>
    </div>
  );
}
