import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/user-session';
import OnboardingForm from './OnboardingForm';

export default async function OnboardingPage() {
  const user = await getCurrentUser();
  if (!user) redirect('/signup');
  if (user.onboardingDone) redirect('/map');

  return <OnboardingForm />;
}
