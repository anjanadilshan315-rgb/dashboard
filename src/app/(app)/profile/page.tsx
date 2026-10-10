'use client';

import React, { useEffect, useState } from 'react';
import { Key, Loader2, Save, ShieldCheck, User } from 'lucide-react';
import { Card, CardHeader, FieldError, PageTitle, formatDate, inputClass, labelClass, primaryButton, useToast } from '@/components/ui';
import { api, ApiError, errorMessage, getSession, setSession, updateSessionUser, type Tokens } from '@/lib/api';
import { useSession } from '@/lib/session';
import type { StaffUser } from '@/lib/types';

export default function ProfilePage() {
  const toast = useToast();
  const { session } = useSession();
  const user = session?.user ?? null;

  const [profile, setProfile] = useState({ name: user?.name ?? '', phone: user?.phone ?? '' });
  const [profileErrors, setProfileErrors] = useState<Record<string, string>>({});
  const [savingProfile, setSavingProfile] = useState(false);
  const [passwords, setPasswords] = useState({ current: '', next: '', confirm: '' });
  const [passwordErrors, setPasswordErrors] = useState<Record<string, string>>({});
  const [savingPassword, setSavingPassword] = useState(false);

  const userId = user?.id;
  useEffect(() => {
    if (!userId) return;
    api<StaffUser>('/admin/auth/me')
      .then(({ data }) => setProfile({ name: data.name, phone: data.phone ?? '' }))
      .catch(() => undefined);
  }, [userId]);

  if (!user) return null;

  const saveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingProfile(true);
    setProfileErrors({});
    try {
      const { data } = await api<StaffUser>('/admin/auth/me', { method: 'PATCH', body: { name: profile.name.trim(), phone: profile.phone.trim() } });
      updateSessionUser(data);
      toast('Profile updated.');
    } catch (err) {
      if (err instanceof ApiError && err.code === 'VALIDATION_ERROR') setProfileErrors(err.fieldErrors());
      else toast(errorMessage(err), 'error');
    } finally {
      setSavingProfile(false);
    }
  };

  const changePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordErrors({});
    if (passwords.next !== passwords.confirm) {
      setPasswordErrors({ confirm: 'Passwords do not match.' });
      return;
    }
    setSavingPassword(true);
    try {
      const { data } = await api<{ tokens: Tokens }>('/admin/auth/me/password', {
        method: 'PATCH',
        body: { currentPassword: passwords.current, newPassword: passwords.next },
      });
      const current = getSession();
      if (current) setSession({ ...current, tokens: data.tokens });
      setPasswords({ current: '', next: '', confirm: '' });
      toast('Password changed. Other sessions have been signed out.');
    } catch (err) {
      if (err instanceof ApiError && err.code === 'VALIDATION_ERROR') {
        const f = err.fieldErrors();
        setPasswordErrors({ current: f.currentPassword, next: f.newPassword });
      } else if (err instanceof ApiError && err.code === 'INVALID_CURRENT_PASSWORD') {
        setPasswordErrors({ current: err.message });
      } else toast(errorMessage(err), 'error');
    } finally {
      setSavingPassword(false);
    }
  };

  return (
    <div className="max-w-4xl">
      <PageTitle title="My Profile" subtitle="Your account details and password." />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader icon={<User size={18} />} title="Account" />
          <form onSubmit={saveProfile} className="p-5 space-y-4">
            <div className="space-y-1.5">
              <label className={labelClass}>Name</label>
              <input required maxLength={150} value={profile.name} onChange={(e) => setProfile({ ...profile, name: e.target.value })} className={inputClass} />
              <FieldError message={profileErrors.name} />
            </div>
            <div className="space-y-1.5">
              <label className={labelClass}>Phone</label>
              <input type="tel" value={profile.phone} onChange={(e) => setProfile({ ...profile, phone: e.target.value })} className={inputClass} />
              <FieldError message={profileErrors.phone} />
            </div>
            <div className="space-y-1.5">
              <label className={labelClass}>E-mail</label>
              <input disabled value={user.email} className={inputClass} />
              <p className="text-[11px] text-gray-400">Ask an administrator to change your e-mail.</p>
            </div>
            <div className="flex items-center gap-2 text-xs text-gray-500">
              <ShieldCheck size={14} className="text-[#D4AF37]" /> {user.role === 'admin' ? 'Administrator — full access' : `${user.permissions.length} permission(s)`} · Last login{' '}
              {formatDate(user.lastLoginAt, true)}
            </div>
            <button type="submit" disabled={savingProfile} className={`${primaryButton} w-full`}>
              {savingProfile ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />} Save
            </button>
          </form>
        </Card>

        <Card>
          <CardHeader icon={<Key size={18} />} title="Change Password" />
          <form onSubmit={changePassword} className="p-5 space-y-4">
            {(
              [
                ['current', 'Current password', 'current-password'],
                ['next', 'New password', 'new-password'],
                ['confirm', 'Confirm new password', 'new-password'],
              ] as const
            ).map(([key, label, auto]) => (
              <div key={key} className="space-y-1.5">
                <label className={labelClass}>{label}</label>
                <input type="password" required autoComplete={auto} value={passwords[key]} onChange={(e) => setPasswords({ ...passwords, [key]: e.target.value })} className={inputClass} />
                <FieldError message={passwordErrors[key]} />
              </div>
            ))}
            <p className="text-[11px] text-gray-400">At least 8 characters with upper case, lower case and a number.</p>
            <button type="submit" disabled={savingPassword} className={`${primaryButton} w-full`}>
              {savingPassword ? <Loader2 size={16} className="animate-spin" /> : <Key size={16} />} Update password
            </button>
          </form>
        </Card>
      </div>
    </div>
  );
}
