'use client';

import React, { useEffect, useState } from 'react';
import { ExternalLink, Palette } from 'lucide-react';
import { RequirePermission } from '@/components/guard';
import { Card, EmptyRow, Notice, PageTitle, Spinner, formatMoney } from '@/components/ui';
import { WEBSITE_URL, api, errorMessage } from '@/lib/api';
import type { Template } from '@/lib/types';

function TemplatesContent() {
  const [templates, setTemplates] = useState<Template[] | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    api<Template[]>('/admin/templates')
      .then(({ data }) => setTemplates(data))
      .catch((e) => setError(errorMessage(e)));
  }, []);

  return (
    <div>
      <PageTitle title="Templates" subtitle="Invitation designs available on the website. A template builder will be added here later." />
      <Notice tone="info">The five designs are built into the website. Open a live preview to see each one with sample data.</Notice>

      {error && (
        <div className="mt-4">
          <Notice tone="error">{error}</Notice>
        </div>
      )}

      <Card className="overflow-hidden mt-6">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50/50 text-gray-400 text-[10px] font-bold uppercase tracking-wider whitespace-nowrap">
                <th className="px-6 py-4">Code</th>
                <th className="px-6 py-4">Name & Description</th>
                <th className="px-6 py-4">Category</th>
                <th className="px-6 py-4">Price</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4 text-right">Preview</th>
              </tr>
            </thead>
            <tbody className="text-sm text-gray-600 divide-y divide-gray-50">
              {templates === null && !error ? (
                <tr>
                  <td colSpan={6}>
                    <Spinner />
                  </td>
                </tr>
              ) : (
                templates?.map((t) => (
                  <tr key={t.id} className={`hover:bg-gray-50/80 ${!t.isActive ? 'opacity-60' : ''}`}>
                    <td className="px-6 py-4">
                      <span className="font-mono text-xs bg-gray-100 text-gray-600 px-2.5 py-1 rounded-md border border-gray-200">{t.code}</span>
                    </td>
                    <td className="px-6 py-4 min-w-[240px]">
                      <div className="font-bold text-[#4A3428] flex items-center gap-2">
                        <Palette size={14} className="text-[#D4AF37]" /> {t.name}
                      </div>
                      <div className="text-xs text-gray-500 mt-0.5">{t.description ?? '—'}</div>
                    </td>
                    <td className="px-6 py-4 text-xs capitalize">{t.category ?? '—'}</td>
                    <td className="px-6 py-4 text-xs">{t.price === null ? 'Not set' : formatMoney(t.price)}</td>
                    <td className="px-6 py-4">
                      <span
                        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider ${
                          t.isActive ? 'bg-green-50 text-green-700 border border-green-100' : 'bg-gray-100 text-gray-500 border border-gray-200'
                        }`}
                      >
                        {t.isActive ? 'Active' : 'Disabled'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      {t.demoSlug && (
                        <a
                          href={`${WEBSITE_URL}/invite/${t.demoSlug}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#FAF7F2] text-[#A68A5E] hover:bg-[#F3EAD9] rounded-lg text-xs font-bold"
                        >
                          <ExternalLink size={14} /> Live preview
                        </a>
                      )}
                    </td>
                  </tr>
                ))
              )}
              {templates?.length === 0 && <EmptyRow colSpan={6}>No templates found.</EmptyRow>}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}

export default function TemplatesPage() {
  return (
    <RequirePermission permission="templates.view">
      <TemplatesContent />
    </RequirePermission>
  );
}
