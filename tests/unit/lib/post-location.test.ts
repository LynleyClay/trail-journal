import { describe, it, expect } from 'vitest';
import { postMarkerPosition } from '@/lib/post-location';
import type { Post } from '@/lib/posts';

function post(overrides: Partial<Post>): Post {
  return {
    id: 'p1',
    slug: 'test',
    title: 'Test',
    date: '2026-08-11',
    excerpt: '',
    coverPhoto: '',
    published: true,
    photos: [],
    ...overrides,
  };
}

describe('postMarkerPosition', () => {
  it('uses the first photo with GPS', () => {
    expect(
      postMarkerPosition(
        post({
          photos: [
            { filename: 'a.jpg' },
            { filename: 'b.jpg', lat: 35.6, lng: -83.5 },
          ],
        }),
      ),
    ).toEqual([35.6, -83.5]);
  });

  it('falls back to the start of a Strava/GPX track when photos have no GPS', () => {
    expect(
      postMarkerPosition(
        post({
          photos: [{ filename: 'cover.jpg' }],
          route: [
            [34.1, -84.2],
            [34.2, -84.3],
          ],
        }),
      ),
    ).toEqual([34.1, -84.2]);
  });

  it('does not use a dummy US-center pin when there is no location', () => {
    expect(postMarkerPosition(post({ photos: [{ filename: 'cover.jpg' }] }))).toBeNull();
  });
});
