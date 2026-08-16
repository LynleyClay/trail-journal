import { NextRequest, NextResponse } from 'next/server';
import { hashPassword, signUserSession, verifyPassword } from '@/lib/password';
import { createUser, getUserByUsername, isValidUsername } from '@/lib/users';
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
  const displayName = typeof data.displayName === 'string' ? data.displayName.trim() : '';
  const password = typeof data.password === 'string' ? data.password : '';

  if (!isValidUsername(username)) {
    return NextResponse.json(
      { error: 'Username must be 3–30 characters: lowercase letters, numbers, _ or -' },
      { status: 400 },
    );
  }
  if (!displayName) {
    return NextResponse.json({ error: 'Display name is required' }, { status: 400 });
  }
  if (password.length < 8) {
    return NextResponse.json({ error: 'Password must be at least 8 characters' }, { status: 400 });
  }

  try {
    const user = await createUser({
      username,
      displayName,
      passwordHash: hashPassword(password),
      onboardingDone: false,
    });
    const token = signUserSession(user.id);
    const res = NextResponse.json({ ok: true, userId: user.id, username: user.username });
    setUserSessionCookies(res, user.id, token);
    return res;
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Signup failed';
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
