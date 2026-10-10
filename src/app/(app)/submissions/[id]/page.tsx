'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import {
  ArrowLeft,
  Ban,
  Calendar,
  CheckCircle,
  Clock,
  Edit,
  ExternalLink,
  Eye,
  EyeOff,
  Heart,
  History,
  ImagePlus,
  Loader2,
  Mail,
  MapPin,
  MessageCircle,
  Phone,
  RotateCcw,
  Save,
  StickyNote,
  Trash2,
  User,
  Users,
  Wallet,
} from 'lucide-react';
import { RequirePermission } from '@/components/guard';
import EditDetailsModal from '@/components/submission/EditDetailsModal';
import {
  Card,
  CardHeader,
  EmptyRow,
  FieldError,
  Modal,
  Notice,
  Pagination,
  Spinner,
  StatusBadge,
  dangerButton,
  formatDate,
  formatMoney,
  goldButton,
  inputClass,
  labelClass,
  primaryButton,
  secondaryButton,
  smallButton,
  useToast,
} from '@/components/ui';
import { WEBSITE_URL, api, ApiError, errorMessage, type PageMeta } from '@/lib/api';
import { can, useSession } from '@/lib/session';
import type { Guest, InvitationDetail, InvitationStatus, Photo, PhotoCategory, Photos, Template, Wish } from '@/lib/types';

/** Mirrors STAFF_STATUS_TRANSITIONS in the backend. */
const TRANSITIONS: Record<InvitationStatus, InvitationStatus[]> = {
  draft: ['pending', 'cancelled'],
  pending: ['paid', 'cancelled'],
  paid: ['pending', 'cancelled'],
  cancelled: ['pending'],
};

const ACTION_LABEL: Record<string, { label: string; icon: typeof CheckCircle }> = {
  paid: { label: 'Mark as Paid', icon: CheckCircle },
  pending: { label: 'Move to Pending', icon: RotateCcw },
  cancelled: { label: 'Cancel', icon: Ban },
};

const EMAIL_STATUS: Record<Guest['emailStatus'], string> = {
  not_sent: 'text-gray-400 bg-gray-50',
  queued: 'text-blue-600 bg-blue-50',
  sent: 'text-green-700 bg-green-50',
  failed: 'text-red-600 bg-red-50',
};

function formatTime(time: string | null | undefined): string {
  if (!time) return '';
  const m = /^(\d{1,2}):(\d{2})/.exec(time);
  if (!m) return time;
  const h = Number(m[1]);
  return `${h % 12 || 12}:${m[2]} ${h >= 12 ? 'PM' : 'AM'}`;
}

function Detail({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <dt className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">{label}</dt>
      <dd className="text-sm text-[#4A3428] mt-0.5 break-words">{children || <span className="text-gray-300">—</span>}</dd>
    </div>
  );
}

