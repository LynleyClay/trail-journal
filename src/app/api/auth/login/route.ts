import { NextRequest, NextResponse } from 'next/server';
import { signUserSession, verifyPassword } from '@/lib/password';
import { getUserByUsername } from '@/lib/users';
import { setUserSessionCookies } from '@/lib/user-session';

export async function POST(request: NextRequest): Promise<NextResponse> {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const data = body as Record<string, unknown>;
  const username = typeof data.username === 'string' ? data.username.trim().toLowerCase() : '';
  const password = typeof data.password === 'string' ? data.password : '';

  if (!username || !password) {
    return NextResponse.json({ error: 'Username and password are required' }, { status: 400 });
  }

  const user = await getUserByUsername(username);
  if (!user || !verifyPassword(password, user.passwordHash)) {
    return NextResponse.json({ error: 'Invalid username or password' }, { status: 401 });
  }

  const token = signUserSession(user.id);
  const res = NextResponse.json({
    ok: true,
    userId: user.id,
    username: user.username,
    onboardingDone: user.onboardingDone,
  });
  setUserSessionCookies(res, user.id, token);
  return res;
}
