'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { Edit, Loader2, Mail, Phone, Search, Trash2, UserPlus } from 'lucide-react';
import { RequirePermission } from '@/components/guard';
import {
  Card,
  EmptyRow,
  FieldError,
  Modal,
  Notice,
  PageTitle,
  Pagination,
  Spinner,
  formatDate,
  inputClass,
  labelClass,
  primaryButton,
  secondaryButton,
  smallButton,
  useToast,
} from '@/components/ui';
import { api, ApiError, errorMessage, type PageMeta } from '@/lib/api';
import { can, useSession } from '@/lib/session';
import type { Customer, CustomerListItem } from '@/lib/types';

const EMPTY_FORM = { firstName: '', lastName: '', email: '', phone: '', password: '' };

function CustomersContent() {
  const toast = useToast();
  const { session } = useSession();
  const user = session?.user ?? null;

  const [items, setItems] = useState<CustomerListItem[]>([]);
  const [meta, setMeta] = useState<PageMeta | null>(null);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [debounced, setDebounced] = useState('');
  const [active, setActive] = useState<'' | 'true' | 'false'>('');
  const [sortBy, setSortBy] = useState('createdAt');
  const [reload, setReload] = useState(0);
  const [loadedKey, setLoadedKey] = useState('');
  const [error, setError] = useState('');

  const [registering, setRegistering] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => {
      setDebounced(search.trim());
      setPage(1);
    }, 350);
    return () => clearTimeout(t);
  }, [search]);

  const key = JSON.stringify({ page, debounced, active, sortBy, reload });
  useEffect(() => {
    let alive = true;
    api<CustomerListItem[]>('/admin/customers', {
      query: { page, limit: 20, search: debounced, isActive: active || undefined, sortBy, sortOrder: sortBy === 'name' || sortBy === 'email' ? 'asc' : 'desc' },
    })
      .then((res) => {
        if (!alive) return;
        setItems(res.data);
        setMeta(res.meta ?? null);
        setError('');
      })
      .catch((e) => alive && setError(errorMessage(e)))
      .finally(() => alive && setLoadedKey(key));
    return () => {
      alive = false;
    };
  }, [key, page, debounced, active, sortBy]);

  const loading = loadedKey !== key;

  const register = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setFormErrors({});
    try {
      const { data } = await api<Customer>('/admin/customers', {
        method: 'POST',
        body: { ...form, firstName: form.firstName.trim(), lastName: form.lastName.trim(), email: form.email.trim(), phone: form.phone.trim() },
      });
      toast(`${data.fullName} registered. Share the password with the customer so they can log in.`);
      setRegistering(false);
      setForm(EMPTY_FORM);
      setReload((r) => r + 1);
    } catch (err) {
      if (err instanceof ApiError && err.code === 'VALIDATION_ERROR') setFormErrors(err.fieldErrors());
      else if (err instanceof ApiError && err.code === 'EMAIL_TAKEN') setFormErrors({ email: err.message });
      else setFormErrors({ form: errorMessage(err) });
    } finally {
      setSaving(false);
    }
  };

  const toggleActive = async (c: CustomerListItem) => {
    const verb = c.isActive ? 'Deactivate' : 'Activate';
    if (!confirm(`${verb} ${c.fullName}?${c.isActive ? ' They will be signed out and cannot log in.' : ''}`)) return;
    try {
      await api(`/admin/customers/${c.id}`, { method: 'PATCH', body: { isActive: !c.isActive } });
      toast(`${c.fullName} ${c.isActive ? 'deactivated' : 'activated'}.`);
      setReload((r) => r + 1);
    } catch (err) {
      toast(errorMessage(err), 'error');
    }
  };

  const remove = async (c: CustomerListItem) => {
    if (!confirm(`Delete ${c.fullName}? All of their invitations, guests and photos will be deleted. This cannot be undone.`)) return;
    try {
      await api(`/admin/customers/${c.id}`, { method: 'DELETE' });
      toast('Customer deleted.');
      setReload((r) => r + 1);
    } catch (err) {
      toast(errorMessage(err), 'error');
    }
  };

  const field = (key: keyof typeof EMPTY_FORM, label: string, type = 'text', placeholder = '') => (
    <div className="space-y-1.5">
      <label className={labelClass}>{label}</label>
      <input type={type} required value={form[key]} onChange={(e) => setForm({ ...form, [key]: e.target.value })} placeholder={placeholder} className={inputClass} />
      <FieldError message={formErrors[key]} />
    </div>
  );

  return (
    <div>
      <PageTitle
        title="Customers"
        subtitle="Couples who registered on the website or through the sales team."
        actions={
          can(user, 'customers.create') && (
            <button onClick={() => setRegistering(true)} className={primaryButton}>
              <UserPlus size={18} /> Register Customer
            </button>
          )
        }
      />

      <Card className="overflow-hidden">
        <div className="p-5 border-b border-gray-50 flex flex-col md:flex-row gap-3">
          <div className="relative flex-1">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search name, e-mail or phone…" className={`${inputClass} pl-9`} />
          </div>
          <select
            value={active}
            onChange={(e) => {
              setActive(e.target.value as '' | 'true' | 'false');
              setPage(1);
            }}
            className={`${inputClass} md:w-44`}
            aria-label="Account status"
          >
            <option value="">All accounts</option>
            <option value="true">Active</option>
            <option value="false">Deactivated</option>
          </select>
          <select value={sortBy} onChange={(e) => setSortBy(e.target.value)} className={`${inputClass} md:w-48`} aria-label="Sort by">
            <option value="createdAt">Newest first</option>
            <option value="lastLoginAt">Last login</option>
            <option value="name">Name (A–Z)</option>
            <option value="email">E-mail (A–Z)</option>
          </select>
        </div>

        {error && (
          <div className="p-5">
            <Notice tone="error">{error}</Notice>
          </div>
        )}

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse whitespace-nowrap">
            <thead>
              <tr className="bg-gray-50/50 text-gray-400 text-[10px] font-bold uppercase tracking-wider">
                <th className="px-6 py-4">Customer</th>
                <th className="px-6 py-4">Contact</th>
                <th className="px-6 py-4 text-center">Invitations</th>
                <th className="px-6 py-4">Account</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="text-sm text-gray-600 divide-y divide-gray-50">
              {loading && items.length === 0 ? (
                <tr>
                  <td colSpan={5}>
                    <Spinner />
                  </td>
                </tr>
              ) : (
                items.map((c) => (
                  <tr key={c.id} className={`hover:bg-gray-50/80 ${loading ? 'opacity-60' : ''}`}>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-[#FAF7F2] text-[#D4AF37] flex items-center justify-center font-bold text-sm shrink-0 uppercase">
                          {c.firstName[0]}
                          {c.lastName[0]}
                        </div>
                        <div>
                          <Link href={`/customers/${c.id}`} className="font-bold text-[#4A3428] hover:underline">
                            {c.fullName}
                          </Link>
                          <div className="text-xs text-gray-400">Joined {formatDate(c.createdAt)}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2 mb-1">
                        <Mail size={12} className="text-gray-400" /> {c.email}
                      </div>
                      <div className="flex items-center gap-2 text-xs text-gray-400">
                        <Phone size={12} /> {c.phone}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-center text-xs">
                      <span className="font-bold text-[#4A3428]">{c.invitationCount}</span>
                      {c.invitationCount > 0 && (
                        <span className="text-gray-400">
                          {' '}
                          ({c.pendingCount} pending · {c.paidCount} paid)
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`inline-flex px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider border ${
                          c.isActive ? 'bg-green-50 text-green-700 border-green-100' : 'bg-gray-100 text-gray-500 border-gray-200'
                        }`}
                      >
                        {c.isActive ? 'Active' : 'Deactivated'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right space-x-2">
                      <Link href={`/customers/${c.id}`} className={`${smallButton} bg-blue-50 text-blue-600 hover:bg-blue-100`}>
                        <Edit size={14} /> {can(user, 'customers.update') ? 'Manage' : 'View'}
                      </Link>
                      {can(user, 'customers.update') && (
                        <button onClick={() => toggleActive(c)} className={`${smallButton} ${c.isActive ? 'bg-orange-50 text-orange-600 hover:bg-orange-100' : 'bg-green-50 text-green-600 hover:bg-green-100'}`}>
                          {c.isActive ? 'Deactivate' : 'Activate'}
                        </button>
                      )}
                      {can(user, 'customers.delete') && (
                        <button onClick={() => remove(c)} className={`${smallButton} bg-red-50 text-red-600 hover:bg-red-100`} aria-label={`Delete ${c.fullName}`}>
                          <Trash2 size={14} />
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
              {!loading && items.length === 0 && !error && <EmptyRow colSpan={5}>No customers found.</EmptyRow>}
            </tbody>
          </table>
        </div>
        {meta && <Pagination page={meta.page} totalPages={meta.totalPages} total={meta.total} onChange={setPage} />}
      </Card>

      {registering && (
        <Modal title="Register New Customer" onClose={() => setRegistering(false)}>
          <form onSubmit={register} className="space-y-4">
            {formErrors.form && <Notice tone="error">{formErrors.form}</Notice>}
            <div className="grid grid-cols-2 gap-4">
              {field('firstName', 'First name', 'text', 'Kaveen')}
              {field('lastName', 'Last name', 'text', 'Perera')}
            </div>
            {field('phone', 'Phone number', 'tel', '+94 77 123 4567')}
            {field('email', 'E-mail address', 'email', 'kaveen@example.com')}
            {field('password', 'Initial password', 'text', 'At least 8 chars, upper, lower & number')}
            <p className="text-[11px] text-gray-400">The customer logs in on the website with this e-mail and password and can change the password later.</p>
            <div className="flex justify-end gap-2">
              <button type="button" onClick={() => setRegistering(false)} className={secondaryButton}>
                Cancel
              </button>
              <button type="submit" disabled={saving} className={primaryButton}>
                {saving ? <Loader2 size={16} className="animate-spin" /> : <UserPlus size={16} />} Create Account
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}

export default function CustomersPage() {
  return (
    <RequirePermission permission="customers.view">
      <CustomersContent />
    </RequirePermission>
  );
}
