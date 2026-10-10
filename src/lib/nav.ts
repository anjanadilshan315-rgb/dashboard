import { ClipboardList, LayoutDashboard, MessageSquare, Palette, ShieldCheck, UserCircle, Users } from 'lucide-react';
import { can } from './session';
import type { Permission, StaffUser } from './types';

export interface NavItem {
  href: string;
  label: string;
  icon: typeof LayoutDashboard;
  permission?: Permission;
  adminOnly?: boolean;
}

export const NAV_ITEMS: NavItem[] = [
  { href: '/', label: 'Dashboard', icon: LayoutDashboard, permission: 'dashboard.view' },
  { href: '/submissions', label: 'Customer Registrations', icon: ClipboardList, permission: 'invitations.view' },
  { href: '/customers', label: 'Customers', icon: Users, permission: 'customers.view' },
  { href: '/users', label: 'User Management', icon: ShieldCheck, adminOnly: true },
  { href: '/templates', label: 'Templates', icon: Palette, permission: 'templates.view' },
  { href: '/messages', label: 'Messages', icon: MessageSquare, permission: 'messages.view' },
  { href: '/profile', label: 'My Profile', icon: UserCircle },
];

export function allowed(user: StaffUser, item: NavItem): boolean {
  if (item.adminOnly) return user.role === 'admin';
  return item.permission ? can(user, item.permission) : true;
}

/** Where to send a user who may not see the dashboard overview. */
export function firstAllowedPath(user: StaffUser): string {
  return NAV_ITEMS.find((item) => allowed(user, item))?.href ?? '/profile';
}
