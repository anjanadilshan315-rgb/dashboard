'use client';

import React, { createContext, useCallback, useContext, useState } from 'react';
import { AlertCircle, CheckCircle, ChevronLeft, ChevronRight, Info, Loader2, X } from 'lucide-react';
import type { InvitationStatus } from '@/lib/types';

export const inputClass =
  'w-full px-4 py-2.5 rounded-xl border border-gray-200 bg-white text-sm focus:ring-2 focus:ring-[#D4AF37]/20 focus:border-[#D4AF37] outline-none transition-all placeholder-gray-300 disabled:bg-gray-50 disabled:text-gray-400';
export const labelClass = 'text-xs font-semibold text-gray-500 uppercase tracking-wide';
export const primaryButton =
  'inline-flex items-center justify-center gap-2 bg-[#4A3428] hover:bg-[#3B2A1D] text-white font-semibold px-5 py-2.5 rounded-xl text-sm shadow-[0_4px_15px_rgba(74,52,40,0.2)] transition-all disabled:opacity-60 disabled:cursor-not-allowed';
export const goldButton =
  'inline-flex items-center justify-center gap-2 bg-gradient-to-r from-[#D4AF37] to-[#9b6e20] text-white font-semibold px-5 py-2.5 rounded-xl text-sm shadow-md hover:shadow-lg transition-all disabled:opacity-60 disabled:cursor-not-allowed';
export const secondaryButton =
  'inline-flex items-center justify-center gap-2 bg-white border border-gray-200 text-gray-600 hover:bg-gray-50 font-semibold px-4 py-2.5 rounded-xl text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed';
export const dangerButton =
  'inline-flex items-center justify-center gap-2 bg-red-50 text-red-600 hover:bg-red-600 hover:text-white border border-red-200 font-semibold px-4 py-2.5 rounded-xl text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed';
export const smallButton = 'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-colors disabled:opacity-50';

