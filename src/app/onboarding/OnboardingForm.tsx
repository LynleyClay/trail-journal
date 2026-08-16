'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { LONG_TRAILS } from '@/lib/long-trails';

const ONBOARDING_TRAILS = LONG_TRAILS.filter((t) => ['at', 'pct', 'cdt'].includes(t.id));

export default function OnboardingForm() {
  const router = useRouter();
  const [displayName, setDisplayName] = useState('');
  const [selected, setSelected] = useState<string[]>([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  function toggleTrail(id: string) {
    setSelected((prev) => (prev.includes(id) ? prev.filter((t) => t !== id) : [...prev, id]));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await fetch('/api/onboarding', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ trailsCompleted: selected, displayName: displayName || undefined }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) {
        setError(data.error ?? 'Could not save preferences');
        return;
      }
      router.push('/map');
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="mx-auto w-full max-w-lg flex-1 px-4 py-16">
      <h1 className="text-2xl font-bold text-stone-900 mb-2">Welcome to Trail Journal</h1>
      <p className="text-sm text-stone-500 mb-8">
        Pick the long trails you&apos;ve hiked. We&apos;ll customize your map overlays.
      </p>
      <form onSubmit={(e) => void handleSubmit(e)} className="space-y-6">
        <div>
          <label htmlFor="displayName" className="block text-sm font-medium text-stone-700 mb-1">
            Display name (optional)
          </label>
          <input
            id="displayName"
            type="text"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            className="w-full rounded-md border border-stone-300 px-3 py-2 text-sm"
          />
        </div>
        <fieldset>
          <legend className="text-sm font-medium text-stone-700 mb-3">Trails you&apos;ve hiked</legend>
          <div className="space-y-2">
            {ONBOARDING_TRAILS.map((trail) => (
              <label
                key={trail.id}
                className="flex items-center gap-3 rounded-md border border-stone-200 px-3 py-2 cursor-pointer hover:bg-stone-50"
              >
                <input
                  type="checkbox"
                  checked={selected.includes(trail.id)}
                  onChange={() => toggleTrail(trail.id)}
                  className="rounded border-stone-300 text-emerald-600"
                />
                <span className="text-sm text-stone-800">
                  {trail.name} ({trail.abbrev})
                </span>
              </label>
            ))}
          </div>
        </fieldset>
        {error && <p className="text-sm text-red-600">{error}</p>}
        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-md bg-emerald-600 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
        >
          {loading ? 'Saving…' : 'Continue to my map'}
        </button>
      </form>
    </main>
  );
}
