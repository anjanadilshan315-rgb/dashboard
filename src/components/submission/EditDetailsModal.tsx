'use client';

import React, { useState } from 'react';
import { Loader2, Plus, Trash2 } from 'lucide-react';
import { api, ApiError, errorMessage } from '@/lib/api';
import type { InvitationDetail, Template } from '@/lib/types';
import { FieldError, Modal, Notice, inputClass, labelClass, primaryButton, secondaryButton } from '../ui';

interface EventRow {
  key: number;
  name: string;
  time: string;
  venue: string;
}

let rowKey = 0;
const orNull = (v: string) => (v.trim() === '' ? null : v.trim());

/** Sales-team edit of everything the customer entered in the step form. */
export default function EditDetailsModal({
  invitation,
  templates,
  onClose,
  onSaved,
}: {
  invitation: InvitationDetail;
  templates: Template[];
  onClose: () => void;
  onSaved: (updated: InvitationDetail) => void;
}) {
  const [form, setForm] = useState({
    templateId: invitation.template.id,
    groomName: invitation.groomName ?? '',
    brideName: invitation.brideName ?? '',
    groomPhone: invitation.groomPhone ?? '',
    bridePhone: invitation.bridePhone ?? '',
    groomParents: invitation.groomParents ?? '',
    brideParents: invitation.brideParents ?? '',
    weddingDate: invitation.weddingDate ?? '',
    weddingTime: invitation.weddingTime ?? '',
    rsvpDeadline: invitation.rsvpDeadline ?? '',
    venueName: invitation.venueName ?? '',
    venueAddress: invitation.venueAddress ?? '',
    mapUrl: invitation.mapUrl ?? '',
    greetingMessage: invitation.greetingMessage ?? '',
  });
  const [events, setEvents] = useState<EventRow[]>(invitation.eventsSchedule.map((e) => ({ key: ++rowKey, name: e.name, time: e.time, venue: e.venue ?? '' })));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const bind = (key: keyof typeof form) => ({
    value: form[key] as string,
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setForm({ ...form, [key]: e.target.value }),
  });

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    setFieldErrors({});
    try {
      const { data } = await api<InvitationDetail>(`/admin/invitations/${invitation.id}`, {
        method: 'PATCH',
        body: {
          templateId: Number(form.templateId),
          groomName: form.groomName,
          brideName: form.brideName,
          groomPhone: form.groomPhone.trim(),
          bridePhone: form.bridePhone.trim(),
          groomParents: form.groomParents,
          brideParents: form.brideParents,
          weddingDate: orNull(form.weddingDate),
          weddingTime: orNull(form.weddingTime),
          rsvpDeadline: orNull(form.rsvpDeadline),
          venueName: form.venueName,
          venueAddress: form.venueAddress,
          mapUrl: form.mapUrl.trim(),
          greetingMessage: form.greetingMessage,
          eventsSchedule: events
            .filter((ev) => ev.name.trim() || ev.time.trim())
            .map((ev) => ({ name: ev.name.trim(), time: ev.time.trim(), ...(ev.venue.trim() ? { venue: ev.venue.trim() } : {}) })),
        },
      });
      onSaved(data);
    } catch (err) {
      if (err instanceof ApiError && err.code === 'VALIDATION_ERROR') setFieldErrors(err.fieldErrors());
      setError(errorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  const field = (key: keyof typeof form, label: string, type = 'text', max?: number) => (
    <div className="space-y-1.5">
      <label className={labelClass}>{label}</label>
      <input type={type} maxLength={max} {...bind(key)} className={inputClass} />
      <FieldError message={fieldErrors[key]} />
    </div>
  );

  return (
    <Modal title="Edit Wedding Details" onClose={onClose} wide>
      <form onSubmit={save} className="space-y-6">
        {error && <Notice tone="error">{error}</Notice>}

        <div className="space-y-1.5">
          <label className={labelClass}>Template</label>
          <select value={form.templateId} onChange={(e) => setForm({ ...form, templateId: Number(e.target.value) })} className={inputClass}>
            {templates.map((t) => (
              <option key={t.id} value={t.id} disabled={!t.isActive && t.id !== invitation.template.id}>
                {t.name}
                {!t.isActive ? ' (inactive)' : ''}
              </option>
            ))}
          </select>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {field('groomName', "Groom's name", 'text', 150)}
          {field('brideName', "Bride's name", 'text', 150)}
          {field('groomPhone', "Groom's phone", 'tel')}
          {field('bridePhone', "Bride's phone", 'tel')}
          {field('groomParents', "Groom's parents", 'text', 255)}
          {field('brideParents', "Bride's parents", 'text', 255)}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {field('weddingDate', 'Wedding date', 'date')}
          {field('weddingTime', 'Start time', 'time')}
          {field('rsvpDeadline', 'RSVP deadline', 'date')}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {field('venueName', 'Venue name', 'text', 255)}
          {field('venueAddress', 'Venue address', 'text', 500)}
        </div>
        {field('mapUrl', 'Google Maps link', 'url', 1000)}

        <div className="space-y-1.5">
          <label className={labelClass}>Invitation message</label>
          <textarea rows={3} maxLength={2000} {...bind('greetingMessage')} className={`${inputClass} resize-y`} />
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className={labelClass}>Events schedule</label>
            <button
              type="button"
              disabled={events.length >= 20}
              onClick={() => setEvents([...events, { key: ++rowKey, name: '', time: '', venue: '' }])}
              className="flex items-center gap-1 text-xs font-bold text-[#A68A5E] hover:underline"
            >
              <Plus size={14} /> Add
            </button>
          </div>
          {events.map((ev, i) => (
            <div key={ev.key} className="grid grid-cols-[1fr_7rem_1fr_auto] gap-2 items-start">
              <div>
                <input value={ev.name} maxLength={100} placeholder="Event" onChange={(e) => setEvents(events.map((x) => (x.key === ev.key ? { ...x, name: e.target.value } : x)))} className={inputClass} />
                <FieldError message={fieldErrors[`eventsSchedule.${i}.name`]} />
              </div>
              <input type="time" value={ev.time} onChange={(e) => setEvents(events.map((x) => (x.key === ev.key ? { ...x, time: e.target.value } : x)))} className={inputClass} />
              <input value={ev.venue} maxLength={255} placeholder="Place" onChange={(e) => setEvents(events.map((x) => (x.key === ev.key ? { ...x, venue: e.target.value } : x)))} className={inputClass} />
              <button type="button" onClick={() => setEvents(events.filter((x) => x.key !== ev.key))} className="p-2.5 text-gray-400 hover:text-red-500" aria-label="Remove event">
                <Trash2 size={16} />
              </button>
            </div>
          ))}
          {events.length === 0 && <p className="text-xs text-gray-400">No events.</p>}
        </div>

        <div className="flex justify-end gap-2 pt-2 border-t border-gray-100">
          <button type="button" onClick={onClose} className={secondaryButton}>
            Cancel
          </button>
          <button type="submit" disabled={saving} className={primaryButton}>
            {saving && <Loader2 size={16} className="animate-spin" />} Save changes
          </button>
        </div>
      </form>
    </Modal>
  );
}
