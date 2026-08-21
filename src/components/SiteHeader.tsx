import Link from 'next/link';
import { getCurrentPublicUser } from '@/lib/user-session';
import { SiteHeaderNav } from '@/components/SiteHeaderNav';

interface SiteHeaderProps {
  siteName: string;
}

export async function SiteHeader({ siteName }: SiteHeaderProps) {
  const user = await getCurrentPublicUser();

  return (
    <header className="hidden lg:block border-b border-stone-200 bg-white shrink-0">
      <div className="mx-auto max-w-5xl px-4 py-3 flex flex-wrap items-center justify-between gap-2">
        <Link href="/" className="text-lg font-bold text-stone-900">
          {siteName}
        </Link>
        <SiteHeaderNav user={user} />
      </div>
    </header>
  );
}
