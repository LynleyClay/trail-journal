import { redirect } from 'next/navigation';

export default function NotePage() {
  redirect('/admin/new');
}
