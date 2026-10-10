/** Shapes returned by the backend admin API (see backend/README.md). */

export type Permission =
  | 'dashboard.view'
  | 'customers.view'
  | 'customers.create'
  | 'customers.update'
  | 'customers.delete'
  | 'invitations.view'
  | 'invitations.update'
  | 'invitations.update_status'
  | 'invitations.delete'
  | 'messages.view'
  | 'messages.manage'
  | 'templates.view';

export type StaffRole = 'admin' | 'user';
export type InvitationStatus = 'draft' | 'pending' | 'paid' | 'cancelled';
export type RsvpStatus = 'pending' | 'attending' | 'declined';
export type GuestEmailStatus = 'not_sent' | 'queued' | 'sent' | 'failed';
export type PhotoCategory = 'cover' | 'groom' | 'bride' | 'gallery';

export interface StaffUser {
  id: number;
  name: string;
  email: string;
  phone: string | null;
  role: StaffRole;
  isActive: boolean;
  permissions: Permission[];
  lastLoginAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface PermissionInfo {
  group: string;
  key: Permission;
  description: string;
}

export interface Customer {
  id: number;
  firstName: string;
  lastName: string;
  fullName: string;
  email: string;
  phone: string;
  isActive: boolean;
  lastLoginAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CustomerListItem extends Customer {
  invitationCount: number;
  pendingCount: number;
  paidCount: number;
}

export interface Template {
  id: number;
  code: string;
  name: string;
  description: string | null;
  category: string | null;
  previewImageUrl: string | null;
  demoSlug: string | null;
  price: number | null;
  isActive: boolean;
  sortOrder: number;
}

export interface Photo {
  id: number;
  category: PhotoCategory;
  url: string;
  width: number | null;
  height: number | null;
  sortOrder: number;
}

export interface Photos {
  cover: Photo | null;
  groom: Photo | null;
  bride: Photo | null;
  gallery: Photo[];
}

export interface EventItem {
  name: string;
  time: string;
  venue?: string;
  description?: string;
}

export interface InvitationSummary {
  id: number;
  referenceNo: string | null;
  status: InvitationStatus;
  currentStep: number;
  template: { id: number; code: string; name: string };
  groomName: string | null;
  brideName: string | null;
  weddingDate: string | null;
  slug: string | null;
  inviteUrl: string | null;
  submittedAt: string | null;
  paidAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface InvitationListItem extends InvitationSummary {
  customer: { id: number; firstName: string; lastName: string; fullName: string; email: string; phone: string };
  paymentAmount: number | null;
}

export interface GuestStats {
  total: number;
  withEmail: number;
  email: { notSent: number; queued: number; sent: number; failed: number };
  rsvp: { pending: number; attending: number; declined: number; attendingHeadCount: number };
}

export interface StatusHistory {
  id: number;
  fromStatus: InvitationStatus | null;
  toStatus: InvitationStatus;
  changedBy: { type: 'customer' | 'staff' | 'system'; id: number | null; name: string | null };
  note: string | null;
  createdAt: string;
}

export interface EmailBatch {
  id: number;
  status: 'queued' | 'processing' | 'completed' | 'completed_with_errors';
  totalCount: number;
  sentCount: number;
  failedCount: number;
  progress: number;
  createdAt: string;
  completedAt: string | null;
}

export interface InvitationDetail extends InvitationListItem {
  groomPhone: string | null;
  bridePhone: string | null;
  groomParents: string | null;
  brideParents: string | null;
  weddingTime: string | null;
  rsvpDeadline: string | null;
  venueName: string | null;
  venueAddress: string | null;
  mapUrl: string | null;
  greetingMessage: string | null;
  eventsSchedule: EventItem[];
  extraDetails: Record<string, unknown>;
  photos: Photos;
  payment: { amount: number | null; reference: string | null; markedBy: { id: number; name: string | null } | null };
  staffNotes: string | null;
  statusHistory: StatusHistory[];
  guestStats: GuestStats;
  emailBatches: EmailBatch[];
}

export interface Guest {
  id: number;
  name: string;
  email: string | null;
  phone: string | null;
  inviteUrl: string | null;
  emailStatus: GuestEmailStatus;
  emailError: string | null;
  emailSentAt: string | null;
  rsvpStatus: RsvpStatus;
  headCount: number;
  respondedAt: string | null;
}

export interface Wish {
  id: number;
  name: string;
  message: string;
  isVisible: boolean;
  createdAt: string;
}

export interface ContactMessage {
  id: number;
  name: string;
  email: string;
  phone: string | null;
  subject: string | null;
  message: string;
  isRead: boolean;
  createdAt: string;
}

export interface DashboardStats {
  customers: { total: number; newThisMonth: number };
  invitations: Record<InvitationStatus, number> & { total: number };
  revenue: { total: number; thisMonth: number };
  unreadMessages: number;
  emailsSent: number;
  recentPendingSubmissions: InvitationListItem[];
}
