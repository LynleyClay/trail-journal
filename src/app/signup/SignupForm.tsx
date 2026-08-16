'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useState } from 'react';

export default function SignupForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const returnTo = searchParams.get('returnTo') ?? '/onboarding';
  const [username, setUsername] = useState('');
  const [displayName, setDisplayName] = useState('');
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
        body: JSON.stringify({ username, displayName, password }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) {
        setError(data.error ?? 'Signup failed');
        return;
      }
      router.push(returnTo);
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
          <label htmlFor="displayName" className="block text-sm font-medium text-stone-700 mb-1">
            Display name
          </label>
          <input
            id="displayName"
            type="text"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            className="w-full rounded-md border border-stone-300 px-3 py-2 text-sm"
            required
          />
        </div>
        <div>
          <label htmlFor="username" className="block text-sm font-medium text-stone-700 mb-1">
            Username
          </label>
          <input
            id="username"
            type="text"
            autoComplete="username"
            value={username}
            onChange={(e) => setUsername(e.target.value.toLowerCase())}
            pattern="[a-z0-9][a-z0-9_-]{2,29}"
            className="w-full rounded-md border border-stone-300 px-3 py-2 text-sm"
            required
          />
          <p className="text-xs text-stone-500 mt-1">Used in your profile URL: /u/username</p>
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
            minLength={8}
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
