// @vitest-environment node
import { describe, it, expect, afterEach } from 'vitest';
import { NextRequest } from 'next/server';
import { POST } from '@/app/api/login/route';
import { sessionToken } from '@/lib/auth';

function makeRequest(body: unknown): NextRequest {
  return new NextRequest('http://localhost/api/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

afterEach(() => {
  delete process.env.ADMIN_USERNAME;
  delete process.env.ADMIN_PASSWORD;
});

describe('POST /api/login', () => {
  it('sets a session cookie for correct credentials', async () => {
    process.env.ADMIN_USERNAME = 'owner';
    process.env.ADMIN_PASSWORD = 's3cret';
    const res = await POST(makeRequest({ username: 'owner', password: 's3cret' }));
    expect(res.status).toBe(200);
    const cookie = res.cookies.get('admin_session');
    expect(cookie?.value).toBe(sessionToken());
    expect(cookie?.httpOnly).toBe(true);
  });

  it('returns 401 for an incorrect password', async () => {
    process.env.ADMIN_USERNAME = 'owner';
    process.env.ADMIN_PASSWORD = 's3cret';
    const res = await POST(makeRequest({ username: 'owner', password: 'wrong' }));
    expect(res.status).toBe(401);
    expect(res.cookies.get('admin_session')).toBeUndefined();
  });

  it('returns 401 when credentials are not configured', async () => {
    const res = await POST(makeRequest({ username: 'owner', password: 's3cret' }));
    expect(res.status).toBe(401);
  });

  it('returns 400 for a malformed body', async () => {
    const req = new NextRequest('http://localhost/api/login', { method: 'POST', body: 'not json' });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });
});
