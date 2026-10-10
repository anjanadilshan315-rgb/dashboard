'use client';

import { useSyncExternalStore } from 'react';
import { getSession, onSessionChange, type Session } from './api';
import type { Permission, StaffUser } from './types';

let cachedRaw: string | null = null;
let cachedSession: Session | null = null;

function snapshot(): Session | null {
  const session = getSession();
  const raw = session ? JSON.stringify(session) : null;
  if (raw !== cachedRaw) {
    cachedRaw = raw;
    cachedSession = session;
  }
  return cachedSession;
}

const noopSubscribe = () => () => undefined;

export function useSession(): { session: Session | null; ready: boolean } {
  const session = useSyncExternalStore(onSessionChange, snapshot, () => null);
  const ready = useSyncExternalStore(noopSubscribe, () => true, () => false);
  return { session, ready };
}

/** Admins have every permission. */
export function can(user: StaffUser | null | undefined, ...permissions: Permission[]): boolean {
  if (!user) return false;
  if (user.role === 'admin') return true;
  return permissions.every((p) => user.permissions.includes(p));
}
