import { Suspense } from 'react';
import { getSiteOwner } from '@/lib/site-owner';
import { getCurrentPublicUser } from '@/lib/user-session';
import SignupForm from './SignupForm';

export default async function SignupPage() {
  const ownerTrailName = getSiteOwner().displayName;
  const user = await getCurrentPublicUser();
  return (
    <Suspense fallback={<main className="flex-1 px-4 py-16 text-stone-500">Loading…</main>}>
      <SignupForm ownerTrailName={ownerTrailName} signedInAs={user?.displayName} />
    </Suspense>
  );
}
