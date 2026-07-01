// @vitest-environment node
import { describe, it, expect, vi, afterEach } from 'vitest';
import { NextRequest } from 'next/server';

// Mock the posts lib so tests don't touch disk
vi.mock('@/lib/posts', () => ({
  createPost: vi.fn().mockReturnValue('test-hike-2026-06'),
  updatePost: vi.fn(),
  getPostBySlug: vi.fn().mockReturnValue({ slug: 'test-hike-2026-06', title: 'Test Hike' }),
  getAllPosts: vi.fn().mockReturnValue([]),
  getPublishedPosts: vi.fn().mockReturnValue([]),
}));

// revalidatePath requires a live Next.js request context that isn't present
// when route handlers are invoked directly in tests.
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }));

import { POST } from '@/app/api/posts/route';

afterEach(() => vi.clearAllMocks());

function makeRequest(body: unknown, ip = '127.0.0.1'): NextRequest {
  return new NextRequest('http://localhost/api/posts', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-forwarded-for': ip,
    },
    body: JSON.stringify(body),
  });
}

describe('POST /api/posts', () => {
  it('returns 201 with slug on a valid payload', async () => {
    const req = makeRequest({
      title: 'Test Hike',
      date: '2026-06-01',
      excerpt: 'A quick test.',
      body: '# Test Hike',
    });
    const res = await POST(req);
    expect(res.status).toBe(201);
    const json = await res.json() as { slug: string };
    expect(json.slug).toBe('test-hike-2026-06');
  });

  it('returns 400 when required fields are missing', async () => {
    const req = makeRequest({ title: 'No date or excerpt' });
    const res = await POST(req);
    expect(res.status).toBe(400);
    const json = await res.json() as { error: string };
    expect(json.error).toBeTruthy();
  });

  it('returns 400 for a malformed date', async () => {
    const req = makeRequest({
      title: 'Test Hike',
      date: 'not-a-date',
      excerpt: 'Short.',
      body: '# Body',
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });
});
