import { describe, it, expect, afterEach, vi } from 'vitest';

// vi.hoisted ensures these are available when vi.mock factory runs (both are hoisted)
const { existsSyncMock, readFileSyncMock } = vi.hoisted(() => ({
  existsSyncMock: vi.fn(),
  readFileSyncMock: vi.fn(),
}));

vi.mock('fs', () => ({
  existsSync: existsSyncMock,
  readFileSync: readFileSyncMock,
  writeFileSync: vi.fn(),
  renameSync: vi.fn(),
  mkdirSync: vi.fn(),
}));

import { getAllPosts, getPublishedPosts, getPostBySlug } from '@/lib/posts';
import type { Post } from '@/lib/posts';

const mockPost = (overrides: Partial<Post> = {}): Post => ({
  id: 'test-post-2026-06',
  slug: 'test-post-2026-06',
  title: 'Test Post',
  date: '2026-06-15',
  excerpt: 'A test excerpt.',
  coverPhoto: 'cover.jpg',
  trail: 'PCT',
  published: true,
  photos: [],
  ...overrides,
});

const setupMocks = (posts: Post[], bodies: Record<string, string> = {}) => {
  existsSyncMock.mockReturnValue(true);
  readFileSyncMock.mockImplementation((filePath: unknown) => {
    const p = String(filePath);
    if (p.endsWith('posts.json')) return JSON.stringify(posts);
    const slugMatch = /\/posts\/([^/]+)\.md$/.exec(p);
    if (slugMatch?.[1]) return bodies[slugMatch[1]] ?? '# Default body';
    throw new Error(`Unexpected readFileSync: ${p}`);
  });
};

afterEach(() => {
  vi.clearAllMocks();
  delete process.env.BLOB_READ_WRITE_TOKEN;
});

describe('getAllPosts', () => {
  it('returns all posts including drafts', async () => {
    const posts = [mockPost(), mockPost({ slug: 'draft', id: 'draft', published: false })];
    setupMocks(posts);
    expect(await getAllPosts()).toHaveLength(2);
  });

  it('returns empty array when posts.json is empty', async () => {
    setupMocks([]);
    expect(await getAllPosts()).toEqual([]);
  });
});

describe('getPublishedPosts', () => {
  it('filters out drafts', async () => {
    const posts = [
      mockPost({ slug: 'pub', id: 'pub', published: true }),
      mockPost({ slug: 'draft', id: 'draft', published: false }),
    ];
    setupMocks(posts);
    const result = await getPublishedPosts();
    expect(result).toHaveLength(1);
    expect(result[0]?.slug).toBe('pub');
  });

  it('returns posts sorted newest-first', async () => {
    const posts = [
      mockPost({ slug: 'older', id: 'older', date: '2025-01-01', published: true }),
      mockPost({ slug: 'newer', id: 'newer', date: '2026-06-15', published: true }),
    ];
    setupMocks(posts);
    const [first, second] = await getPublishedPosts();
    expect(first?.slug).toBe('newer');
    expect(second?.slug).toBe('older');
  });

  it('returns empty array when no published posts exist', async () => {
    setupMocks([mockPost({ published: false })]);
    expect(await getPublishedPosts()).toHaveLength(0);
  });
});

describe('getPostBySlug', () => {
  it('returns post with body for a published slug', async () => {
    setupMocks([mockPost()], { 'test-post-2026-06': '# Story\n\nThe hike was great.' });
    const post = await getPostBySlug('test-post-2026-06');
    expect(post).not.toBeNull();
    expect(post?.body).toContain('The hike was great.');
  });

  it('returns null for an unknown slug', async () => {
    setupMocks([mockPost()]);
    expect(await getPostBySlug('nonexistent')).toBeNull();
  });

  it('returns null for an unpublished post', async () => {
    setupMocks([mockPost({ published: false })]);
    expect(await getPostBySlug('test-post-2026-06')).toBeNull();
  });
});
