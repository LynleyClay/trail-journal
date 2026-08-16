import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/user-session';
import { updateUser } from '@/lib/users';

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
  const displayName = data.displayName;

  if (!Array.isArray(trailsCompleted) || !trailsCompleted.every((t) => typeof t === 'string')) {
    return NextResponse.json({ error: 'trailsCompleted must be an array of trail ids' }, { status: 400 });
  }

  const updated = await updateUser(user.id, {
    trailsCompleted,
    displayName: typeof displayName === 'string' && displayName.trim() ? displayName.trim() : user.displayName,
    onboardingDone: true,
  });

  if (!updated) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 });
  }

  return NextResponse.json({ ok: true, user: { username: updated.username, displayName: updated.displayName } });
}
