'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { Edit, Key, Loader2, Search, ShieldCheck, Trash2, UserPlus } from 'lucide-react';
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
import { api, ApiError, errorMessage, updateSessionUser, type PageMeta } from '@/lib/api';
import { useSession } from '@/lib/session';
import type { Permission, PermissionInfo, StaffRole, StaffUser } from '@/lib/types';

interface StaffForm {
  id?: number;
  name: string;
  email: string;
  phone: string;
  password: string;
  role: StaffRole;
  isActive: boolean;
  permissions: Permission[];
}

const EMPTY: StaffForm = { name: '', email: '', phone: '', password: '', role: 'user', isActive: true, permissions: [] };

function UsersContent() {
  const toast = useToast();
  const { session } = useSession();
  const me = session?.user ?? null;

  const [items, setItems] = useState<StaffUser[]>([]);
  const [meta, setMeta] = useState<PageMeta | null>(null);
  const [catalog, setCatalog] = useState<PermissionInfo[]>([]);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [debounced, setDebounced] = useState('');
  const [role, setRole] = useState<'' | StaffRole>('');
  const [reload, setReload] = useState(0);
  const [loadedKey, setLoadedKey] = useState('');
  const [error, setError] = useState('');

  const [form, setForm] = useState<StaffForm | null>(null);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [resetFor, setResetFor] = useState<StaffUser | null>(null);
  const [newPassword, setNewPassword] = useState('');
  const [resetError, setResetError] = useState('');

  useEffect(() => {
    api<PermissionInfo[]>('/admin/permissions')
      .then(({ data }) => setCatalog(data))
      .catch(() => undefined);
  }, []);

  useEffect(() => {
    const t = setTimeout(() => {
      setDebounced(search.trim());
      setPage(1);
    }, 350);
    return () => clearTimeout(t);
  }, [search]);

  const key = JSON.stringify({ page, debounced, role, reload });
  useEffect(() => {
    let alive = true;
    api<StaffUser[]>('/admin/staff', { query: { page, limit: 20, search: debounced, role: role || undefined } })
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
  }, [key, page, debounced, role]);

  const loading = loadedKey !== key;

  const groups = useMemo(() => {
    const map = new Map<string, PermissionInfo[]>();
    for (const p of catalog) map.set(p.group, [...(map.get(p.group) ?? []), p]);
    return Array.from(map.entries());
  }, [catalog]);

  const openCreate = () => {
    setFormErrors({});
    setForm({ ...EMPTY, permissions: ['dashboard.view', 'invitations.view', 'customers.view'] });
  };
  const openEdit = (u: StaffUser) => {
    setFormErrors({});
    setForm({ id: u.id, name: u.name, email: u.email, phone: u.phone ?? '', password: '', role: u.role, isActive: u.isActive, permissions: u.role === 'admin' ? [] : u.permissions });
  };

  const togglePermission = (p: Permission) => {
    if (!form) return;
    setForm({ ...form, permissions: form.permissions.includes(p) ? form.permissions.filter((x) => x !== p) : [...form.permissions, p] });
  };

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form) return;
    setSaving(true);
    setFormErrors({});
    const isSelf = form.id === me?.id;
    try {
      if (form.id) {
        await api(`/admin/staff/${form.id}`, {
          method: 'PATCH',
          body: {
            name: form.name.trim(),
            email: form.email.trim(),
            phone: form.phone.trim(),
            ...(isSelf ? {} : { role: form.role, isActive: form.isActive }),
            ...(form.role === 'user' ? { permissions: form.permissions } : {}),
          },
        });
        toast('User updated.');
        if (isSelf) {
          const { data: meData } = await api<StaffUser>('/admin/auth/me');
          updateSessionUser(meData);
        }
      } else {
        await api('/admin/staff', {
          method: 'POST',
          body: {
            name: form.name.trim(),
            email: form.email.trim(),
            phone: form.phone.trim(),
            password: form.password,
            role: form.role,
            permissions: form.role === 'user' ? form.permissions : [],
          },
        });
        toast(`${form.name} can now log in to the dashboard.`);
      }
      setForm(null);
      setReload((r) => r + 1);
    } catch (err) {
      if (err instanceof ApiError && err.code === 'VALIDATION_ERROR') setFormErrors(err.fieldErrors());
      else if (err instanceof ApiError && err.code === 'EMAIL_TAKEN') setFormErrors({ email: err.message });
      else setFormErrors({ form: errorMessage(err) });
    } finally {
      setSaving(false);
    }
  };

  const remove = async (u: StaffUser) => {
    if (!confirm(`Delete ${u.name}? They will lose access immediately.`)) return;
    try {
      await api(`/admin/staff/${u.id}`, { method: 'DELETE' });
      toast('User deleted.');
      setReload((r) => r + 1);
    } catch (err) {
      toast(errorMessage(err), 'error');
    }
  };

  const resetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetFor) return;
    setResetError('');
    try {
      await api(`/admin/staff/${resetFor.id}/password`, { method: 'PATCH', body: { newPassword } });
      toast(`Password reset for ${resetFor.name}.`);
      setResetFor(null);
      setNewPassword('');
    } catch (err) {
      setResetError(err instanceof ApiError && err.code === 'VALIDATION_ERROR' ? err.fieldErrors().newPassword ?? errorMessage(err) : errorMessage(err));
    }
  };

  const isSelf = form?.id !== undefined && form.id === me?.id;

  return (
    <div>
      <PageTitle
        title="User Management"
        subtitle="Create admins and sales team users, and choose what each user can do."
        actions={
          <button onClick={openCreate} className={primaryButton}>
            <UserPlus size={18} /> New User
          </button>
        }
      />

      <Card className="overflow-hidden">
        <div className="p-5 border-b border-gray-50 flex flex-col md:flex-row gap-3">
          <div className="relative flex-1">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search name, e-mail or phone…" className={`${inputClass} pl-9`} />
          </div>
          <select
            value={role}
            onChange={(e) => {
              setRole(e.target.value as '' | StaffRole);
              setPage(1);
            }}
            className={`${inputClass} md:w-44`}
            aria-label="Role"
          >
            <option value="">All roles</option>
            <option value="admin">Admins</option>
            <option value="user">Users</option>
          </select>
        </div>

        {error && (
          <div className="p-5">
            <Notice tone="error">{error}</Notice>
          </div>
        )}

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50/50 text-gray-400 text-[10px] font-bold uppercase tracking-wider whitespace-nowrap">
                <th className="px-6 py-4">User</th>
                <th className="px-6 py-4">Role</th>
                <th className="px-6 py-4">Permissions</th>
                <th className="px-6 py-4">Last login</th>
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
                items.map((u) => (
                  <tr key={u.id} className={`hover:bg-gray-50/80 ${!u.isActive ? 'opacity-60' : ''}`}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="font-bold text-[#4A3428]">
                        {u.name} {u.id === me?.id && <span className="text-[10px] text-[#D4AF37] font-bold uppercase ml-1">(you)</span>}
                      </div>
                      <div className="text-xs text-gray-400">
                        {u.email}
                        {u.phone ? ` · ${u.phone}` : ''}
                      </div>
                      {!u.isActive && <div className="text-[10px] font-bold text-red-500 uppercase mt-0.5">Deactivated</div>}
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider ${
                          u.role === 'admin' ? 'bg-[#4A3428] text-white' : 'bg-[#FAF7F2] text-[#A68A5E] border border-[#EADBCA]'
                        }`}
                      >
                        {u.role === 'admin' && <ShieldCheck size={12} />} {u.role}
                      </span>
                    </td>
                    <td className="px-6 py-4 max-w-md">
                      {u.role === 'admin' ? (
                        <span className="text-xs text-gray-400">All permissions</span>
                      ) : u.permissions.length ? (
                        <div className="flex flex-wrap gap-1">
                          {u.permissions.map((p) => (
                            <span key={p} className="text-[10px] bg-gray-100 text-gray-600 px-2 py-0.5 rounded font-mono">
                              {p}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <span className="text-xs text-red-400">No permissions</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-xs whitespace-nowrap">{u.lastLoginAt ? formatDate(u.lastLoginAt, true) : 'Never'}</td>
                    <td className="px-6 py-4 text-right whitespace-nowrap space-x-2">
                      <button onClick={() => openEdit(u)} className={`${smallButton} bg-blue-50 text-blue-600 hover:bg-blue-100`}>
                        <Edit size={14} /> Edit
                      </button>
                      <button onClick={() => setResetFor(u)} className={`${smallButton} bg-gray-50 text-gray-600 hover:bg-gray-100`} title="Reset password">
                        <Key size={14} />
                      </button>
                      {u.id !== me?.id && (
                        <button onClick={() => remove(u)} className={`${smallButton} bg-red-50 text-red-600 hover:bg-red-100`} aria-label={`Delete ${u.name}`}>
                          <Trash2 size={14} />
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
              {!loading && items.length === 0 && !error && <EmptyRow colSpan={5}>No users found.</EmptyRow>}
            </tbody>
          </table>
        </div>
        {meta && <Pagination page={meta.page} totalPages={meta.totalPages} total={meta.total} onChange={setPage} />}
      </Card>

      {form && (
        <Modal title={form.id ? 'Edit User' : 'New User'} onClose={() => setForm(null)} wide>
          <form onSubmit={save} className="space-y-5">
            {formErrors.form && <Notice tone="error">{formErrors.form}</Notice>}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className={labelClass}>Full name</label>
                <input required maxLength={150} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className={inputClass} />
                <FieldError message={formErrors.name} />
              </div>
              <div className="space-y-1.5">
                <label className={labelClass}>E-mail</label>
                <input required type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className={inputClass} />
                <FieldError message={formErrors.email} />
              </div>
              <div className="space-y-1.5">
                <label className={labelClass}>Phone (optional)</label>
                <input type="tel" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className={inputClass} />
                <FieldError message={formErrors.phone} />
              </div>
              {!form.id && (
                <div className="space-y-1.5">
                  <label className={labelClass}>Initial password</label>
                  <input required type="text" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} className={inputClass} placeholder="8+ chars, upper, lower & number" />
                  <FieldError message={formErrors.password} />
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className={labelClass}>Role</label>
                <select value={form.role} disabled={isSelf} onChange={(e) => setForm({ ...form, role: e.target.value as StaffRole })} className={inputClass}>
                  <option value="user">User — only the permissions below</option>
                  <option value="admin">Admin — full access + user management</option>
                </select>
                {isSelf && <p className="text-[11px] text-gray-400">You cannot change your own role.</p>}
              </div>
              {form.id && (
                <div className="space-y-1.5">
                  <label className={labelClass}>Account</label>
                  <label className="flex items-center gap-2 text-sm text-gray-600 h-[42px]">
                    <input type="checkbox" disabled={isSelf} checked={form.isActive} onChange={(e) => setForm({ ...form, isActive: e.target.checked })} className="w-4 h-4 accent-[#D4AF37]" />
                    Active (can log in)
                  </label>
                </div>
              )}
            </div>

            {form.role === 'user' ? (
              <div>
                <p className={`${labelClass} mb-3`}>Permissions</p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {groups.map(([group, perms]) => (
                    <div key={group} className="border border-gray-100 rounded-xl p-3">
                      <p className="text-xs font-bold text-[#4A3428] mb-2">{group}</p>
                      <div className="space-y-1.5">
                        {perms.map((p) => (
                          <label key={p.key} className="flex items-start gap-2 text-sm text-gray-600 cursor-pointer">
                            <input type="checkbox" checked={form.permissions.includes(p.key)} onChange={() => togglePermission(p.key)} className="w-4 h-4 mt-0.5 accent-[#D4AF37]" />
                            <span>{p.description}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <Notice tone="info">Admins have every permission and can manage other users.</Notice>
            )}

            <div className="flex justify-end gap-2 pt-2 border-t border-gray-100">
              <button type="button" onClick={() => setForm(null)} className={secondaryButton}>
                Cancel
              </button>
              <button type="submit" disabled={saving} className={primaryButton}>
                {saving && <Loader2 size={16} className="animate-spin" />} {form.id ? 'Save changes' : 'Create user'}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {resetFor && (
        <Modal title={`Reset password — ${resetFor.name}`} onClose={() => setResetFor(null)}>
          <form onSubmit={resetPassword} className="space-y-4">
            <p className="text-sm text-gray-500">The user is signed out everywhere and must log in with the new password.</p>
            <input required type="text" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="New password" className={inputClass} />
            <FieldError message={resetError} />
            <div className="flex justify-end gap-2">
              <button type="button" onClick={() => setResetFor(null)} className={secondaryButton}>
                Cancel
              </button>
              <button type="submit" className={primaryButton}>
                Reset password
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}

export default function UsersPage() {
  return (
    <RequirePermission adminOnly>
      <UsersContent />
    </RequirePermission>
  );
}
