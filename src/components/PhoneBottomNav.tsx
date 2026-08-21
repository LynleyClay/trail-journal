'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { phoneMapHref, phoneNavActive, type PhoneNavId } from '@/lib/phone-nav';

const ITEMS: { id: PhoneNavId; href: string; label: string; icon: typeof JournalIcon }[] = [
  { id: 'journal', href: '/', label: 'Journal', icon: JournalIcon },
  { id: 'map', href: '/map', label: 'Map', icon: MapIcon },
  { id: 'note', href: '/note', label: 'Note', icon: NoteIcon },
];

type PhoneBottomNavProps = {
  isLoggedIn: boolean;
};

export function PhoneBottomNav({ isLoggedIn }: PhoneBottomNavProps) {
  const pathname = usePathname() ?? '/';
  const active = phoneNavActive(pathname);

  return (
    <nav
      className="lg:hidden shrink-0 border-t border-stone-200 bg-white pb-[env(safe-area-inset-bottom)]"
      aria-label="Trail shortcuts"
    >
      <ul className="grid grid-cols-3">
        {ITEMS.map((item) => {
          const Icon = item.icon;
          const isActive = item.id === active;
          const href = item.id === 'map' ? phoneMapHref(isLoggedIn) : item.href;
          return (
            <li key={item.id}>
              <Link
                href={href}
                prefetch={item.id === 'note' ? false : undefined}
                className={`flex min-h-12 flex-col items-center justify-center gap-0.5 py-2 text-[11px] font-medium ${
                  isActive ? 'text-emerald-700' : 'text-stone-500'
                }`}
                aria-current={isActive ? 'page' : undefined}
              >
                <Icon active={isActive} />
                {item.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

function JournalIcon({ active }: { active: boolean }) {
  return (
    <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M6 4.5h10.5A1.5 1.5 0 0 1 18 6v13.5H7.5A1.5 1.5 0 0 1 6 18V4.5Z" />
      <path d="M6 18a1.5 1.5 0 0 1 1.5-1.5H18" />
      {active ? <path d="M9 8.5h6M9 12h4" /> : null}
    </svg>
  );
}

function MapIcon({ active }: { active: boolean }) {
  return (
    <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M9 4.5 3.75 6.75v12.75L9 17.25l6 2.25 5.25-2.25V4.5L15 6.75 9 4.5Z" />
      <path d="M9 4.5v12.75M15 6.75v12.75" />
      {active ? <circle cx="12" cy="12" r="1.4" fill="currentColor" stroke="none" /> : null}
    </svg>
  );
}

function NoteIcon({ active }: { active: boolean }) {
  return (
    <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M7 5.5h10A1.5 1.5 0 0 1 18.5 7v7.2L14.8 18.5H7A1.5 1.5 0 0 1 5.5 17V7A1.5 1.5 0 0 1 7 5.5Z" />
      <path d="M14.5 18.3V14.8h3.5" />
      {active ? <path d="M9 9.5h6M9 13h3.5" /> : null}
    </svg>
  );
}
