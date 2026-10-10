'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, ClipboardList, Eye, Key, Loader2, Save, Trash2, User } from 'lucide-react';
import { RequirePermission } from '@/components/guard';
import {
  Card,
  CardHeader,
  EmptyRow,
  FieldError,
  Notice,
  Spinner,
  StatusBadge,
  dangerButton,
  formatDate,
  inputClass,
  labelClass,
  primaryButton,
  secondaryButton,
  smallButton,
  useToast,
} from '@/components/ui';
import { api, ApiError, errorMessage } from '@/lib/api';
import { can, useSession } from '@/lib/session';
import type { Customer, InvitationSummary } from '@/lib/types';

type CustomerDetail = Customer & { invitations: InvitationSummary[] };

function CustomerDetailContent() {
  const params = useParams<{ id: string }>();
  const id = Number(params.id);
  const router = useRouter();
  const toast = useToast();
  const { session } = useSession();
  const user = session?.user ?? null;
  const canUpdate = can(user, 'customers.update');

  const [customer, setCustomer] = useState<CustomerDetail | null>(null);
  const [form, setForm] = useState({ firstName: '', lastName: '', email: '', phone: '' });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loadError, setLoadError] = useState('');
  const [saving, setSaving] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [resetting, setResetting] = useState(false);

  const apply = (c: CustomerDetail) => {
    setCustomer(c);
    setForm({ firstName: c.firstName, lastName: c.lastName, email: c.email, phone: c.phone });
  };

  useEffect(() => {
    let alive = true;
    api<CustomerDetail>(`/admin/customers/${id}`)
      .then(({ data }) => {
        if (!alive) return;
        setCustomer(data);
        setForm({ firstName: data.firstName, lastName: data.lastName, email: data.email, phone: data.phone });
      })
      .catch((e) => alive && setLoadError(e instanceof ApiError && e.status === 404 ? 'Customer not found.' : errorMessage(e)));
    return () => {
      alive = false;
    };
  }, [id]);

  if (loadError) {
    return (
      <div className="max-w-xl">
        <Notice tone="error">{loadError}</Notice>
        <Link href="/customers" className={`${secondaryButton} mt-4`}>
          <ArrowLeft size={16} /> Back to customers
        </Link>
      </div>
    );
  }
  if (!customer) return <Spinner />;

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setErrors({});
    try {
      const { data } = await api<Customer>(`/admin/customers/${id}`, {
        method: 'PATCH',
        body: { firstName: form.firstName.trim(), lastName: form.lastName.trim(), email: form.email.trim(), phone: form.phone.trim() },
      });
      apply({ ...data, invitations: customer.invitations });
      toast('Customer updated.');
    } catch (err) {
      if (err instanceof ApiError && err.code === 'VALIDATION_ERROR') setErrors(err.fieldErrors());
      else if (err instanceof ApiError && err.code === 'EMAIL_TAKEN') setErrors({ email: err.message });
      else toast(errorMessage(err), 'error');
    } finally {
      setSaving(false);
    }
  };

  const toggleActive = async () => {
    if (!confirm(`${customer.isActive ? 'Deactivate' : 'Activate'} this account?`)) return;
    try {
      const { data } = await api<Customer>(`/admin/customers/${id}`, { method: 'PATCH', body: { isActive: !customer.isActive } });
      apply({ ...data, invitations: customer.invitations });
      toast(data.isActive ? 'Account activated.' : 'Account deactivated and signed out.');
    } catch (err) {
      toast(errorMessage(err), 'error');
    }
  };

  const resetPassword = async () => {
    setResetting(true);
    setPasswordError('');
    try {
      await api(`/admin/customers/${id}/password`, { method: 'PATCH', body: { newPassword } });
      setNewPassword('');
      toast('Password reset. Share the new password with the customer.');
    } catch (err) {
      setPasswordError(err instanceof ApiError && err.code === 'VALIDATION_ERROR' ? err.fieldErrors().newPassword ?? errorMessage(err) : errorMessage(err));
    } finally {
      setResetting(false);
    }
  };

  const remove = async () => {
    if (!confirm(`Delete ${customer.fullName}? All invitations, guests and photos will be deleted. This cannot be undone.`)) return;
    try {
      await api(`/admin/customers/${id}`, { method: 'DELETE' });
      toast('Customer deleted.');
      router.replace('/customers');
    } catch (err) {
      toast(errorMessage(err), 'error');
    }
  };

  const field = (key: keyof typeof form, label: string, type = 'text') => (
    <div className="space-y-1.5">
      <label className={labelClass}>{label}</label>
      <input type={type} required disabled={!canUpdate} value={form[key]} onChange={(e) => setForm({ ...form, [key]: e.target.value })} className={inputClass} />
      <FieldError message={errors[key]} />
    </div>
  );

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8 mt-12 md:mt-0">
        <div className="flex items-center gap-4">
          <Link href="/customers" className="p-2 bg-white border border-gray-200 rounded-full text-gray-500 hover:bg-gray-50 shadow-sm" aria-label="Back">
            <ArrowLeft size={20} />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-[#4A3428] font-playfair">{customer.fullName}</h1>
            <p className="text-sm text-gray-500">
              Joined {formatDate(customer.createdAt)} · Last login {customer.lastLoginAt ? formatDate(customer.lastLoginAt, true) : 'never'}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          {canUpdate && (
            <button onClick={toggleActive} className={secondaryButton}>
              {customer.isActive ? 'Deactivate' : 'Activate'}
            </button>
          )}
          {can(user, 'customers.delete') && (
            <button onClick={remove} className={dangerButton}>
              <Trash2 size={16} /> Delete
            </button>
          )}
        </div>
      </div>

      {!customer.isActive && (
        <div className="mb-6">
          <Notice tone="warning">This account is deactivated — the customer cannot log in.</Notice>
        </div>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
        <div className="xl:col-span-4 space-y-6">
          <Card>
            <CardHeader icon={<User size={18} />} title="Account Information" />
            <form onSubmit={save} className="p-5 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                {field('firstName', 'First name')}
                {field('lastName', 'Last name')}
              </div>
              {field('email', 'E-mail', 'email')}
              {field('phone', 'Phone', 'tel')}
              {canUpdate && (
                <button type="submit" disabled={saving} className={`${primaryButton} w-full`}>
                  {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />} Save changes
                </button>
              )}
            </form>
          </Card>

          {canUpdate && (
            <Card className="border-red-100">
              <CardHeader icon={<Key size={18} />} title="Reset Password" />
              <div className="p-5 space-y-3">
                <p className="text-xs text-gray-500">Sets a new password and signs the customer out everywhere. Share the new password with them.</p>
                <input type="text" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="New password" className={inputClass} />
                <FieldError message={passwordError} />
                <button onClick={resetPassword} disabled={resetting || newPassword.length < 8} className={`${dangerButton} w-full`}>
                  {resetting ? 'Applying…' : 'Force password reset'}
                </button>
              </div>
            </Card>
          )}
        </div>

        <div className="xl:col-span-8">
          <Card className="overflow-hidden">
            <CardHeader icon={<ClipboardList size={18} />} title={`Invitations (${customer.invitations.length})`} />
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse whitespace-nowrap">
                <thead>
                  <tr className="bg-gray-50/50 text-gray-400 text-[10px] font-bold uppercase tracking-wider">
                    <th className="px-6 py-4">Reference</th>
                    <th className="px-6 py-4">Couple</th>
                    <th className="px-6 py-4">Template</th>
                    <th className="px-6 py-4">Wedding</th>
                    <th className="px-6 py-4">Status</th>
                    <th className="px-6 py-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="text-sm text-gray-600 divide-y divide-gray-50">
                  {customer.invitations.map((inv) => (
                    <tr key={inv.id}>
                      <td className="px-6 py-4 font-mono text-xs">{inv.referenceNo}</td>
                      <td className="px-6 py-4 font-semibold text-[#4A3428]">
                        {inv.groomName ?? '—'} & {inv.brideName ?? '—'}
                      </td>
                      <td className="px-6 py-4 text-xs">{inv.template.name}</td>
                      <td className="px-6 py-4 text-xs">{formatDate(inv.weddingDate)}</td>
                      <td className="px-6 py-4">
                        <StatusBadge status={inv.status} />
                      </td>
                      <td className="px-6 py-4 text-right">
                        {can(user, 'invitations.view') && (
                          <Link href={`/submissions/${inv.id}`} className={`${smallButton} bg-blue-50 text-blue-600 hover:bg-blue-100`}>
                            <Eye size={14} /> View
                          </Link>
                        )}
                      </td>
                    </tr>
                  ))}
                  {customer.invitations.length === 0 && <EmptyRow colSpan={6}>This customer has not started an invitation yet.</EmptyRow>}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}

export default function CustomerDetailPage() {
  return (
    <RequirePermission permission="customers.view">
      <CustomerDetailContent />
    </RequirePermission>
  );
}
