import Link from 'next/link';

interface SiteHeaderProps {
  siteName: string;
}

export function SiteHeader({ siteName }: SiteHeaderProps) {
  return (
    <header className="border-b border-stone-200 bg-white shrink-0">
      <div className="mx-auto max-w-5xl px-4 py-4 flex items-center justify-between">
        <Link href="/" className="text-lg font-bold text-stone-900">
          {siteName}
        </Link>
        <nav className="flex items-center gap-5 text-sm font-medium">
          <Link href="/" className="text-stone-600 hover:text-emerald-700 transition-colors">
            Posts
          </Link>
          <Link href="/map" className="text-stone-600 hover:text-emerald-700 transition-colors">
            Map
          </Link>
          <Link
            href="/admin/new"
            prefetch={false}
            className="text-emerald-700 hover:text-emerald-900 transition-colors"
          >
            + New Post
          </Link>
        </nav>
      </div>
    </header>
  );
}
