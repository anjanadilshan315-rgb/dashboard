'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Bell, LogOut, Menu, X } from 'lucide-react';
import { Spinner, ToastProvider } from '@/components/ui';
import { api, logout, updateSessionUser } from '@/lib/api';
import { NAV_ITEMS, allowed } from '@/lib/nav';
import { can, useSession } from '@/lib/session';
import type { StaffUser } from '@/lib/types';

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { session, ready } = useSession();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [unread, setUnread] = useState(0);
  const [loggingOut, setLoggingOut] = useState(false);
  const user = session?.user ?? null;
  const canReadMessages = can(user, 'messages.view');

  useEffect(() => {
    if (ready && !session && !loggingOut) router.replace(`/login?next=${encodeURIComponent(pathname)}`);
  }, [ready, session, loggingOut, router, pathname]);

  // Keep role / permissions in sync with the server (an admin may have changed them).
  const userId = user?.id;
  useEffect(() => {
    if (!userId) return;
    api<StaffUser>('/admin/auth/me')
      .then(({ data }) => updateSessionUser(data))
      .catch(() => undefined);
  }, [userId]);

  useEffect(() => {
    if (!canReadMessages) return;
    let active = true;
    api<unknown[]>('/admin/messages', { query: { isRead: false, limit: 1 } })
      .then(({ meta }) => active && setUnread(Number(meta?.unread ?? 0)))
      .catch(() => undefined);
    return () => {
      active = false;
    };
  }, [canReadMessages, pathname]);

  if (!ready || !user) {
    return (
      <div className="min-h-screen bg-[#FDFBF7]">
        <Spinner />
      </div>
    );
  }

  const handleLogout = async () => {
    setLoggingOut(true);
    router.replace('/login');
    await logout();
  };

  const isActive = (href: string) => (href === '/' ? pathname === '/' : pathname === href || pathname.startsWith(`${href}/`));
  const items = NAV_ITEMS.filter((item) => allowed(user, item));

  return (
    <ToastProvider>
      <div className="flex min-h-screen bg-[#FDFBF7] font-sans">
        <div
          className={`fixed inset-0 bg-[#3B2A1D]/60 backdrop-blur-sm z-[1050] md:hidden transition-opacity duration-300 ${sidebarOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
          onClick={() => setSidebarOpen(false)}
        />
        <button
          className="md:hidden fixed top-4 right-4 bg-white/80 backdrop-blur border border-gray-200 text-[#4A3428] p-2.5 rounded-full shadow-lg z-[1100]"
          onClick={() => setSidebarOpen(!sidebarOpen)}
          aria-label="Toggle menu"
        >
          {sidebarOpen ? <X size={20} /> : <Menu size={20} />}
        </button>

        {/* Sidebar */}
        <aside
          className={`fixed inset-y-0 left-0 transform ${sidebarOpen ? 'translate-x-0 shadow-2xl' : '-translate-x-full'} md:sticky md:top-0 md:h-screen md:translate-x-0 transition-transform duration-300 w-[280px] shrink-0 bg-[#3B2A1D] flex flex-col z-[1100]`}
        >
          <div className="p-8 flex flex-col items-center border-b border-white/10">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/assets/logo.svg"
              alt="Wedora"
              className="w-40 h-auto mb-2"
              style={{ filter: 'brightness(0) invert(1) sepia(1) saturate(5) hue-rotate(10deg) drop-shadow(0px 2px 4px rgba(0,0,0,0.5))' }}
            />
            <div className="text-[10px] text-[#D4AF37] font-bold tracking-[0.2em] uppercase mt-2">{user.role === 'admin' ? 'Admin Portal' : 'Sales Portal'}</div>
          </div>

          <nav className="flex-1 px-4 py-6 space-y-1.5 overflow-y-auto">
            {items.map((item) => {
              const active = isActive(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setSidebarOpen(false)}
                  className={`w-full flex items-center justify-between px-4 py-3 rounded-xl transition-all duration-200 ${
                    active ? 'bg-[#D4AF37] text-white font-semibold shadow-md' : 'text-gray-300 hover:bg-white/5 hover:text-white'
                  }`}
                >
                  <span className="flex items-center gap-3">
                    <item.icon size={18} className={active ? 'text-white' : 'text-gray-400'} />
                    <span className="text-sm">{item.label}</span>
                  </span>
                  {item.href === '/messages' && unread > 0 && (
                    <span className="bg-red-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow-sm">{unread}</span>
                  )}
                </Link>
              );
            })}
          </nav>

          <div className="p-4 border-t border-white/10">
            <button onClick={handleLogout} className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-red-400 hover:bg-red-500/10 hover:text-red-300 transition-colors">
              <LogOut size={18} />
              <span className="text-sm font-medium">Logout</span>
            </button>
          </div>
        </aside>

        {/* Main */}
        <div className="flex-1 flex flex-col min-w-0">
          <header className="bg-white/80 backdrop-blur-md border-b border-gray-100 h-20 items-center justify-end px-8 z-10 shrink-0 hidden md:flex shadow-sm sticky top-0">
            <div className="flex items-center gap-6">
              {canReadMessages && (
                <Link href="/messages" className="relative text-gray-400 hover:text-[#D4AF37] transition-colors" aria-label="Messages">
                  <Bell size={20} />
                  {unread > 0 && <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-white" />}
                </Link>
              )}
              <Link href="/profile" className="flex items-center gap-3 pl-6 border-l border-gray-100">
                <div className="w-9 h-9 rounded-full bg-[#FAF7F2] border border-[#EADBCA] flex items-center justify-center text-[#9b6e20] font-bold text-sm uppercase">
                  {user.name.charAt(0)}
                </div>
                <div className="flex flex-col">
                  <span className="text-sm font-semibold text-[#4A3428]">{user.name}</span>
                  <span className="text-[10px] text-gray-400 font-medium">{user.role === 'admin' ? 'Administrator' : 'Sales Team'}</span>
                </div>
              </Link>
            </div>
          </header>

          <main className="flex-1 p-6 md:p-8">{children}</main>
        </div>
      </div>
    </ToastProvider>
  );
}
