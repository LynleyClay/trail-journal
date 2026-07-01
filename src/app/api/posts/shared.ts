import { revalidatePath } from 'next/cache';

const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export const VALID_TRAILS = new Set<string>(['PCT', 'CDT', 'AT']);

export function validateDate(date: string): boolean {
  if (!ISO_DATE_RE.test(date)) return false;
  const d = new Date(date);
  return !isNaN(d.getTime());
}

// The home page and map are statically prerendered, so writes to post data
// need to explicitly invalidate them or readers keep seeing stale content.
export function revalidatePostPages(): void {
  revalidatePath('/');
  revalidatePath('/map');
}
