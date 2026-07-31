import { revalidatePath, revalidateTag } from 'next/cache';

const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export const VALID_TRAILS = new Set<string>(['PCT', 'CDT', 'AT']);

export function validateDate(date: string): boolean {
  if (!ISO_DATE_RE.test(date)) return false;
  const d = new Date(date);
  return !isNaN(d.getTime());
}

// The home page and map are statically prerendered, and Blob reads are
// time-cached for cost, so writes to post data need to explicitly
// invalidate both or readers keep seeing stale (or missing) content.
export function revalidatePostPages(slug?: string): void {
  revalidatePath('/');
  revalidatePath('/map');
  // { expire: 0 } forces immediate expiration rather than the default
  // stale-while-revalidate profile — writes must be visible right away.
  revalidateTag('posts-data', { expire: 0 });
  revalidateTag('blob-urls', { expire: 0 });
  if (slug) {
    revalidatePath(`/posts/${slug}`);
    revalidateTag(`post-body-${slug}`, { expire: 0 });
  }
}
