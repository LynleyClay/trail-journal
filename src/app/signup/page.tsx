import { Suspense } from 'react';
import { getSiteOwnerUsername } from '@/lib/site-owner';
import SignupForm from './SignupForm';

export default function SignupPage() {
  const ownerTrailName = getSiteOwnerUsername();
  return (
    <Suspense fallback={<main className="flex-1 px-4 py-16 text-stone-500">Loading…</main>}>
      <SignupForm ownerTrailName={ownerTrailName} />
    </Suspense>
  );
}