export function Card({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return <div className={`bg-white rounded-2xl shadow-[0_8px_30px_rgba(0,0,0,0.03)] border border-gray-100 ${className}`}>{children}</div>;
}

export function CardHeader({ icon, title, action }: { icon?: React.ReactNode; title: string; action?: React.ReactNode }) {
  return (
    <div className="p-5 border-b border-gray-50 flex items-center justify-between gap-3">
      <div className="flex items-center gap-3">
        {icon && <div className="p-2 bg-[#FAF7F2] text-[#D4AF37] rounded-lg">{icon}</div>}
        <h2 className="text-lg font-bold text-[#4A3428]">{title}</h2>
      </div>
      {action}
    </div>
  );
}

export function PageTitle({ title, subtitle, actions }: { title: string; subtitle?: string; actions?: React.ReactNode }) {
  return (
    <div className="mb-8 mt-12 md:mt-0 flex flex-col sm:flex-row sm:items-end justify-between gap-4">
      <div>
        <h1 className="text-2xl md:text-3xl font-playfair text-[#4A3428] font-bold tracking-tight">{title}</h1>
        {subtitle && <p className="text-gray-500 mt-1.5 text-sm">{subtitle}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  );
}

const STATUS: Record<InvitationStatus, { label: string; cls: string }> = {
  draft: { label: 'Draft', cls: 'bg-gray-100 text-gray-500 border-gray-200' },
  pending: { label: 'Pending', cls: 'bg-amber-50 text-amber-700 border-amber-200' },
  paid: { label: 'Paid', cls: 'bg-green-50 text-green-700 border-green-100' },
  cancelled: { label: 'Cancelled', cls: 'bg-red-50 text-red-600 border-red-100' },
};

export function StatusBadge({ status }: { status: InvitationStatus }) {
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider border ${STATUS[status].cls}`}>
      <span className="w-1.5 h-1.5 rounded-full bg-current" />
      {STATUS[status].label}
    </span>
  );
}

export function Notice({ tone = 'info', children, onClose }: { tone?: 'info' | 'success' | 'error' | 'warning'; children: React.ReactNode; onClose?: () => void }) {
  const cls = {
    info: 'bg-[#FAF7F2] text-[#7A5A1E] border-[#EADBCA]',
    success: 'bg-green-50 text-green-700 border-green-100',
    error: 'bg-red-50 text-red-700 border-red-100',
    warning: 'bg-amber-50 text-amber-800 border-amber-200',
  }[tone];
  const Icon = tone === 'success' ? CheckCircle : tone === 'info' ? Info : AlertCircle;
  return (
    <div className={`p-4 rounded-xl text-sm font-medium flex items-start gap-3 border ${cls}`} role={tone === 'error' ? 'alert' : 'status'}>
      <Icon size={18} className="shrink-0 mt-0.5" />
      <div className="flex-1">{children}</div>
      {onClose && (
        <button onClick={onClose} className="opacity-60 hover:opacity-100" aria-label="Dismiss">
          <X size={16} />
        </button>
      )}
    </div>
  );
}

export function Spinner({ label = 'Loading…' }: { label?: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 gap-3 text-gray-400">
      <Loader2 className="w-7 h-7 animate-spin text-[#D4AF37]" />
      <p className="text-sm">{label}</p>
    </div>
  );
}

export function EmptyRow({ colSpan, children }: { colSpan: number; children: React.ReactNode }) {
  return (
    <tr>
      <td colSpan={colSpan} className="px-6 py-12 text-center text-sm text-gray-400">
        {children}
      </td>
    </tr>
  );
}

export function Pagination({ page, totalPages, total, onChange }: { page: number; totalPages: number; total: number; onChange: (page: number) => void }) {
  if (total === 0) return null;
  return (
    <div className="flex items-center justify-between px-6 py-3 border-t border-gray-50 text-xs text-gray-500">
      <span>
        Page {page} of {totalPages} · {total} total
      </span>
      <div className="flex gap-1">
        <button disabled={page <= 1} onClick={() => onChange(page - 1)} className="p-1.5 rounded-lg border border-gray-200 disabled:opacity-40 hover:bg-gray-50" aria-label="Previous page">
          <ChevronLeft size={16} />
        </button>
        <button disabled={page >= totalPages} onClick={() => onChange(page + 1)} className="p-1.5 rounded-lg border border-gray-200 disabled:opacity-40 hover:bg-gray-50" aria-label="Next page">
          <ChevronRight size={16} />
        </button>
      </div>
    </div>
  );
}

export function Modal({ title, onClose, children, wide = false }: { title: string; onClose: () => void; children: React.ReactNode; wide?: boolean }) {
  return (
    <div className="fixed inset-0 z-[2000] flex items-center justify-center p-4 sm:p-6">
      <div className="absolute inset-0 bg-[#3B2A1D]/60 backdrop-blur-sm" onClick={onClose} />
      <div className={`bg-white rounded-2xl shadow-2xl w-full ${wide ? 'max-w-2xl' : 'max-w-lg'} overflow-hidden relative z-10 flex flex-col max-h-[90vh]`} role="dialog" aria-modal="true" aria-label={title}>
        <div className="p-5 border-b border-gray-100 bg-[#FAF7F2] flex justify-between items-center shrink-0">
          <h3 className="font-bold text-[#4A3428]">{title}</h3>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-full bg-white text-gray-400 hover:text-gray-700 shadow-sm" aria-label="Close">
            <X size={16} />
          </button>
        </div>
        <div className="p-6 overflow-y-auto">{children}</div>
      </div>
    </div>
  );
}

export function FieldError({ message }: { message?: string }) {
  return message ? <p className="text-[11px] text-red-600 mt-1">{message}</p> : null;
}

export function formatMoney(amount: number | null | undefined): string {
  if (amount === null || amount === undefined) return '—';
  return `LKR ${amount.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
}

export function formatDate(value: string | null | undefined, withTime = false): string {
  if (!value) return '—';
  const d = new Date(value.length === 10 ? `${value}T00:00:00` : value);
  if (Number.isNaN(d.getTime())) return value;
  return withTime
    ? d.toLocaleString(undefined, { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
    : d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
}

// ---- toasts --------------------------------------------------------------------

interface Toast {
  id: number;
  tone: 'success' | 'error' | 'info';
  text: string;
}

const ToastContext = createContext<(text: string, tone?: Toast['tone']) => void>(() => undefined);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const show = useCallback((text: string, tone: Toast['tone'] = 'success') => {
    const id = Date.now() + Math.random();
    setToasts((t) => [...t, { id, tone, text }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 4500);
  }, []);
  return (
    <ToastContext.Provider value={show}>
      {children}
      <div className="fixed bottom-4 right-4 z-[3000] space-y-2 w-[calc(100%-2rem)] max-w-sm">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`flex items-start gap-2 p-3.5 rounded-xl shadow-lg text-sm font-medium border ${
              t.tone === 'error' ? 'bg-red-50 text-red-700 border-red-100' : t.tone === 'info' ? 'bg-white text-[#4A3428] border-gray-100' : 'bg-green-50 text-green-700 border-green-100'
            }`}
          >
            {t.tone === 'error' ? <AlertCircle size={18} className="shrink-0" /> : <CheckCircle size={18} className="shrink-0" />}
            <span className="flex-1">{t.text}</span>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export const useToast = () => useContext(ToastContext);
