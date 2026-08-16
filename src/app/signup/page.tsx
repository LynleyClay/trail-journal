import { Suspense } from 'react';
import SignupForm from './SignupForm';

export default function SignupPage() {
  return (
    <Suspense fallback={<main className="flex-1 px-4 py-16 text-stone-500">Loading…</main>}>
      <SignupForm />
    </Suspense>
  );
}
