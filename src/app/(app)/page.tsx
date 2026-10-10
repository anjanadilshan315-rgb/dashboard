'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { CheckCircle, ClipboardList, Clock, Mail, MessageSquare, TrendingUp, Users, Wallet } from 'lucide-react';
import { Card, CardHeader, EmptyRow, Notice, PageTitle, Spinner, StatusBadge, formatDate, formatMoney } from '@/components/ui';
import { api, errorMessage } from '@/lib/api';
import { firstAllowedPath } from '@/lib/nav';
import { can, useSession } from '@/lib/session';
import type { DashboardStats } from '@/lib/types';

function StatCard({ icon, label, value, hint, highlight = false }: { icon: React.ReactNode; label: string; value: React.ReactNode; hint?: React.ReactNode; highlight?: boolean }) {
  return (
    <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-[0_8px_30px_rgba(0,0,0,0.03)] hover:shadow-[0_8px_30px_rgba(212,175,55,0.08)] transition-all group relative overflow-hidden">
      {highlight && <div className="absolute -right-6 -top-6 w-32 h-32 bg-gradient-to-br from-[#D4AF37]/20 to-transparent rounded-full blur-2xl" />}
      <div className="flex justify-between items-start mb-4">
        <div
          className={`w-12 h-12 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform ${
            highlight ? 'bg-gradient-to-br from-[#D4AF37] to-[#9b6e20] text-white shadow-lg' : 'bg-[#FAF7F2] text-[#D4AF37]'
          }`}
        >
          {icon}
        </div>
        {hint}
      </div>
      <h3 className="text-gray-400 text-xs font-bold uppercase tracking-wider mb-1">{label}</h3>
      <p className="text-3xl font-bold text-[#4A3428]">{value}</p>
    </div>
  );
}

export default function OverviewPage() {
  const router = useRouter();
  const { session } = useSession();
  const user = session?.user ?? null;
  const allowedHere = can(user, 'dashboard.view');
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    if (user && !allowedHere) router.replace(firstAllowedPath(user));
  }, [user, allowedHere, router]);

  useEffect(() => {
    if (!allowedHere) return;
    let active = true;
    api<DashboardStats>('/admin/dashboard')
      .then(({ data }) => active && setStats(data))
      .catch((e) => active && setError(errorMessage(e)));
    return () => {
      active = false;
    };
  }, [allowedHere]);

  if (!allowedHere) return <Spinner />;

  return (
    <div className="animate-in fade-in duration-500">
      <PageTitle title="Platform Overview" subtitle={`Welcome back${user ? `, ${user.name}` : ''}! Here is a summary of your platform.`} />

      {error && (
        <div className="mb-6">
          <Notice tone="error">{error}</Notice>
        </div>
      )}

      {!stats ? (
        !error && <Spinner />
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-5 mb-8">
            <StatCard
              icon={<Users size={24} />}
              label="Total Customers"
              value={stats.customers.total}
              hint={
                stats.customers.newThisMonth > 0 && (
                  <span className="flex items-center gap-1 text-xs font-semibold text-green-600 bg-green-50 px-2 py-1 rounded-md">
                    <TrendingUp size={12} /> +{stats.customers.newThisMonth} this month
                  </span>
                )
              }
            />
            <StatCard
              icon={<Clock size={24} />}
              label="Pending Payment"
              value={stats.invitations.pending}
              hint={
                stats.invitations.pending > 0 && (
                  <Link href="/submissions?status=pending" className="text-xs font-semibold text-amber-700 bg-amber-50 px-2 py-1 rounded-md hover:underline">
                    Review
                  </Link>
                )
              }
            />
            <StatCard icon={<CheckCircle size={24} />} label="Paid Invitations" value={stats.invitations.paid} />
            <StatCard
              icon={<Wallet size={24} />}
              label="Revenue"
              value={formatMoney(stats.revenue.total)}
              hint={<span className="text-xs font-semibold text-[#A68A5E] bg-[#FAF7F2] px-2 py-1 rounded-md">{formatMoney(stats.revenue.thisMonth)} this month</span>}
              highlight
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-8">
            <StatCard icon={<ClipboardList size={24} />} label="Drafts in Progress" value={stats.invitations.draft} />
            <StatCard icon={<Mail size={24} />} label="Invitation E-mails Sent" value={stats.emailsSent.toLocaleString()} />
            <StatCard
              icon={<MessageSquare size={24} />}
              label="Unread Messages"
              value={stats.unreadMessages}
              hint={
                stats.unreadMessages > 0 &&
                can(user, 'messages.view') && (
                  <Link href="/messages" className="text-xs font-semibold text-red-600 bg-red-50 px-2 py-1 rounded-md hover:underline">
                    {stats.unreadMessages} new
                  </Link>
                )
              }
            />
          </div>

          <Card className="overflow-hidden">
            <CardHeader
              icon={<Clock size={18} />}
              title="Latest Pending Submissions"
              action={
                can(user, 'invitations.view') && (
                  <Link href="/submissions?status=pending" className="text-xs font-semibold text-[#D4AF37] hover:underline">
                    View all
                  </Link>
                )
              }
            />
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse whitespace-nowrap">
                <thead>
                  <tr className="bg-gray-50/50 text-gray-400 text-[10px] font-bold uppercase tracking-wider">
                    <th className="px-6 py-4">Reference</th>
                    <th className="px-6 py-4">Couple</th>
                    <th className="px-6 py-4">Customer</th>
                    <th className="px-6 py-4">Template</th>
                    <th className="px-6 py-4">Submitted</th>
                    <th className="px-6 py-4">Status</th>
                  </tr>
                </thead>
                <tbody className="text-sm text-gray-600 divide-y divide-gray-50">
                  {stats.recentPendingSubmissions.map((s) => (
                    <tr key={s.id} className="hover:bg-gray-50/80 cursor-pointer" onClick={() => router.push(`/submissions/${s.id}`)}>
                      <td className="px-6 py-4 font-mono text-xs">{s.referenceNo}</td>
                      <td className="px-6 py-4 font-semibold text-[#4A3428]">
                        {s.groomName ?? '—'} & {s.brideName ?? '—'}
                      </td>
                      <td className="px-6 py-4">
                        <div>{s.customer.fullName}</div>
                        <div className="text-xs text-gray-400">{s.customer.phone}</div>
                      </td>
                      <td className="px-6 py-4">{s.template.name}</td>
                      <td className="px-6 py-4 text-xs">{formatDate(s.submittedAt, true)}</td>
                      <td className="px-6 py-4">
                        <StatusBadge status={s.status} />
                      </td>
                    </tr>
                  ))}
                  {stats.recentPendingSubmissions.length === 0 && <EmptyRow colSpan={6}>No submissions are waiting for payment.</EmptyRow>}
                </tbody>
              </table>
            </div>
          </Card>
        </>
      )}
    </div>
  );
}
