import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/user-session';
import {
  getUserByUsername,
  isValidTrailName,
  trailNameToSlug,
  updateUser,
} from '@/lib/users';

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

  const trailName =
    typeof (body as Record<string, unknown>).trailName === 'string'
      ? ((body as Record<string, unknown>).trailName as string).trim()
      : '';

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
