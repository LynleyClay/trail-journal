import type { Post } from '@/lib/posts';

/** Where a post should appear on the journal map. Never falls back to a dummy center. */
export function postMarkerPosition(post: Post): [number, number] | null {
  const gpsPhoto = post.photos.find(
    (p) => typeof p.lat === 'number' && typeof p.lng === 'number',
  );
  if (gpsPhoto && typeof gpsPhoto.lat === 'number' && typeof gpsPhoto.lng === 'number') {
    return [gpsPhoto.lat, gpsPhoto.lng];
  }

  const start = post.route?.[0];
  if (start) return start;

  return null;
}
