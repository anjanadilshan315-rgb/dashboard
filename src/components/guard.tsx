'use client';

import React from 'react';
import Link from 'next/link';
import { Lock } from 'lucide-react';
import { can, useSession } from '@/lib/session';
import type { Permission } from '@/lib/types';
import { Card } from './ui';

/** Renders children only when the logged-in staff user has the permission(s) or is admin. */
export function RequirePermission({ permission, adminOnly = false, children }: { permission?: Permission; adminOnly?: boolean; children: React.ReactNode }) {
  const { session } = useSession();
  const user = session?.user ?? null;
  const ok = adminOnly ? user?.role === 'admin' : permission ? can(user, permission) : Boolean(user);
  if (ok) return <>{children}</>;
  return (
    <Card className="max-w-lg mx-auto mt-16 p-10 text-center">
      <Lock className="w-10 h-10 mx-auto text-[#D4AF37] mb-4" />
      <h1 className="text-xl font-bold text-[#4A3428]">No access</h1>
      <p className="text-sm text-gray-500 mt-2">You do not have permission to view this page. Ask an administrator to grant you access.</p>
      <Link href="/profile" className="inline-block mt-6 text-sm font-semibold text-[#A68A5E] hover:underline">
        Go to my profile
      </Link>
    </Card>
  );
}
