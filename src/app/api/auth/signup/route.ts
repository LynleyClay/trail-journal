import { NextRequest, NextResponse } from 'next/server';
import { hashPassword, signUserSession } from '@/lib/password';
import {
  canClaimOwnerAccount,
  createUser,
  getUserByUsername,
  isValidTrailName,
  trailNameToSlug,
  updateUser,
} from '@/lib/users';
import { setUserSessionCookies } from '@/lib/user-session';
import { getSiteOwnerUser, getSiteOwnerUsername } from '@/lib/site-owner';

export async function POST(request: NextRequest): Promise<NextResponse> {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const data = body as Record<string, unknown>;
  const trailName =
    typeof data.trailName === 'string'
      ? data.trailName.trim()
      : typeof data.displayName === 'string'
        ? data.displayName.trim()
        : typeof data.username === 'string'
          ? data.username.trim()
          : '';
  const password = typeof data.password === 'string' ? data.password : '';
  const slug = trailNameToSlug(trailName);

  if (!isValidTrailName(trailName)) {
    return NextResponse.json(
      { error: 'Trail name needs letters we can use in a profile URL (emoji is fine at the end)' },
      { status: 400 },
    );
  }
  if (password.length < 4) {
    return NextResponse.json({ error: 'Password must be at least 4 characters' }, { status: 400 });
  }

  try {
    const ownerUsername = getSiteOwnerUsername();
    const owner = await getSiteOwnerUser();
    const passwordHash = hashPassword(password);
    const matchesOwnerTrail =
      !!owner &&
      (slug === owner.username ||
        slug === 'lynley' ||
        slug === 'lynleyclay' ||
        slug === 'bovi' ||
        slug === trailNameToSlug(owner.displayName));
    const claimingOwner = canClaimOwnerAccount(owner, ownerUsername) && matchesOwnerTrail;

    if (claimingOwner && owner) {
      const claimed = await updateUser(owner.id, {
        passwordHash,
        displayName: trailName,
        username: slug,
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

    if (matchesOwnerTrail) {
      return NextResponse.json(
        { error: 'That trail name is already registered. Sign in instead.' },
        { status: 400 },
      );
    }

    const taken = await getUserByUsername(slug);
    if (taken) {
      return NextResponse.json({ error: 'That trail name is already taken' }, { status: 400 });
    }

    const user = await createUser({
      username: slug,
      displayName: trailName,
      passwordHash,
      onboardingDone: true,
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