function SubmissionDetail() {
  const params = useParams<{ id: string }>();
  const id = Number(params.id);
  const router = useRouter();
  const toast = useToast();
  const { session } = useSession();
  const user = session?.user ?? null;
  const canUpdate = can(user, 'invitations.update');
  const canChangeStatus = can(user, 'invitations.update_status');
  const canDelete = can(user, 'invitations.delete');
  const canSeeTemplates = can(user, 'templates.view');

  const [inv, setInv] = useState<InvitationDetail | null>(null);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loadError, setLoadError] = useState('');
  const [editing, setEditing] = useState(false);
  const [statusTarget, setStatusTarget] = useState<InvitationStatus | null>(null);
  const [statusForm, setStatusForm] = useState({ paymentAmount: '', paymentReference: '', note: '' });
  const [statusErrors, setStatusErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [notes, setNotes] = useState('');
  const [savingNotes, setSavingNotes] = useState(false);
  const [photoBusy, setPhotoBusy] = useState<PhotoCategory | null>(null);
  const [lightbox, setLightbox] = useState<Photo | null>(null);
  const uploadCategory = useRef<PhotoCategory>('gallery');
  const fileInput = useRef<HTMLInputElement>(null);

  // guests
  const [guests, setGuests] = useState<Guest[]>([]);
  const [guestMeta, setGuestMeta] = useState<PageMeta | null>(null);
  const [guestPage, setGuestPage] = useState(1);
  const [guestSearch, setGuestSearch] = useState('');
  // wishes
  const [wishes, setWishes] = useState<Wish[] | null>(null);

  const applyDetail = useCallback((data: InvitationDetail) => {
    setInv(data);
    setNotes(data.staffNotes ?? '');
  }, []);

  useEffect(() => {
    let active = true;
    Promise.all([
      api<InvitationDetail>(`/admin/invitations/${id}`),
      api<Template[]>(canSeeTemplates ? '/admin/templates' : '/public/templates', { auth: canSeeTemplates }).catch(() => ({ data: [] as Template[] })),
    ])
      .then(([detail, tpl]) => {
        if (!active) return;
        applyDetail(detail.data);
        setTemplates(tpl.data);
      })
      .catch((e) => active && setLoadError(e instanceof ApiError && e.status === 404 ? 'Submission not found.' : errorMessage(e)));
    return () => {
      active = false;
    };
  }, [id, applyDetail, canSeeTemplates]);

  const hasInv = inv !== null;
  useEffect(() => {
    if (!hasInv) return;
    let active = true;
    api<Guest[]>(`/admin/invitations/${id}/guests`, { query: { page: guestPage, limit: 20, search: guestSearch.trim() } })
      .then((res) => {
        if (!active) return;
        setGuests(res.data);
        setGuestMeta(res.meta ?? null);
      })
      .catch(() => undefined);
    return () => {
      active = false;
    };
  }, [hasInv, id, guestPage, guestSearch]);

  useEffect(() => {
    if (!hasInv || !canUpdate) return;
    let active = true;
    api<Wish[]>(`/admin/invitations/${id}/wishes`, { query: { limit: 100 } })
      .then(({ data }) => active && setWishes(data))
      .catch(() => active && setWishes([]));
    return () => {
      active = false;
    };
  }, [hasInv, id, canUpdate]);

  if (loadError) {
    return (
      <div className="max-w-xl">
        <Notice tone="error">{loadError}</Notice>
        <Link href="/submissions" className={`${secondaryButton} mt-4`}>
          <ArrowLeft size={16} /> Back to submissions
        </Link>
      </div>
    );
  }
  if (!inv) return <Spinner />;

  const couple = inv.groomName || inv.brideName ? `${inv.groomName ?? '—'} & ${inv.brideName ?? '—'}` : 'Couple not entered yet';
  const liveUrl = inv.slug ? `${WEBSITE_URL}/invite/${inv.slug}` : null;
  const venue = [inv.venueName, inv.venueAddress].filter(Boolean).join(', ');
  const mapHref = inv.mapUrl ?? (venue ? `https://maps.google.com/?q=${encodeURIComponent(venue)}` : null);

  // ---- status
  const openStatus = (target: InvitationStatus) => {
    setStatusTarget(target);
    setStatusErrors({});
    setStatusForm({ paymentAmount: inv.payment.amount?.toString() ?? '', paymentReference: inv.payment.reference ?? '', note: '' });
  };

  const changeStatus = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!statusTarget) return;
    if (statusTarget === 'paid' && statusForm.paymentAmount && Number.isNaN(Number(statusForm.paymentAmount))) {
      setStatusErrors({ paymentAmount: 'Enter a number' });
      return;
    }
    setBusy(true);
    try {
      const { data } = await api<InvitationDetail>(`/admin/invitations/${id}/status`, {
        method: 'PATCH',
        body: {
          status: statusTarget,
          ...(statusTarget === 'paid' && statusForm.paymentAmount !== '' ? { paymentAmount: Number(statusForm.paymentAmount) } : {}),
          ...(statusTarget === 'paid' ? { paymentReference: statusForm.paymentReference } : {}),
          note: statusForm.note,
        },
      });
      applyDetail(data);
      setStatusTarget(null);
      toast(statusTarget === 'paid' ? 'Marked as paid. The customer has been notified by e-mail.' : `Status changed to ${statusTarget}.`);
    } catch (err) {
      if (err instanceof ApiError && err.code === 'VALIDATION_ERROR') setStatusErrors(err.fieldErrors());
      else toast(errorMessage(err), 'error');
    } finally {
      setBusy(false);
    }
  };

  const saveNotes = async () => {
    setSavingNotes(true);
    try {
      const { data } = await api<InvitationDetail>(`/admin/invitations/${id}`, { method: 'PATCH', body: { staffNotes: notes } });
      applyDetail(data);
      toast('Notes saved.');
    } catch (err) {
      toast(errorMessage(err), 'error');
    } finally {
      setSavingNotes(false);
    }
  };

  const remove = async () => {
    if (!confirm(`Delete submission ${inv.referenceNo}? This removes its guests, wishes and photos and cannot be undone.`)) return;
    setBusy(true);
    try {
      await api(`/admin/invitations/${id}`, { method: 'DELETE' });
      toast('Submission deleted.');
      router.replace('/submissions');
    } catch (err) {
      toast(errorMessage(err), 'error');
      setBusy(false);
    }
  };

  // ---- photos
  const pickPhotos = (category: PhotoCategory) => {
    uploadCategory.current = category;
    fileInput.current?.click();
  };

  const uploadPhotos = async (files: File[]) => {
    const category = uploadCategory.current;
    setPhotoBusy(category);
    try {
      let photos: Photos = inv.photos;
      const batch = category === 'gallery' ? files : files.slice(0, 1);
      for (let i = 0; i < batch.length; i += 10) {
        const form = new FormData();
        form.append('category', category);
        batch.slice(i, i + 10).forEach((f) => form.append('photos', f));
        photos = (await api<Photos>(`/admin/invitations/${id}/photos`, { method: 'POST', form })).data;
      }
      setInv({ ...inv, photos });
      toast('Photos uploaded.');
    } catch (err) {
      toast(errorMessage(err), 'error');
    } finally {
      setPhotoBusy(null);
    }
  };

  const deletePhoto = async (photo: Photo) => {
    if (!confirm('Delete this photo?')) return;
    setPhotoBusy(photo.category);
    try {
      const { data } = await api<Photos>(`/admin/invitations/${id}/photos/${photo.id}`, { method: 'DELETE' });
      setInv({ ...inv, photos: data });
    } catch (err) {
      toast(errorMessage(err), 'error');
    } finally {
      setPhotoBusy(null);
    }
  };

  // ---- wishes
  const toggleWish = async (wish: Wish) => {
    try {
      const { data } = await api<Wish>(`/admin/invitations/${id}/wishes/${wish.id}`, { method: 'PATCH', body: { isVisible: !wish.isVisible } });
      setWishes((list) => list?.map((w) => (w.id === wish.id ? data : w)) ?? null);
    } catch (err) {
      toast(errorMessage(err), 'error');
    }
  };
  const deleteWish = async (wish: Wish) => {
    if (!confirm('Delete this wish?')) return;
    try {
      await api(`/admin/invitations/${id}/wishes/${wish.id}`, { method: 'DELETE' });
      setWishes((list) => list?.filter((w) => w.id !== wish.id) ?? null);
    } catch (err) {
      toast(errorMessage(err), 'error');
    }
  };

  const allPhotos: { label: string; category: PhotoCategory; photo: Photo | null }[] = [
    { label: 'Cover', category: 'cover', photo: inv.photos.cover },
    { label: 'Groom', category: 'groom', photo: inv.photos.groom },
    { label: 'Bride', category: 'bride', photo: inv.photos.bride },
  ];

  return (
    <div>
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-8 mt-12 md:mt-0">
        <div className="flex items-center gap-4">
          <Link href="/submissions" className="p-2 bg-white border border-gray-200 rounded-full text-gray-500 hover:bg-gray-50 shadow-sm" aria-label="Back">
            <ArrowLeft size={20} />
          </Link>
          <div>
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-2xl font-bold text-[#4A3428] font-playfair">{couple}</h1>
              <StatusBadge status={inv.status} />
            </div>
            <p className="text-sm text-gray-500 mt-0.5">
              <span className="font-mono">{inv.referenceNo}</span> · {inv.template.name} · created {formatDate(inv.createdAt)}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {liveUrl && inv.status === 'paid' && (
            <a href={liveUrl} target="_blank" rel="noopener noreferrer" className={secondaryButton}>
              <ExternalLink size={16} /> Open invitation
            </a>
          )}
          {canUpdate && (
            <button onClick={() => setEditing(true)} className={secondaryButton}>
              <Edit size={16} /> Edit details
            </button>
          )}
          {canDelete && (
            <button onClick={remove} disabled={busy} className={dangerButton}>
              <Trash2 size={16} /> Delete
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
        {/* LEFT */}
        <div className="xl:col-span-8 space-y-6">
          <Card>
            <CardHeader icon={<Heart size={18} />} title="Wedding Details" />
            <dl className="p-6 grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-5">
              <Detail label="Groom">{inv.groomName}</Detail>
              <Detail label="Bride">{inv.brideName}</Detail>
              <Detail label="Groom's phone">{inv.groomPhone}</Detail>
              <Detail label="Bride's phone">{inv.bridePhone}</Detail>
              <Detail label="Groom's parents">{inv.groomParents}</Detail>
              <Detail label="Bride's parents">{inv.brideParents}</Detail>
              <Detail label="Wedding date & time">
                {inv.weddingDate && (
                  <span className="flex items-center gap-1.5">
                    <Calendar size={14} className="text-[#D4AF37]" /> {formatDate(inv.weddingDate)} {inv.weddingTime && `· ${formatTime(inv.weddingTime)}`}
                  </span>
                )}
              </Detail>
              <Detail label="RSVP deadline">{inv.rsvpDeadline && formatDate(inv.rsvpDeadline)}</Detail>
              <div className="md:col-span-2">
                <Detail label="Venue">
                  {venue && (
                    <span className="flex items-center gap-1.5 flex-wrap">
                      <MapPin size={14} className="text-[#D4AF37]" /> {venue}
                      {mapHref && (
                        <a href={mapHref} target="_blank" rel="noopener noreferrer" className="text-xs text-[#A68A5E] hover:underline">
                          (map)
                        </a>
                      )}
                    </span>
                  )}
                </Detail>
              </div>
              <div className="md:col-span-2">
                <Detail label="Invitation message">{inv.greetingMessage && <span className="whitespace-pre-line">{inv.greetingMessage}</span>}</Detail>
              </div>
              <div className="md:col-span-2">
                <dt className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-2">Events schedule</dt>
                {inv.eventsSchedule.length ? (
                  <ol className="space-y-1.5">
                    {inv.eventsSchedule.map((e, i) => (
                      <li key={i} className="flex gap-3 text-sm">
                        <span className="w-20 shrink-0 font-semibold text-[#A68A5E]">{formatTime(e.time) || '—'}</span>
                        <span className="text-[#4A3428]">
                          {e.name}
                          {e.venue && <span className="text-gray-400"> · {e.venue}</span>}
                        </span>
                      </li>
                    ))}
                  </ol>
                ) : (
                  <span className="text-gray-300 text-sm">—</span>
                )}
              </div>
              {Object.keys(inv.extraDetails).length > 0 && (
                <div className="md:col-span-2">
                  <dt className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-2">Extra details</dt>
                  <dd className="grid grid-cols-2 gap-2 text-sm">
                    {Object.entries(inv.extraDetails).map(([k, v]) => (
                      <span key={k}>
                        <span className="text-gray-400">{k}:</span> {String(v)}
                      </span>
                    ))}
                  </dd>
                </div>
              )}
            </dl>
          </Card>

          {/* Photos */}
          <Card>
            <CardHeader
              icon={<ImagePlus size={18} />}
              title={`Photos (${(inv.photos.cover ? 1 : 0) + (inv.photos.groom ? 1 : 0) + (inv.photos.bride ? 1 : 0) + inv.photos.gallery.length})`}
              action={
                canUpdate && (
                  <button onClick={() => pickPhotos('gallery')} disabled={photoBusy !== null} className={`${smallButton} bg-[#FAF7F2] text-[#A68A5E] hover:bg-[#F3EAD9]`}>
                    {photoBusy === 'gallery' ? <Loader2 size={14} className="animate-spin" /> : <ImagePlus size={14} />} Add to gallery
                  </button>
                )
              }
            />
            <input
              ref={fileInput}
              type="file"
              multiple
              accept="image/jpeg,image/png,image/webp"
              className="hidden"
              onChange={(e) => {
                const files = Array.from(e.target.files ?? []);
                e.target.value = '';
                if (files.length) uploadPhotos(files);
              }}
            />
            <div className="p-6 space-y-5">
              <div className="grid grid-cols-3 gap-4">
                {allPhotos.map(({ label, category, photo }) => (
                  <div key={category} className="space-y-1.5">
                    <p className={labelClass}>{label}</p>
                    <div className="relative aspect-[4/5] rounded-xl overflow-hidden bg-gray-50 border border-gray-100 flex items-center justify-center">
                      {photo ? (
                        <button onClick={() => setLightbox(photo)} className="absolute inset-0">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={photo.url} alt={label} className="w-full h-full object-cover" />
                        </button>
                      ) : (
                        <span className="text-xs text-gray-300">No photo</span>
                      )}
                      {photoBusy === category && (
                        <div className="absolute inset-0 bg-white/70 flex items-center justify-center">
                          <Loader2 className="animate-spin text-[#D4AF37]" />
                        </div>
                      )}
                    </div>
                    {canUpdate && (
                      <div className="flex gap-1">
                        <button onClick={() => pickPhotos(category)} disabled={photoBusy !== null} className={`${smallButton} flex-1 justify-center bg-gray-50 text-gray-600 hover:bg-gray-100`}>
                          {photo ? 'Replace' : 'Upload'}
                        </button>
                        {photo && (
                          <button onClick={() => deletePhoto(photo)} disabled={photoBusy !== null} className={`${smallButton} bg-red-50 text-red-600 hover:bg-red-100`} aria-label={`Delete ${label} photo`}>
                            <Trash2 size={12} />
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
              <div>
                <p className={`${labelClass} mb-2`}>Gallery ({inv.photos.gallery.length})</p>
                {inv.photos.gallery.length ? (
                  <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                    {inv.photos.gallery.map((p) => (
                      <div key={p.id} className="relative aspect-square rounded-lg overflow-hidden group">
                        <button onClick={() => setLightbox(p)} className="absolute inset-0">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={p.url} alt="Gallery" className="w-full h-full object-cover" />
                        </button>
                        {canUpdate && (
                          <button
                            onClick={() => deletePhoto(p)}
                            className="absolute top-1 right-1 bg-white/90 p-1 rounded-full text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                            aria-label="Delete photo"
                          >
                            <Trash2 size={12} />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-gray-300">No gallery photos.</p>
                )}
              </div>
            </div>
          </Card>

          {/* Guests */}
          <Card className="overflow-hidden">
            <CardHeader
              icon={<Users size={18} />}
              title="Guests"
              action={
                <input
                  value={guestSearch}
                  onChange={(e) => {
                    setGuestSearch(e.target.value);
                    setGuestPage(1);
                  }}
                  placeholder="Search guests…"
                  className="px-3 py-1.5 rounded-lg border border-gray-200 text-xs outline-none focus:border-[#D4AF37] w-40"
                />
              }
            />
            <div className="grid grid-cols-3 sm:grid-cols-6 gap-3 p-5 border-b border-gray-50 text-center">
              {[
                ['Guests', inv.guestStats.total],
                ['E-mailed', inv.guestStats.email.sent],
                ['Failed', inv.guestStats.email.failed],
                ['Attending', inv.guestStats.rsvp.attending],
                ['Declined', inv.guestStats.rsvp.declined],
                ['Heads', inv.guestStats.rsvp.attendingHeadCount],
              ].map(([label, value]) => (
                <div key={label as string} className="bg-[#FAF7F2] rounded-xl p-2">
                  <p className="text-lg font-bold text-[#4A3428]">{value}</p>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400">{label}</p>
                </div>
              ))}
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse whitespace-nowrap">
                <thead>
                  <tr className="bg-gray-50/50 text-gray-400 text-[10px] font-bold uppercase tracking-wider">
                    <th className="px-6 py-3">Guest</th>
                    <th className="px-6 py-3">E-mail status</th>
                    <th className="px-6 py-3">RSVP</th>
                    <th className="px-6 py-3 text-right">Heads</th>
                  </tr>
                </thead>
                <tbody className="text-sm text-gray-600 divide-y divide-gray-50">
                  {guests.map((g) => (
                    <tr key={g.id}>
                      <td className="px-6 py-3">
                        <div className="font-semibold text-[#4A3428]">{g.name}</div>
                        <div className="text-xs text-gray-400">{[g.email, g.phone].filter(Boolean).join(' · ')}</div>
                      </td>
                      <td className="px-6 py-3">
                        <span className={`text-[10px] font-bold uppercase px-2 py-1 rounded-md ${EMAIL_STATUS[g.emailStatus]}`} title={g.emailError ?? undefined}>
                          {g.emailStatus.replace('_', ' ')}
                        </span>
                      </td>
                      <td className="px-6 py-3 text-xs capitalize">{g.rsvpStatus}</td>
                      <td className="px-6 py-3 text-right">{g.rsvpStatus === 'attending' ? g.headCount : '—'}</td>
                    </tr>
                  ))}
                  {guests.length === 0 && <EmptyRow colSpan={4}>{inv.status === 'paid' ? 'The customer has not added guests yet.' : 'Guests can be added after payment.'}</EmptyRow>}
                </tbody>
              </table>
            </div>
            {guestMeta && <Pagination page={guestMeta.page} totalPages={guestMeta.totalPages} total={guestMeta.total} onChange={setGuestPage} />}
            {inv.emailBatches.length > 0 && (
              <div className="p-5 border-t border-gray-50">
                <p className={`${labelClass} mb-2`}>E-mail batches</p>
                <ul className="space-y-1 text-xs text-gray-500">
                  {inv.emailBatches.map((b) => (
                    <li key={b.id} className="flex items-center gap-2">
                      <Mail size={12} className="text-[#D4AF37]" /> {formatDate(b.createdAt, true)} — {b.sentCount}/{b.totalCount} sent
                      {b.failedCount > 0 && <span className="text-red-500">, {b.failedCount} failed</span>} · <span className="capitalize">{b.status.replace(/_/g, ' ')}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </Card>

          {/* Wishes */}
          {canUpdate && wishes && wishes.length > 0 && (
            <Card>
              <CardHeader icon={<MessageCircle size={18} />} title={`Wishes (${wishes.length})`} />
              <ul className="divide-y divide-gray-50">
                {wishes.map((w) => (
                  <li key={w.id} className={`px-6 py-3 flex items-start justify-between gap-3 ${w.isVisible ? '' : 'opacity-50'}`}>
                    <div>
                      <p className="text-sm text-gray-700 italic">&ldquo;{w.message}&rdquo;</p>
                      <p className="text-xs text-gray-400 mt-0.5">
                        {w.name} · {formatDate(w.createdAt, true)}
                      </p>
                    </div>
                    <div className="flex gap-1 shrink-0">
                      <button onClick={() => toggleWish(w)} className={`${smallButton} bg-gray-50 text-gray-600 hover:bg-gray-100`}>
                        {w.isVisible ? <EyeOff size={12} /> : <Eye size={12} />} {w.isVisible ? 'Hide' : 'Show'}
                      </button>
                      <button onClick={() => deleteWish(w)} className={`${smallButton} bg-red-50 text-red-600 hover:bg-red-100`} aria-label="Delete wish">
                        <Trash2 size={12} />
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            </Card>
          )}
        </div>

        {/* RIGHT */}
        <div className="xl:col-span-4 space-y-6">
          <Card>
            <CardHeader icon={<Wallet size={18} />} title="Status & Payment" />
            <div className="p-5 space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-500">Current status</span>
                <StatusBadge status={inv.status} />
              </div>
              <dl className="space-y-3">
                <Detail label="Submitted">{inv.submittedAt && formatDate(inv.submittedAt, true)}</Detail>
                <Detail label="Paid">{inv.paidAt && formatDate(inv.paidAt, true)}</Detail>
                <Detail label="Amount">{inv.payment.amount !== null && formatMoney(inv.payment.amount)}</Detail>
                <Detail label="Payment reference">{inv.payment.reference}</Detail>
                <Detail label="Confirmed by">{inv.payment.markedBy?.name}</Detail>
                <Detail label="Invitation link">
                  {liveUrl && (
                    <a href={liveUrl} target="_blank" rel="noopener noreferrer" className="text-[#A68A5E] hover:underline break-all text-xs">
                      {liveUrl}
                    </a>
                  )}
                </Detail>
              </dl>
              {inv.status === 'pending' && <Notice tone="warning">Waiting for payment. Mark it as paid once the payment is received — the customer can then send invitations.</Notice>}
              {canChangeStatus ? (
                <div className="flex flex-col gap-2 pt-2">
                  {TRANSITIONS[inv.status].map((target) => {
                    const action = ACTION_LABEL[target];
                    const Icon = action.icon;
                    return (
                      <button
                        key={target}
                        onClick={() => openStatus(target)}
                        className={target === 'paid' ? goldButton : target === 'cancelled' ? dangerButton : secondaryButton}
                      >
                        <Icon size={16} /> {inv.status === 'cancelled' && target === 'pending' ? 'Reopen (Pending)' : action.label}
                      </button>
                    );
                  })}
                </div>
              ) : (
                <p className="text-xs text-gray-400">You do not have permission to change the status.</p>
              )}
            </div>
          </Card>

          <Card>
            <CardHeader icon={<User size={18} />} title="Customer" />
            <div className="p-5 space-y-2 text-sm">
              <p className="font-bold text-[#4A3428] text-base">{inv.customer.fullName}</p>
              <a href={`mailto:${inv.customer.email}`} className="flex items-center gap-2 text-gray-600 hover:text-[#A68A5E]">
                <Mail size={14} className="text-gray-400" /> {inv.customer.email}
              </a>
              <a href={`tel:${inv.customer.phone}`} className="flex items-center gap-2 text-gray-600 hover:text-[#A68A5E]">
                <Phone size={14} className="text-gray-400" /> {inv.customer.phone}
              </a>
              <a
                href={`https://wa.me/${inv.customer.phone.replace(/[^0-9]/g, '').replace(/^0/, '94')}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 text-green-600 hover:underline"
              >
                <MessageCircle size={14} /> WhatsApp
              </a>
              {can(user, 'customers.view') && (
                <Link href={`/customers/${inv.customer.id}`} className="inline-block pt-2 text-xs font-semibold text-[#A68A5E] hover:underline">
                  View customer profile →
                </Link>
              )}
            </div>
          </Card>

          <Card>
            <CardHeader icon={<StickyNote size={18} />} title="Internal Notes" />
            <div className="p-5 space-y-3">
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                disabled={!canUpdate}
                rows={4}
                maxLength={5000}
                placeholder="Only visible to the sales team…"
                className={`${inputClass} resize-y`}
              />
              {canUpdate && (
                <button onClick={saveNotes} disabled={savingNotes || notes === (inv.staffNotes ?? '')} className={`${primaryButton} w-full`}>
                  {savingNotes ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />} Save notes
                </button>
              )}
            </div>
          </Card>

          <Card>
            <CardHeader icon={<History size={18} />} title="Status History" />
            <ol className="p-5 space-y-4">
              {inv.statusHistory.map((h) => (
                <li key={h.id} className="flex gap-3">
                  <Clock size={14} className="text-[#D4AF37] mt-1 shrink-0" />
                  <div className="text-sm">
                    <p className="text-[#4A3428]">
                      {h.fromStatus ? `${h.fromStatus} → ` : ''}
                      <span className="font-bold capitalize">{h.toStatus}</span>
                    </p>
                    <p className="text-xs text-gray-400">
                      {formatDate(h.createdAt, true)} · {h.changedBy.name ?? h.changedBy.type} ({h.changedBy.type})
                    </p>
                    {h.note && <p className="text-xs text-gray-500 mt-0.5 italic">{h.note}</p>}
                  </div>
                </li>
              ))}
              {inv.statusHistory.length === 0 && <p className="text-sm text-gray-400">No status changes yet.</p>}
            </ol>
          </Card>
        </div>
      </div>

      {editing && (
        <EditDetailsModal
          invitation={inv}
          templates={templates}
          onClose={() => setEditing(false)}
          onSaved={(data) => {
            applyDetail(data);
            setEditing(false);
            toast('Details updated.');
          }}
        />
      )}

      {statusTarget && (
        <Modal title={ACTION_LABEL[statusTarget].label} onClose={() => setStatusTarget(null)}>
          <form onSubmit={changeStatus} className="space-y-4">
            <p className="text-sm text-gray-500">
              {inv.referenceNo} · {couple}
            </p>
            {statusTarget === 'paid' && (
              <>
                <div className="space-y-1.5">
                  <label className={labelClass}>Amount received (LKR)</label>
                  <input
                    type="number"
                    min={0}
                    step="0.01"
                    value={statusForm.paymentAmount}
                    onChange={(e) => setStatusForm({ ...statusForm, paymentAmount: e.target.value })}
                    className={inputClass}
                    placeholder="e.g. 15000"
                  />
                  <FieldError message={statusErrors.paymentAmount} />
                </div>
                <div className="space-y-1.5">
                  <label className={labelClass}>Payment reference</label>
                  <input
                    value={statusForm.paymentReference}
                    maxLength={100}
                    onChange={(e) => setStatusForm({ ...statusForm, paymentReference: e.target.value })}
                    className={inputClass}
                    placeholder="Bank slip / transaction ID"
                  />
                  <FieldError message={statusErrors.paymentReference} />
                </div>
              </>
            )}
            {statusTarget === 'cancelled' && <Notice tone="warning">The invitation page will stop working for guests.</Notice>}
            {statusTarget === 'pending' && inv.status === 'paid' && <Notice tone="warning">The invitation page will be offline until it is marked as paid again.</Notice>}
            <div className="space-y-1.5">
              <label className={labelClass}>Note (optional)</label>
              <textarea
                rows={2}
                maxLength={500}
                value={statusForm.note}
                onChange={(e) => setStatusForm({ ...statusForm, note: e.target.value })}
                className={`${inputClass} resize-none`}
                placeholder="Saved in the status history"
              />
              <FieldError message={statusErrors.note} />
            </div>
            <div className="flex justify-end gap-2">
              <button type="button" onClick={() => setStatusTarget(null)} className={secondaryButton}>
                Close
              </button>
              <button type="submit" disabled={busy} className={statusTarget === 'cancelled' ? dangerButton : statusTarget === 'paid' ? goldButton : primaryButton}>
                {busy && <Loader2 size={16} className="animate-spin" />} Confirm
              </button>
            </div>
          </form>
        </Modal>
      )}

      {lightbox && (
        <Modal title={`${lightbox.category} photo`} onClose={() => setLightbox(null)} wide>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={lightbox.url} alt={lightbox.category} className="w-full h-auto rounded-xl" />
          <a href={lightbox.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 mt-3 text-xs text-[#A68A5E] hover:underline">
            <ExternalLink size={12} /> Open original
          </a>
        </Modal>
      )}
    </div>
  );
}

export default function SubmissionDetailPage() {
  return (
    <RequirePermission permission="invitations.view">
      <SubmissionDetail />
    </RequirePermission>
  );
}
