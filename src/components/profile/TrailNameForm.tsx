'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

type TrailNameFormProps = {
  initialTrailName: string;
};

export function TrailNameForm({ initialTrailName }: TrailNameFormProps) {
  const router = useRouter();
  const [trailName, setTrailName] = useState(initialTrailName);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setSaving(true);
    try {
      const res = await fetch('/api/profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ trailName }),
      });
      const data = (await res.json()) as { error?: string; user?: { username: string } };
      if (!res.ok) {
        setError(data.error ?? 'Could not update trail name');
        return;
      }
      if (data.user?.username) {
        router.replace(`/u/${data.user.username}`);
      }
      router.refresh();
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={(e) => void handleSubmit(e)} className="mt-4 flex flex-col gap-2 max-w-sm">
      <label htmlFor="trailName" className="text-sm font-medium text-stone-700">
        Trail name
      </label>
      <div className="flex gap-2">
        <input
          id="trailName"
          type="text"
          value={trailName}
          onChange={(e) => setTrailName(e.target.value)}
          maxLength={40}
          className="flex-1 rounded-md border border-stone-300 px-3 py-2 text-sm"
        />
        <button
          type="submit"
          disabled={saving}
          className="rounded-md bg-emerald-600 px-3 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
        >
          {saving ? 'Saving…' : 'Update'}
        </button>
      </div>
      <p className="text-xs text-stone-500">Emoji is welcome — like Bovi 🐄. Sign-in uses the letters: bovi.</p>
      {error && <p className="text-sm text-red-600">{error}</p>}
    </form>
  );
}
