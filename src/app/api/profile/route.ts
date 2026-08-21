import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/user-session';
import {
  getUserByUsername,
  isValidTrailName,
  trailNameToSlug,
  updateUser,
} from '@/lib/users';
import { LONG_TRAILS } from '@/lib/long-trails';

const KNOWN_TRAIL_IDS = new Set(LONG_TRAILS.map((trail) => trail.id));

export async function POST(request: NextRequest): Promise<NextResponse> {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const data = body as Record<string, unknown>;
  const trailsCompleted = data.trailsCompleted;
  if (Array.isArray(trailsCompleted)) {
    if (!trailsCompleted.every((id) => typeof id === 'string')) {
      return NextResponse.json({ error: 'trailsCompleted must be trail ids' }, { status: 400 });
    }
    const ids = trailsCompleted.filter((id) => KNOWN_TRAIL_IDS.has(id));
    const updated = await updateUser(user.id, { trailsCompleted: ids });
    if (!updated) {
      return NextResponse.json({ error: 'Could not update trails' }, { status: 500 });
    }
    return NextResponse.json({
      ok: true,
      user: {
        username: updated.username,
        displayName: updated.displayName,
        trailsCompleted: updated.trailsCompleted,
      },
    });
  }

  const trailName = typeof data.trailName === 'string' ? data.trailName.trim() : '';
  if (!isValidTrailName(trailName)) {
    return NextResponse.json(
      { error: 'Trail name needs letters we can use in a profile URL (emoji is fine at the end)' },
      { status: 400 },
    );
  }

  const slug = trailNameToSlug(trailName);
  const taken = await getUserByUsername(slug);
  if (taken && taken.id !== user.id) {
    return NextResponse.json({ error: 'That trail name is already taken' }, { status: 400 });
  }

  const updated = await updateUser(user.id, {
    displayName: trailName,
    username: slug,
  });
  if (!updated) {
    return NextResponse.json({ error: 'Could not update trail name' }, { status: 500 });
  }

  return NextResponse.json({
    ok: true,
    user: { username: updated.username, displayName: updated.displayName },
  });
}
