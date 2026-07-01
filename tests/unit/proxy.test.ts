// @vitest-environment node
import { describe, it, expect, afterEach } from 'vitest';
import { NextRequest } from 'next/server';
import { sessionToken } from '@/lib/auth';
import { proxy } from '@/proxy';

function req(pathname: string, method = 'GET', cookie?: string): NextRequest {
  const headers: Record<string, string> = {};
  if (cookie) headers['cookie'] = cookie;
  return new NextRequest(`http://localhost${pathname}`, { method, headers });
}

afterEach(() => {
  delete process.env.ADMIN_USERNAME;
  delete process.env.ADMIN_PASSWORD;
});

describe('proxy', () => {
  it('redirects /admin pages to the login page without a valid session', () => {
    process.env.ADMIN_USERNAME = 'owner';
    process.env.ADMIN_PASSWORD = 's3cret';
    const res = proxy(req('/admin/new'));
    expect(res.status).toBe(307);
    expect(res.headers.get('location')).toContain('/admin/login');
    expect(res.headers.get('location')).toContain('returnTo=%2Fadmin%2Fnew');
  });

  it('allows /admin pages with a valid session cookie', () => {
    process.env.ADMIN_USERNAME = 'owner';
    process.env.ADMIN_PASSWORD = 's3cret';
    const token = sessionToken();
    const res = proxy(req('/admin/new', 'GET', `admin_session=${token}`));
    expect(res.status).toBe(200);
  });

  it('rejects a session cookie that does not match the current credentials', () => {
    process.env.ADMIN_USERNAME = 'owner';
    process.env.ADMIN_PASSWORD = 's3cret';
    const res = proxy(req('/admin/new', 'GET', 'admin_session=not-the-real-token'));
    expect(res.status).toBe(307);
  });

  it('fails closed when admin credentials are not configured', () => {
    const res = proxy(req('/admin/new'));
    expect(res.status).toBe(307);
  });

  it('always allows the login page and login API through', () => {
    process.env.ADMIN_USERNAME = 'owner';
    process.env.ADMIN_PASSWORD = 's3cret';
    expect(proxy(req('/admin/login')).status).toBe(200);
    expect(proxy(req('/api/login', 'POST')).status).toBe(200);
  });

  it('blocks a mutating API request without a valid session', () => {
    process.env.ADMIN_USERNAME = 'owner';
    process.env.ADMIN_PASSWORD = 's3cret';
    const res = proxy(req('/api/posts', 'POST'));
    expect(res.status).toBe(401);
  });

  it('allows a mutating API request with a valid session cookie', () => {
    process.env.ADMIN_USERNAME = 'owner';
    process.env.ADMIN_PASSWORD = 's3cret';
    const token = sessionToken();
    const res = proxy(req('/api/posts', 'POST', `admin_session=${token}`));
    expect(res.status).toBe(200);
  });

  it('allows a public GET request to /api without a session', () => {
    process.env.ADMIN_USERNAME = 'owner';
    process.env.ADMIN_PASSWORD = 's3cret';
    const res = proxy(req('/api/posts', 'GET'));
    expect(res.status).toBe(200);
  });
});
