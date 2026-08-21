import { NextRequest, NextResponse } from 'next/server';
import { hashPassword, signUserSession } from '@/lib/password';
import {
  canClaimOwnerAccount,
  createUser,
  getUserByUsername,
  isValidUsername,
  updateUser,
} from '@/lib/users';
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
  const displayName = typeof data.displayName === 'string' ? data.displayName.trim() : '';
  const password = typeof data.password === 'string' ? data.password : '';

  if (!isValidUsername(username)) {
    return NextResponse.json(
      { error: 'Trail name must be 3–30 characters: lowercase letters, numbers, _ or -' },
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
    const existing = await getUserByUsername(username);
    const ownerUsername = getSiteOwnerUsername();
    const passwordHash = hashPassword(password);

    if (canClaimOwnerAccount(existing, ownerUsername) && existing) {
      const claimed = await updateUser(existing.id, {
        passwordHash,
        displayName,
        onboardingDone: true,
      });
      if (!claimed) {
        return NextResponse.json({ error: 'Could not register this trail name' }, { status: 500 });
      }
      const token = signUserSession(claimed.id);
      const res = NextResponse.json({
        ok: true,
        userId: claimed.id,
        username: claimed.username,
        claimedOwner: true,
      });
      setUserSessionCookies(res, claimed.id, token);
      return res;
    }

    const user = await createUser({
      username,
      displayName,
      passwordHash,
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
