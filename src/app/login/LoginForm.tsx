'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useState } from 'react';

export default function LoginForm({ ownerTrailName }: { ownerTrailName: string }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const returnTo = searchParams.get('returnTo') ?? '/map';
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });
      const data = (await res.json()) as { error?: string; onboardingDone?: boolean };
      if (!res.ok) {
        setError(data.error ?? 'Login failed');
        return;
      }
      router.push(data.onboardingDone === false ? '/onboarding' : returnTo);
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="mx-auto w-full max-w-md flex-1 px-4 py-16">
      <h1 className="text-2xl font-bold text-stone-900 mb-2">Sign in</h1>
      <p className="text-sm text-stone-500 mb-8">Access your personal trail map and journal.</p>
      <form onSubmit={(e) => void handleSubmit(e)} className="space-y-4">
        <div>
          <label htmlFor="username" className="block text-sm font-medium text-stone-700 mb-1">
            Trail name
          </label>
          <input
            id="username"
            type="text"
            autoComplete="username"
            value={username}
            onChange={(e) => setUsername(e.target.value.toLowerCase())}
            className="w-full rounded-md border border-stone-300 px-3 py-2 text-sm"
            required
          />
          <p className="text-xs text-stone-500 mt-1">
            Site owner: sign in as <strong>{ownerTrailName}</strong> to keep the existing journal and
            routes.
          </p>
        </div>
        <div>
          <label htmlFor="password" className="block text-sm font-medium text-stone-700 mb-1">
            Password
          </label>
          <input
            id="password"
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
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
          {loading ? 'Signing in…' : 'Sign in'}
        </button>
      </form>
      <p className="text-sm text-stone-500 mt-6 text-center">
        New here?{' '}
        <Link href={`/signup?returnTo=${encodeURIComponent(returnTo)}`} className="text-emerald-700 hover:underline">
          Create an account
        </Link>
      </p>
    </main>
  );
}
