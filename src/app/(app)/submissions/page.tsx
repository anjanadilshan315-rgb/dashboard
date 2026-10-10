'use client';

import React, { Suspense, useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { Eye, Search } from 'lucide-react';
import { RequirePermission } from '@/components/guard';
import { Card, EmptyRow, Notice, PageTitle, Pagination, Spinner, StatusBadge, formatDate, formatMoney, inputClass, smallButton } from '@/components/ui';
import { api, errorMessage, type PageMeta } from '@/lib/api';
import { can, useSession } from '@/lib/session';
import type { InvitationListItem, InvitationStatus, Template } from '@/lib/types';

const TABS: { key: InvitationStatus | 'all' | 'draft'; label: string }[] = [
  { key: 'all', label: 'All submissions' },
  { key: 'pending', label: 'Pending payment' },
  { key: 'paid', label: 'Paid' },
  { key: 'cancelled', label: 'Cancelled' },
  { key: 'draft', label: 'Drafts' },
];

const PAGE_SIZE = 20;

function SubmissionsContent() {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const { session } = useSession();

  const status = (params.get('status') as (typeof TABS)[number]['key']) ?? 'all';
  const page = Number(params.get('page') ?? 1) || 1;
  const templateId = params.get('templateId') ?? '';
  const sortBy = params.get('sortBy') ?? (status === 'pending' ? 'submittedAt' : 'createdAt');
  const from = params.get('from') ?? '';
  const to = params.get('to') ?? '';
  const searchParam = params.get('search') ?? '';

  const [search, setSearch] = useState(searchParam);
  const [items, setItems] = useState<InvitationListItem[]>([]);
  const [meta, setMeta] = useState<PageMeta | null>(null);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [error, setError] = useState('');
  const [loadedKey, setLoadedKey] = useState('');
  const key = params.toString();

  const setParams = (changes: Record<string, string | number | null>) => {
    const next = new URLSearchParams(params.toString());
    for (const [k, v] of Object.entries(changes)) {
      if (v === null || v === '' || (k === 'status' && v === 'all')) next.delete(k);
      else next.set(k, String(v));
    }
    if (!('page' in changes)) next.delete('page');
    router.replace(`${pathname}?${next.toString()}`);
  };

  // debounce the search box into the URL
  useEffect(() => {
    if (search === searchParam) return;
    const t = setTimeout(() => setParams({ search: search.trim() || null }), 350);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);

  // The full template list needs templates.view; everyone can read the public (active) list.
  const canSeeTemplates = can(session?.user, 'templates.view');
  useEffect(() => {
    api<Template[]>(canSeeTemplates ? '/admin/templates' : '/public/templates', { auth: canSeeTemplates })
      .then(({ data }) => setTemplates(data))
      .catch(() => undefined);
  }, [canSeeTemplates]);

  useEffect(() => {
    let active = true;
    api<InvitationListItem[]>('/admin/invitations', {
      query: {
        page,
        limit: PAGE_SIZE,
        status: status === 'all' ? undefined : status,
        includeDrafts: status === 'draft' ? true : undefined,
        search: searchParam,
        templateId: templateId || undefined,
        submittedFrom: from || undefined,
        submittedTo: to || undefined,
        sortBy,
        sortOrder: 'desc',
      },
    })
      .then((res) => {
        if (!active) return;
        setItems(res.data);
        setMeta(res.meta ?? null);
        setError('');
      })
      .catch((e) => active && setError(errorMessage(e)))
      .finally(() => active && setLoadedKey(key));
    return () => {
      active = false;
    };
  }, [key, page, status, searchParam, templateId, from, to, sortBy]);

  const loading = loadedKey !== key;

  return (
    <div>
      <PageTitle title="Customer Registrations" subtitle="Invitations submitted by customers. Review the details and mark them as paid once the payment is received." />

      <div className="flex flex-wrap gap-2 mb-5">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setParams({ status: tab.key })}
            className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all ${
              status === tab.key ? 'bg-[#4A3428] text-white shadow' : 'bg-white border border-gray-200 text-gray-500 hover:bg-gray-50'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <Card className="overflow-hidden">
        <div className="p-5 border-b border-gray-50 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-3">
          <div className="relative xl:col-span-2">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search reference, couple, customer, phone…" className={`${inputClass} pl-9`} />
          </div>
          <select value={templateId} onChange={(e) => setParams({ templateId: e.target.value || null })} className={inputClass} aria-label="Template">
            <option value="">All templates</option>
            {templates.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>
          <div className="flex gap-2">
            <input type="date" value={from} onChange={(e) => setParams({ from: e.target.value || null })} className={inputClass} aria-label="Submitted from" title="Submitted from" />
            <input type="date" value={to} onChange={(e) => setParams({ to: e.target.value || null })} className={inputClass} aria-label="Submitted to" title="Submitted to" />
          </div>
          <select value={sortBy} onChange={(e) => setParams({ sortBy: e.target.value })} className={inputClass} aria-label="Sort by">
            <option value="createdAt">Newest first</option>
            <option value="submittedAt">Recently submitted</option>
            <option value="updatedAt">Recently updated</option>
            <option value="weddingDate">Wedding date</option>
            <option value="paidAt">Recently paid</option>
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
                <th className="px-6 py-4">Reference</th>
                <th className="px-6 py-4">Couple</th>
                <th className="px-6 py-4">Customer</th>
                <th className="px-6 py-4">Template</th>
                <th className="px-6 py-4">Wedding</th>
                <th className="px-6 py-4">Submitted</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4 text-right">Payment</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="text-sm text-gray-600 divide-y divide-gray-50">
              {loading && items.length === 0 ? (
                <tr>
                  <td colSpan={9}>
                    <Spinner />
                  </td>
                </tr>
              ) : (
                items.map((s) => (
                  <tr key={s.id} className={`hover:bg-gray-50/80 transition-colors ${loading ? 'opacity-60' : ''}`}>
                    <td className="px-6 py-4 font-mono text-xs">{s.referenceNo}</td>
                    <td className="px-6 py-4 font-semibold text-[#4A3428]">
                      {s.groomName || s.brideName ? `${s.groomName ?? '—'} & ${s.brideName ?? '—'}` : <span className="text-gray-400 font-normal">Not entered yet</span>}
                    </td>
                    <td className="px-6 py-4">
                      <Link href={`/customers/${s.customer.id}`} className="hover:underline text-[#4A3428]">
                        {s.customer.fullName}
                      </Link>
                      <div className="text-xs text-gray-400">
                        {s.customer.email} · {s.customer.phone}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-xs">{s.template.name}</td>
                    <td className="px-6 py-4 text-xs">{formatDate(s.weddingDate)}</td>
                    <td className="px-6 py-4 text-xs">{formatDate(s.submittedAt, true)}</td>
                    <td className="px-6 py-4">
                      <StatusBadge status={s.status} />
                    </td>
                    <td className="px-6 py-4 text-right text-xs">{s.status === 'paid' ? formatMoney(s.paymentAmount) : '—'}</td>
                    <td className="px-6 py-4 text-right">
                      <Link href={`/submissions/${s.id}`} className={`${smallButton} bg-blue-50 text-blue-600 hover:bg-blue-100`}>
                        <Eye size={14} /> View
                      </Link>
                    </td>
                  </tr>
                ))
              )}
              {!loading && items.length === 0 && !error && <EmptyRow colSpan={9}>No submissions match these filters.</EmptyRow>}
            </tbody>
          </table>
        </div>
        {meta && <Pagination page={meta.page} totalPages={meta.totalPages} total={meta.total} onChange={(p) => setParams({ page: p })} />}
      </Card>
    </div>
  );
}

export default function SubmissionsPage() {
  return (
    <RequirePermission permission="invitations.view">
      <Suspense fallback={<Spinner />}>
        <SubmissionsContent />
      </Suspense>
    </RequirePermission>
  );
}
