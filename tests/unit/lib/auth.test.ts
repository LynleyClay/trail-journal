import { describe, it, expect, afterEach } from 'vitest';
import { verifyCredentials, sessionToken, isValidSession } from '@/lib/auth';

afterEach(() => {
  delete process.env.ADMIN_USERNAME;
  delete process.env.ADMIN_PASSWORD;
});

describe('verifyCredentials', () => {
  it('returns true for matching username and password', () => {
    process.env.ADMIN_USERNAME = 'owner';
    process.env.ADMIN_PASSWORD = 's3cret';
    expect(verifyCredentials('owner', 's3cret')).toBe(true);
  });

  it('returns false for a wrong password', () => {
    process.env.ADMIN_USERNAME = 'owner';
    process.env.ADMIN_PASSWORD = 's3cret';
    expect(verifyCredentials('owner', 'wrong')).toBe(false);
  });

  it('returns false when credentials are not configured', () => {
    expect(verifyCredentials('owner', 's3cret')).toBe(false);
  });
});

describe('sessionToken', () => {
  it('returns null when credentials are not configured', () => {
    expect(sessionToken()).toBeNull();
  });

  it('is stable for the same credentials and changes when the password changes', () => {
    process.env.ADMIN_USERNAME = 'owner';
    process.env.ADMIN_PASSWORD = 's3cret';
    const a = sessionToken();
    const b = sessionToken();
    expect(a).toBe(b);

    process.env.ADMIN_PASSWORD = 'different';
    expect(sessionToken()).not.toBe(a);
  });
});

describe('isValidSession', () => {
  it('accepts the current session token', () => {
    process.env.ADMIN_USERNAME = 'owner';
    process.env.ADMIN_PASSWORD = 's3cret';
    expect(isValidSession(sessionToken()!)).toBe(true);
  });

  it('rejects an unrelated value', () => {
    process.env.ADMIN_USERNAME = 'owner';
    process.env.ADMIN_PASSWORD = 's3cret';
    expect(isValidSession('bogus')).toBe(false);
  });

  it('rejects everything when credentials are not configured', () => {
    expect(isValidSession('anything')).toBe(false);
  });

  it('rejects an undefined cookie value', () => {
    process.env.ADMIN_USERNAME = 'owner';
    process.env.ADMIN_PASSWORD = 's3cret';
    expect(isValidSession(undefined)).toBe(false);
  });
});
