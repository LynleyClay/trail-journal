// @vitest-environment node
import { describe, it, expect, vi, afterEach } from 'vitest';
import { NextRequest } from 'next/server';

vi.mock('@/lib/posts', () => ({
  updatePost: vi.fn(),
  deletePost: vi.fn(),
  getAllPosts: vi.fn().mockResolvedValue([{ slug: 'test-hike-2026-06', title: 'Test Hike', published: false }]),
}));

// revalidatePath requires a live Next.js request context that isn't present
// when route handlers are invoked directly in tests.
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }));

import { PUT, DELETE } from '@/app/api/posts/[slug]/route';
import { updatePost, deletePost } from '@/lib/posts';

afterEach(() => vi.clearAllMocks());

function makeRequest(method: string, body?: unknown): NextRequest {
  return new NextRequest('http://localhost/api/posts/test-hike-2026-06', {
    method,
    headers: body !== undefined ? { 'Content-Type': 'application/json' } : undefined,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
}

describe('PUT /api/posts/[slug]', () => {
  it('returns 200 and updates an existing (even unpublished) post', async () => {
    const req = makeRequest('PUT', { published: true });
    const res = await PUT(req, { params: Promise.resolve({ slug: 'test-hike-2026-06' }) });
    expect(res.status).toBe(200);
    expect(updatePost).toHaveBeenCalledWith('test-hike-2026-06', { published: true });
  });

  it('returns 404 for an unknown slug', async () => {
    const req = makeRequest('PUT', { published: true });
    const res = await PUT(req, { params: Promise.resolve({ slug: 'nonexistent' }) });
    expect(res.status).toBe(404);
  });

  it('returns 400 for a malformed date', async () => {
    const req = makeRequest('PUT', { date: 'not-a-date' });
    const res = await PUT(req, { params: Promise.resolve({ slug: 'test-hike-2026-06' }) });
    expect(res.status).toBe(400);
  });
});

describe('DELETE /api/posts/[slug]', () => {
  it('returns 200 and deletes an existing post', async () => {
    const req = makeRequest('DELETE');
    const res = await DELETE(req, { params: Promise.resolve({ slug: 'test-hike-2026-06' }) });
    expect(res.status).toBe(200);
    expect(deletePost).toHaveBeenCalledWith('test-hike-2026-06');
  });

  it('returns 404 for an unknown slug', async () => {
    const req = makeRequest('DELETE');
    const res = await DELETE(req, { params: Promise.resolve({ slug: 'nonexistent' }) });
    expect(res.status).toBe(404);
    expect(deletePost).not.toHaveBeenCalled();
  });
});
