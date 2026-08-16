import { Suspense } from 'react';
import LoginForm from './LoginForm';

export default function LoginPage() {
  return (
    <Suspense fallback={<main className="flex-1 px-4 py-16 text-stone-500">Loading…</main>}>
      <LoginForm />
    </Suspense>
  );
}
