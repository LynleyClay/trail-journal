import { NextRequest, NextResponse } from 'next/server';
import { hashPassword, signUserSession, verifyPassword } from '@/lib/password';
import { matchesAdminPassword } from '@/lib/auth';
import { getUserByUsername, updateUser } from '@/lib/users';
import { setUserSessionCookies } from '@/lib/user-session';
import { getSiteOwnerUsername } from '@/lib/site-owner';

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
    return NextResponse.json({ error: 'Trail name and password are required' }, { status: 400 });
  }

  const user = await getUserByUsername(username);
  if (!user) {
    return NextResponse.json({ error: 'Invalid trail name or password' }, { status: 401 });
  }

  const isOwner = user.username === getSiteOwnerUsername();
  const passwordOk = verifyPassword(password, user.passwordHash);
  const ownerAdminOk = isOwner && matchesAdminPassword(password);

  if (!passwordOk && !ownerAdminOk) {
    return NextResponse.json({ error: 'Invalid trail name or password' }, { status: 401 });
  }

  if (isOwner && !user.passwordHash && ownerAdminOk) {
    await updateUser(user.id, { passwordHash: hashPassword(password), onboardingDone: true });
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
