import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';

const { sendMock, putObjectCommandMock, deleteObjectCommandMock } = vi.hoisted(() => ({
  sendMock: vi.fn().mockResolvedValue({}),
  // Regular function (not arrow) so it can be used as a constructor with `new`.
  putObjectCommandMock: vi.fn(function (this: { input: unknown }, input: unknown) {
    this.input = input;
  }),
  deleteObjectCommandMock: vi.fn(function (this: { input: unknown }, input: unknown) {
    this.input = input;
  }),
}));

vi.mock('@aws-sdk/client-s3', () => {
  class MockS3Client {
    send = sendMock;
  }
  return {
    S3Client: MockS3Client,
    PutObjectCommand: putObjectCommandMock,
    DeleteObjectCommand: deleteObjectCommandMock,
  };
});

// Safety net: if the code ever mistakenly falls through to the local fs
// backend during these tests, fail loudly instead of touching real files.
vi.mock('fs', () => ({
  existsSync: vi.fn(() => {
    throw new Error('Unexpected local fs access during R2 backend test');
  }),
  readFileSync: vi.fn(),
  writeFileSync: vi.fn(),
  renameSync: vi.fn(),
  mkdirSync: vi.fn(),
  unlinkSync: vi.fn(),
}));

vi.mock('@/lib/site-owner', () => ({
  getSiteOwnerUserId: vi.fn().mockResolvedValue('user-lynley'),
}));

vi.mock('@/lib/follows', () => ({
  getFollowingIds: vi.fn().mockResolvedValue([]),
}));

import { getPublishedPosts, createPost } from '@/lib/posts';
import type { Post } from '@/lib/posts';

const fetchMock = vi.fn();

beforeEach(() => {
  process.env.R2_ACCOUNT_ID = 'test-account';
  process.env.R2_ACCESS_KEY_ID = 'test-key';
  process.env.R2_SECRET_ACCESS_KEY = 'test-secret';
  process.env.R2_BUCKET_NAME = 'test-bucket';
  process.env.R2_PUBLIC_URL = 'https://pub-test.r2.dev';
  process.env.R2_ENDPOINT = 'https://test-account.r2.cloudflarestorage.com';
  vi.stubGlobal('fetch', fetchMock);
});

afterEach(() => {
  vi.clearAllMocks();
  vi.unstubAllGlobals();
  delete process.env.R2_ACCOUNT_ID;
  delete process.env.R2_ACCESS_KEY_ID;
  delete process.env.R2_SECRET_ACCESS_KEY;
  delete process.env.R2_BUCKET_NAME;
  delete process.env.R2_PUBLIC_URL;
  delete process.env.R2_ENDPOINT;
});

const post: Post = {
  id: 'r2-hike-2026-06',
  slug: 'r2-hike-2026-06',
  title: 'R2 Hike',
  date: '2026-06-01',
  excerpt: 'Stored in R2.',
  coverPhoto: 'https://pub-test.r2.dev/photos/cover.jpg',
  published: true,
  photos: [],
};

describe('posts.ts Cloudflare R2 backend', () => {
  it('reads posts.json via a plain fetch against the deterministic public URL', async () => {
    fetchMock.mockResolvedValue({ ok: true, json: async () => [post] });

    const posts = await getPublishedPosts();
    expect(posts).toHaveLength(1);
    expect(posts[0]?.slug).toBe('r2-hike-2026-06');
    expect(fetchMock).toHaveBeenCalledWith(
      'https://pub-test.r2.dev/data/posts.json',
      expect.objectContaining({ next: expect.objectContaining({ tags: ['posts-data'] }) })
    );
  });

  it('returns an empty array when the object does not exist yet (404)', async () => {
    fetchMock.mockResolvedValue({ ok: false });
    const posts = await getPublishedPosts();
    expect(posts).toEqual([]);
  });

  it('writes new posts via an S3 PutObjectCommand', async () => {
    fetchMock.mockResolvedValue({ ok: false });
    const slug = await createPost({
      title: 'R2 Hike',
      date: '2026-06-01',
      excerpt: 'Stored in R2.',
      body: '# R2 Hike',
      published: true,
      userId: 'user-test',
    });

    expect(slug).toBe('r2-hike-2026-06');
    expect(putObjectCommandMock).toHaveBeenCalledWith(
      expect.objectContaining({ Bucket: 'test-bucket', Key: 'posts/r2-hike-2026-06.md', Body: '# R2 Hike' })
    );
    expect(putObjectCommandMock).toHaveBeenCalledWith(
      expect.objectContaining({
        Bucket: 'test-bucket',
        Key: 'data/posts.json',
        Body: expect.stringContaining('r2-hike-2026-06'),
      })
    );
    expect(sendMock).toHaveBeenCalledTimes(2);
  });
});
