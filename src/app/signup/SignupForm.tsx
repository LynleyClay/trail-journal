'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useState } from 'react';

type SignupFormProps = {
  ownerTrailName: string;
  signedInAs?: string | null;
};

export default function SignupForm({ ownerTrailName, signedInAs }: SignupFormProps) {
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
        credentials: 'include',
        body: JSON.stringify({ trailName, password }),
      });
      let data: { error?: string; claimedOwner?: boolean } = {};
      try {
        data = (await res.json()) as { error?: string; claimedOwner?: boolean };
      } catch {
        setError('Signup failed. Please try again.');
        return;
      }
      if (!res.ok) {
        setError(data.error ?? 'Signup failed');
        return;
      }
      const next = data.claimedOwner ? '/map' : returnTo.startsWith('/') ? returnTo : '/onboarding';
      window.location.assign(next);
    } catch {
      setError('Could not reach the server. Check your connection and try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="mx-auto w-full max-w-md flex-1 px-4 py-16">
      <h1 className="text-2xl font-bold text-stone-900 mb-2">Create account</h1>
      <p className="text-sm text-stone-500 mb-8">Start your own trail journal and map.</p>
      {signedInAs && (
        <p className="mb-6 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
          You&apos;re already signed in as <strong>{signedInAs}</strong>. Sign out first if you want
          to create a different hiker account.
        </p>
      )}
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
            Pick a new trail name (at least 3 letters). {ownerTrailName} is already taken.
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
          disabled={loading || !!signedInAs}
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
        {signedInAs ? (
          <>
            {' '}
            ·{' '}
            <button
              type="button"
              className="text-emerald-700 hover:underline"
              onClick={() => {
                void fetch('/api/auth/logout', {
                  method: 'POST',
                  credentials: 'include',
                  cache: 'no-store',
                }).then(() => {
                  window.location.assign('/signup');
                });
              }}
            >
              Sign out
            </button>
          </>
        ) : null}
      </p>
    </main>
  );
}
