import Link from 'next/link';
import type { PublicUser } from '@/lib/users';
import { SiteHeaderNav } from '@/components/SiteHeaderNav';

interface SiteHeaderProps {
  siteName: string;
  user: PublicUser | null;
}

export function SiteHeader({ siteName, user }: SiteHeaderProps) {
  return (
    <header className="border-b border-stone-200 bg-white shrink-0">
      <div className="mx-auto max-w-5xl px-4 py-2 lg:py-3 flex items-center justify-between gap-2">
        <Link href="/" className="text-lg font-bold text-stone-900">
          {siteName}
        </Link>
        <SiteHeaderNav user={user} />
      </div>
    </header>
  );
}
