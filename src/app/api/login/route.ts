import { NextRequest, NextResponse } from 'next/server';
import { verifyCredentials, sessionToken, SESSION_COOKIE_NAME } from '@/lib/auth';

export async function POST(request: NextRequest): Promise<NextResponse> {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  const { username, password } = body as Record<string, unknown>;
  if (typeof username !== 'string' || typeof password !== 'string' || !verifyCredentials(username, password)) {
    return NextResponse.json({ error: 'Invalid username or password' }, { status: 401 });
  }

  const token = sessionToken();
  if (!token) {
    return NextResponse.json({ error: 'Admin login is not configured' }, { status: 500 });
  }

  const res = NextResponse.json({ ok: true });
  res.cookies.set(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    secure: true,
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24 * 30, // 30 days
  });
  return res;
}
