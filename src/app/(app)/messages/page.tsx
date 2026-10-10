'use client';

import React, { useEffect, useState } from 'react';
import { Check, Mail, MessageCircle, Phone, Search, Trash2 } from 'lucide-react';
import { RequirePermission } from '@/components/guard';
import { Card, EmptyRow, Modal, Notice, PageTitle, Pagination, Spinner, formatDate, inputClass, secondaryButton, smallButton, useToast } from '@/components/ui';
import { api, errorMessage, type PageMeta } from '@/lib/api';
import { can, useSession } from '@/lib/session';
import type { ContactMessage } from '@/lib/types';

function MessagesContent() {
  const toast = useToast();
  const { session } = useSession();
  const canManage = can(session?.user, 'messages.manage');

  const [items, setItems] = useState<ContactMessage[]>([]);
  const [meta, setMeta] = useState<PageMeta | null>(null);
  const [page, setPage] = useState(1);
  const [filter, setFilter] = useState<'' | 'false' | 'true'>('');
  const [search, setSearch] = useState('');
  const [debounced, setDebounced] = useState('');
  const [reload, setReload] = useState(0);
  const [loadedKey, setLoadedKey] = useState('');
  const [error, setError] = useState('');
  const [viewing, setViewing] = useState<ContactMessage | null>(null);

  useEffect(() => {
    const t = setTimeout(() => {
      setDebounced(search.trim());
      setPage(1);
    }, 350);
    return () => clearTimeout(t);
  }, [search]);

  const key = JSON.stringify({ page, filter, debounced, reload });
  useEffect(() => {
    let alive = true;
    api<ContactMessage[]>('/admin/messages', { query: { page, limit: 20, isRead: filter || undefined, search: debounced } })
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
  }, [key, page, filter, debounced]);

  const loading = loadedKey !== key;

  const setRead = async (m: ContactMessage, isRead: boolean) => {
    try {
      const { data } = await api<ContactMessage>(`/admin/messages/${m.id}`, { method: 'PATCH', body: { isRead } });
      setItems((list) => list.map((x) => (x.id === m.id ? data : x)));
      if (viewing?.id === m.id) setViewing(data);
    } catch (err) {
      toast(errorMessage(err), 'error');
    }
  };

  const open = (m: ContactMessage) => {
    setViewing(m);
    if (!m.isRead && canManage) setRead(m, true);
  };

  const remove = async (m: ContactMessage) => {
    if (!confirm('Delete this message?')) return;
    try {
      await api(`/admin/messages/${m.id}`, { method: 'DELETE' });
      toast('Message deleted.');
      setViewing(null);
      setReload((r) => r + 1);
    } catch (err) {
      toast(errorMessage(err), 'error');
    }
  };

  const unread = Number(meta?.unread ?? 0);

  return (
    <div>
      <PageTitle title="Contact Messages" subtitle={`Inquiries from the website contact form.${unread ? ` ${unread} unread.` : ''}`} />

      <Card className="overflow-hidden">
        <div className="p-5 border-b border-gray-50 flex flex-col md:flex-row gap-3">
          <div className="relative flex-1">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search name, e-mail or subject…" className={`${inputClass} pl-9`} />
          </div>
          <select
            value={filter}
            onChange={(e) => {
              setFilter(e.target.value as '' | 'false' | 'true');
              setPage(1);
            }}
            className={`${inputClass} md:w-44`}
            aria-label="Read status"
          >
            <option value="">All messages</option>
            <option value="false">Unread</option>
            <option value="true">Read</option>
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
                <th className="px-6 py-4">Sender</th>
                <th className="px-6 py-4">Message</th>
                <th className="px-6 py-4">Received</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="text-sm text-gray-600 divide-y divide-gray-50">
              {loading && items.length === 0 ? (
                <tr>
                  <td colSpan={4}>
                    <Spinner />
                  </td>
                </tr>
              ) : (
                items.map((m) => (
                  <tr key={m.id} className={`group transition-colors ${!m.isRead ? 'bg-[#FAF7F2]/50 hover:bg-[#FAF7F2]' : 'hover:bg-gray-50/80'}`}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-3">
                        {!m.isRead && <div className="w-2 h-2 rounded-full bg-[#D4AF37] shrink-0" />}
                        <div>
                          <div className={`text-[15px] text-[#4A3428] ${!m.isRead ? 'font-bold' : 'font-semibold'}`}>{m.name}</div>
                          <div className="text-xs text-gray-500">{m.email}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 max-w-sm">
                      {m.subject && <p className="text-xs font-bold text-[#4A3428]">{m.subject}</p>}
                      <p className="text-sm text-gray-600 truncate">{m.message}</p>
                      <button onClick={() => open(m)} className="text-[#A68A5E] text-[11px] font-bold uppercase tracking-wide hover:underline mt-1">
                        Read full message
                      </button>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-xs text-gray-500">{formatDate(m.createdAt, true)}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-right space-x-2">
                      {canManage && (
                        <>
                          <button onClick={() => setRead(m, !m.isRead)} className={`${smallButton} bg-blue-50 text-blue-600 hover:bg-blue-100`}>
                            <Check size={14} /> {m.isRead ? 'Mark unread' : 'Mark read'}
                          </button>
                          <button onClick={() => remove(m)} className={`${smallButton} bg-gray-50 text-gray-500 hover:bg-red-50 hover:text-red-600`}>
                            <Trash2 size={14} /> Delete
                          </button>
                        </>
                      )}
                    </td>
                  </tr>
                ))
              )}
              {!loading && items.length === 0 && !error && <EmptyRow colSpan={4}>No messages.</EmptyRow>}
            </tbody>
          </table>
        </div>
        {meta && <Pagination page={meta.page} totalPages={meta.totalPages} total={meta.total} onChange={setPage} />}
      </Card>

      {viewing && (
        <Modal title={viewing.subject || `Message from ${viewing.name}`} onClose={() => setViewing(null)}>
          <div className="space-y-4">
            <div className="text-sm space-y-1">
              <p className="font-bold text-[#4A3428]">{viewing.name}</p>
              <a href={`mailto:${viewing.email}`} className="flex items-center gap-2 text-gray-500 hover:text-[#A68A5E]">
                <Mail size={14} /> {viewing.email}
              </a>
              {viewing.phone && (
                <>
                  <a href={`tel:${viewing.phone}`} className="flex items-center gap-2 text-gray-500 hover:text-[#A68A5E]">
                    <Phone size={14} /> {viewing.phone}
                  </a>
                  <a
                    href={`https://wa.me/${viewing.phone.replace(/[^0-9]/g, '').replace(/^0/, '94')}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 text-green-600 hover:underline"
                  >
                    <MessageCircle size={14} /> WhatsApp
                  </a>
                </>
              )}
            </div>
            <p className="text-[15px] leading-relaxed text-gray-700 whitespace-pre-wrap break-words border-t border-gray-100 pt-4">{viewing.message}</p>
            <div className="flex items-center justify-between border-t border-gray-100 pt-4">
              <span className="text-xs font-semibold text-gray-400 uppercase tracking-widest">{formatDate(viewing.createdAt, true)}</span>
              <div className="flex gap-2">
                <a href={`mailto:${viewing.email}?subject=${encodeURIComponent(`Re: ${viewing.subject ?? 'Your message to Wedora'}`)}`} className={secondaryButton}>
                  <Mail size={16} /> Reply
                </a>
                {canManage && (
                  <button onClick={() => remove(viewing)} className={`${smallButton} bg-red-50 text-red-600 hover:bg-red-100 px-4`}>
                    <Trash2 size={14} /> Delete
                  </button>
                )}
              </div>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

export default function MessagesPage() {
  return (
    <RequirePermission permission="messages.view">
      <MessagesContent />
    </RequirePermission>
  );
}
