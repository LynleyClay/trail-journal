import { Suspense } from 'react';
import LoginForm from './LoginForm';
import { getSiteOwnerUsername } from '@/lib/site-owner';

export default function LoginPage() {
  const ownerTrailName = getSiteOwnerUsername();
  return (
    <Suspense fallback={<main className="flex-1 px-4 py-16 text-stone-500">Loading…</main>}>
      <LoginForm ownerTrailName={ownerTrailName} />
    </Suspense>
  );
}
