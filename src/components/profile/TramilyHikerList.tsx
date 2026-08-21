'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useMemo, useState } from 'react';
import FollowButton from '@/components/profile/FollowButton';

export type TramilyHiker = {
  username: string;
  displayName: string;
  inTramily: boolean;
};

type TramilyHikerListProps = {
  hikers: TramilyHiker[];
  isLoggedIn: boolean;
};

export function TramilyHikerList({ hikers, isLoggedIn }: TramilyHikerListProps) {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [lookupError, setLookupError] = useState('');
  const [lookingUp, setLookingUp] = useState(false);

  const needle = query.trim().toLowerCase().replace(/^@/, '');
  const matches = useMemo(() => {
    if (!needle) return hikers;
    return hikers.filter(
      (hiker) =>
        hiker.displayName.toLowerCase().includes(needle) || hiker.username.includes(needle),
    );
  }, [hikers, needle]);

  const exactMatch = hikers.some((hiker) => hiker.username === needle);

  async function addByTrailName() {
    if (!needle || !isLoggedIn) return;
    setLookupError('');
    setLookingUp(true);
    try {
      const res = await fetch('/api/follow', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: needle }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) {
        setLookupError(data.error ?? 'Could not add that trail name');
        return;
      }
      setQuery('');
      router.refresh();
    } finally {
      setLookingUp(false);
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <div>
        <label htmlFor="tramily-search" className="sr-only">
          Search trail names
        </label>
        <input
          id="tramily-search"
          type="search"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setLookupError('');
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && needle && !exactMatch) {
              e.preventDefault();
              void addByTrailName();
            }
          }}
          placeholder="Search trail names"
          className="w-full rounded-md border border-stone-300 bg-white px-3 py-2 text-sm"
        />
      </div>

      {hikers.length === 0 && !needle ? (
        <p className="text-sm text-stone-600 bg-white rounded-lg border border-stone-200 px-3 py-2">
          Search a trail name to add them as tramily, or wait until they create an account.
        </p>
      ) : matches.length === 0 ? (
        <div className="space-y-2">
          <p className="text-sm text-stone-600">No hikers match that trail name yet.</p>
          {needle && isLoggedIn && (
            <button
              type="button"
              onClick={() => void addByTrailName()}
              disabled={lookingUp}
              className="w-full rounded-md bg-stone-900 px-3 py-2 text-xs font-medium text-white hover:bg-stone-800 disabled:opacity-50"
            >
              {lookingUp ? 'Looking up…' : `Add @${needle} as tramily`}
            </button>
          )}
        </div>
      ) : (
        <ul className="space-y-2">
          {matches.map((hiker) => (
            <li key={hiker.username}>
              <div
                className={`rounded-lg border px-3 py-2 ${
                  hiker.inTramily ? 'border-emerald-400 bg-emerald-50' : 'border-stone-200 bg-white'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <Link href={`/u/${hiker.username}`} className="min-w-0 hover:text-emerald-800">
                    <span className="block text-sm font-medium text-stone-900">{hiker.displayName}</span>
                    <span className="block text-xs text-stone-500">Trail name @{hiker.username}</span>
                  </Link>
                  <FollowButton
                    username={hiker.username}
                    initialFollowing={hiker.inTramily}
                    isLoggedIn={isLoggedIn}
                    compact
                  />
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
      {lookupError && <p className="text-xs text-red-600">{lookupError}</p>}
    </div>
  );
}
