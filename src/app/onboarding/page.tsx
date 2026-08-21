import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/user-session';
import { updateUser } from '@/lib/users';

export default async function OnboardingPage() {
  const user = await getCurrentUser();
  if (!user) redirect('/signup');
  if (!user.onboardingDone) {
    await updateUser(user.id, { onboardingDone: true });
  }
  redirect('/map');
}
