import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';

const { listMock, putMock } = vi.hoisted(() => ({
  listMock: vi.fn(),
  putMock: vi.fn().mockResolvedValue({ url: 'https://example.public.blob.vercel-storage.com/data/posts.json' }),
}));

vi.mock('@vercel/blob', () => ({ list: listMock, put: putMock }));

import { getPublishedPosts, createPost } from '@/lib/posts';
import type { Post } from '@/lib/posts';

const fetchMock = vi.fn();

beforeEach(() => {
  process.env.BLOB_READ_WRITE_TOKEN = 'test-token';
  vi.stubGlobal('fetch', fetchMock);
});

afterEach(() => {
  vi.clearAllMocks();
  vi.unstubAllGlobals();
  delete process.env.BLOB_READ_WRITE_TOKEN;
});

const post: Post = {
  id: 'blob-hike-2026-06',
  slug: 'blob-hike-2026-06',
  title: 'Blob Hike',
  date: '2026-06-01',
  excerpt: 'Stored in the cloud.',
  coverPhoto: 'https://example.public.blob.vercel-storage.com/photos/cover.jpg',
  published: true,
  photos: [],
};

describe('posts.ts Vercel Blob backend', () => {
  it('reads posts.json from Blob storage when BLOB_READ_WRITE_TOKEN is set', async () => {
    listMock.mockResolvedValue({
      blobs: [{ pathname: 'data/posts.json', url: 'https://example.public.blob.vercel-storage.com/data/posts.json' }],
    });
    fetchMock.mockResolvedValue({ ok: true, json: async () => [post] });

    const posts = await getPublishedPosts();
    expect(posts).toHaveLength(1);
    expect(posts[0]?.slug).toBe('blob-hike-2026-06');
    expect(listMock).toHaveBeenCalledWith({ prefix: 'data/posts.json', limit: 1 });
  });

  it('returns an empty array when no posts.json blob exists yet', async () => {
    listMock.mockResolvedValue({ blobs: [] });
    const posts = await getPublishedPosts();
    expect(posts).toEqual([]);
  });

  it('writes new posts through @vercel/blob put()', async () => {
    listMock.mockResolvedValue({ blobs: [] });
    const slug = await createPost({
      title: 'Blob Hike',
      date: '2026-06-01',
      excerpt: 'Stored in the cloud.',
      body: '# Blob Hike',
      published: true,
    });
    expect(slug).toBe('blob-hike-2026-06');
    expect(putMock).toHaveBeenCalledWith(
      'posts/blob-hike-2026-06.md',
      '# Blob Hike',
      expect.objectContaining({ access: 'public' })
    );
    expect(putMock).toHaveBeenCalledWith(
      'data/posts.json',
      expect.stringContaining('blob-hike-2026-06'),
      expect.objectContaining({ access: 'public' })
    );
  });
});
