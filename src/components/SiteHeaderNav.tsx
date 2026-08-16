'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import type { PublicUser } from '@/lib/users';

type SiteHeaderNavProps = {
  user: PublicUser | null;
};

export function SiteHeaderNav({ user }: SiteHeaderNavProps) {
  const router = useRouter();

  async function handleLogout() {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/');
    router.refresh();
  }

  return (
    <nav className="flex items-center gap-5 text-sm font-medium">
      <Link href="/" className="text-stone-600 hover:text-emerald-700 transition-colors">
        Posts
      </Link>
      <Link href="/map" className="text-stone-600 hover:text-emerald-700 transition-colors">
        Map
      </Link>
      {user ? (
        <>
          <Link
            href={`/u/${user.username}`}
            className="text-stone-600 hover:text-emerald-700 transition-colors"
          >
            Profile
          </Link>
          <Link
            href="/admin/new"
            prefetch={false}
            className="text-emerald-700 hover:text-emerald-900 transition-colors"
          >
            + New Post
          </Link>
          <button
            type="button"
            onClick={() => void handleLogout()}
            className="text-stone-500 hover:text-stone-800 transition-colors"
          >
            Sign out
          </button>
        </>
      ) : (
        <>
          <Link
            href="/admin/new"
            prefetch={false}
            className="text-emerald-700 hover:text-emerald-900 transition-colors"
          >
            + New Post
          </Link>
          <Link href="/login" className="text-stone-500 hover:text-stone-700 transition-colors">
            Sign in
          </Link>
        </>
      )}
    </nav>
  );
}
