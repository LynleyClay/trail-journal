import { describe, it, expect, vi, afterEach } from 'vitest';

const {
  existsSyncMock,
  readFileSyncMock,
  writeFileSyncMock,
  renameSyncMock,
  mkdirSyncMock,
  unlinkSyncMock,
} = vi.hoisted(() => ({
  existsSyncMock: vi.fn(),
  readFileSyncMock: vi.fn(),
  writeFileSyncMock: vi.fn(),
  renameSyncMock: vi.fn(),
  mkdirSyncMock: vi.fn(),
  unlinkSyncMock: vi.fn(),
}));

vi.mock('fs', () => ({
  existsSync: existsSyncMock,
  readFileSync: readFileSyncMock,
  writeFileSync: writeFileSyncMock,
  renameSync: renameSyncMock,
  mkdirSync: mkdirSyncMock,
  unlinkSync: unlinkSyncMock,
}));

import { createPost, updatePost, deletePost } from '@/lib/posts';
import type { Post } from '@/lib/posts';

const basePost: Post = {
  id: 'test-hike-2026-06',
  slug: 'test-hike-2026-06',
  title: 'Test Hike',
  date: '2026-06-01',
  excerpt: 'A quick test.',
  coverPhoto: 'cover.jpg',
  published: false,
  photos: [],
};

const setupRead = (posts: Post[]) => {
  existsSyncMock.mockReturnValue(true);
  readFileSyncMock.mockReturnValue(JSON.stringify(posts));
};

afterEach(() => {
  vi.clearAllMocks();
  delete process.env.BLOB_READ_WRITE_TOKEN;
});

describe('createPost', () => {
  it('writes the markdown body and appends metadata to posts.json', async () => {
    setupRead([]);
    const slug = await createPost({
      title: 'Test Hike',
      date: '2026-06-01',
      excerpt: 'A quick test.',
      body: '# Test Hike\n\nGreat hike.',
      published: false,
    });
    expect(slug).toBe('test-hike-2026-06');
    expect(writeFileSyncMock).toHaveBeenCalled();
    expect(renameSyncMock).toHaveBeenCalled();
  });

  it('resolves slug collision by appending -2', async () => {
    setupRead([basePost]);
    const slug = await createPost({
      title: 'Test Hike',
      date: '2026-06-01',
      excerpt: 'Another.',
      body: '# Second',
    });
    expect(slug).toBe('test-hike-2026-06-2');
  });
});

describe('updatePost', () => {
  it('merges provided fields into the existing post', async () => {
    setupRead([basePost]);
    await updatePost('test-hike-2026-06', { published: true });
    const writtenJson = writeFileSyncMock.mock.calls
      .map((c) => String(c[1]))
      .find((s) => s.includes('"published"'));
    expect(writtenJson).toContain('"published": true');
  });

  it('throws when the slug does not exist', async () => {
    setupRead([]);
    await expect(updatePost('nonexistent', { published: true })).rejects.toThrow('Post not found');
  });

  it('writes the updated body file when body is provided', async () => {
    setupRead([basePost]);
    await updatePost('test-hike-2026-06', { body: '# Updated' });
    const bodyWrite = writeFileSyncMock.mock.calls.find((c) =>
      String(c[0]).endsWith('test-hike-2026-06.md.tmp')
    );
    expect(bodyWrite).toBeDefined();
    expect(String(bodyWrite?.[1])).toBe('# Updated');
  });
});

describe('deletePost', () => {
  it('removes the post from posts.json and deletes its body file', async () => {
    setupRead([basePost]);
    await deletePost('test-hike-2026-06');

    const writtenJson = writeFileSyncMock.mock.calls
      .map((c) => String(c[1]))
      .find((s) => s.startsWith('['));
    expect(writtenJson).toBe('[]');
    expect(unlinkSyncMock).toHaveBeenCalledWith(expect.stringContaining('test-hike-2026-06.md'));
  });

  it('throws when the slug does not exist', async () => {
    setupRead([]);
    await expect(deletePost('nonexistent')).rejects.toThrow('Post not found');
  });
});
