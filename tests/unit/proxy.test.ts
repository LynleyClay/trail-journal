// @vitest-environment node
import { describe, it, expect, afterEach } from 'vitest';
import { NextRequest } from 'next/server';
import { proxy } from '@/proxy';

const AUTH = 'Basic ' + Buffer.from('owner:s3cret').toString('base64');

function req(pathname: string, method = 'GET', headers: Record<string, string> = {}): NextRequest {
  return new NextRequest(`http://localhost${pathname}`, { method, headers });
}

afterEach(() => {
  delete process.env.ADMIN_USERNAME;
  delete process.env.ADMIN_PASSWORD;
});

describe('proxy', () => {
  it('blocks /admin pages without credentials', () => {
    process.env.ADMIN_USERNAME = 'owner';
    process.env.ADMIN_PASSWORD = 's3cret';
    const res = proxy(req('/admin/new'));
    expect(res.status).toBe(401);
    expect(res.headers.get('WWW-Authenticate')).toContain('Basic');
  });

  it('allows /admin pages with correct credentials', () => {
    process.env.ADMIN_USERNAME = 'owner';
    process.env.ADMIN_PASSWORD = 's3cret';
    const res = proxy(req('/admin/new', 'GET', { authorization: AUTH }));
    expect(res.status).toBe(200);
  });

  it('rejects incorrect credentials', () => {
    process.env.ADMIN_USERNAME = 'owner';
    process.env.ADMIN_PASSWORD = 's3cret';
    const badAuth = 'Basic ' + Buffer.from('owner:wrong').toString('base64');
    const res = proxy(req('/admin/new', 'GET', { authorization: badAuth }));
    expect(res.status).toBe(401);
  });

  it('fails closed when ADMIN_PASSWORD is not configured', () => {
    const res = proxy(req('/admin/new', 'GET', { authorization: AUTH }));
    expect(res.status).toBe(401);
  });

  it('blocks a mutating API request without credentials', () => {
    process.env.ADMIN_USERNAME = 'owner';
    process.env.ADMIN_PASSWORD = 's3cret';
    const res = proxy(req('/api/posts', 'POST'));
    expect(res.status).toBe(401);
  });

  it('allows a public GET request to /api without credentials', () => {
    process.env.ADMIN_USERNAME = 'owner';
    process.env.ADMIN_PASSWORD = 's3cret';
    const res = proxy(req('/api/posts', 'GET'));
    expect(res.status).toBe(200);
  });
});
