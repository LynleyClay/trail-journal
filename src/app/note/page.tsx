import { redirect } from 'next/navigation';
import { hasAdminSession } from '@/lib/auth-session';
import { getCurrentUser } from '@/lib/user-session';

export default async function NotePage() {
  const user = await getCurrentUser();
  const isAdmin = await hasAdminSession();
  if (!user && !isAdmin) {
    redirect('/signup?returnTo=/admin/new');
  }
  redirect('/admin/new');
}
