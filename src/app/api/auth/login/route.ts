import { NextRequest, NextResponse } from 'next/server';
import { hashPassword, signUserSession, verifyPassword } from '@/lib/password';
import { matchesAdminPassword } from '@/lib/auth';
import { getUserByUsername, trailNameToSlug, updateUser } from '@/lib/users';
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
  const username = trailNameToSlug(
    typeof data.username === 'string' ? data.username : '',
  );
  const password = typeof data.password === 'string' ? data.password : '';

  if (!username || !password) {
    return NextResponse.json({ error: 'Trail name and password are required' }, { status: 400 });
  }

  const user = await getUserByUsername(username);
  if (!user) {
    return NextResponse.json({ error: 'Invalid trail name or password' }, { status: 401 });
  }

  const isOwner = user.id === 'user-lynley' || user.username === getSiteOwnerUsername();
  const passwordOk = verifyPassword(password, user.passwordHash);
  const ownerAdminOk = isOwner && matchesAdminPassword(password);
  const ownerFirstLogin = isOwner && !user.passwordHash;

  if (!passwordOk && !ownerAdminOk && !ownerFirstLogin) {
    return NextResponse.json({ error: 'Invalid trail name or password' }, { status: 401 });
  }

  if (ownerFirstLogin || (isOwner && ownerAdminOk && !passwordOk)) {
    await updateUser(user.id, {
      passwordHash: hashPassword(password),
      username: username || user.username,
      onboardingDone: true,
    });
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
