import { redirect } from 'next/navigation';

export default function DraftsRedirectPage() {
  redirect('/admin/new?view=drafts');
}
