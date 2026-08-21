'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useState } from 'react';

type SignupFormProps = {
  ownerTrailName: string;
};

export default function SignupForm({ ownerTrailName }: SignupFormProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const returnTo = searchParams.get('returnTo') ?? '/onboarding';
  const [trailName, setTrailName] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ trailName, password }),
      });
      const data = (await res.json()) as { error?: string; claimedOwner?: boolean };
      if (!res.ok) {
        setError(data.error ?? 'Signup failed');
        return;
      }
      router.push(data.claimedOwner ? '/map' : returnTo);
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="mx-auto w-full max-w-md flex-1 px-4 py-16">
      <h1 className="text-2xl font-bold text-stone-900 mb-2">Create account</h1>
      <p className="text-sm text-stone-500 mb-8">Start your own trail journal and map.</p>
      <form onSubmit={(e) => void handleSubmit(e)} className="space-y-4">
        <div>
          <label htmlFor="trailName" className="block text-sm font-medium text-stone-700 mb-1">
            Trail name
          </label>
          <input
            id="trailName"
            type="text"
            autoComplete="nickname"
            value={trailName}
            onChange={(e) => setTrailName(e.target.value)}
            className="w-full rounded-md border border-stone-300 px-3 py-2 text-sm"
            required
          />
          <p className="text-xs text-stone-500 mt-1">
            What hikers call you. Emoji is fine — like Bovi 🐄.
          </p>
          <p className="text-xs text-stone-500 mt-1">
            This journal already belongs to <strong>{ownerTrailName}</strong>. Use that trail name
            (or lynley) to keep the existing posts and routes.
          </p>
        </div>
        <div>
          <label htmlFor="password" className="block text-sm font-medium text-stone-700 mb-1">
            Password
          </label>
          <input
            id="password"
            type="password"
            autoComplete="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            minLength={4}
            className="w-full rounded-md border border-stone-300 px-3 py-2 text-sm"
            required
          />
        </div>
        {error && <p className="text-sm text-red-600">{error}</p>}
        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-md bg-emerald-600 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
        >
          {loading ? 'Creating account…' : 'Sign up'}
        </button>
      </form>
      <p className="text-sm text-stone-500 mt-6 text-center">
        Already have an account?{' '}
        <Link href="/login" className="text-emerald-700 hover:underline">
          Sign in
        </Link>
      </p>
    </main>
  );
}
