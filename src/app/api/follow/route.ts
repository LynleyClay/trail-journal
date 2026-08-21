import { NextRequest, NextResponse } from 'next/server';
import { followUser, unfollowUser } from '@/lib/follows';
import { getUserByUsername } from '@/lib/users';
import { getCurrentUser } from '@/lib/user-session';

export async function POST(request: NextRequest): Promise<NextResponse> {
  const currentUser = await getCurrentUser();
  if (!currentUser) {
    return NextResponse.json({ error: 'Sign in to add hikers as tramily' }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const username = typeof (body as Record<string, unknown>).username === 'string'
    ? (body as Record<string, unknown>).username as string
    : '';

  const target = await getUserByUsername(username.trim());
  if (!target) {
    return NextResponse.json({ error: 'Trail name not found' }, { status: 404 });
  }

  await followUser(currentUser.id, target.id);
  return NextResponse.json({ ok: true, following: target.username });
}

export async function DELETE(request: NextRequest): Promise<NextResponse> {
  const currentUser = await getCurrentUser();
  if (!currentUser) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  const username = request.nextUrl.searchParams.get('username')?.trim();
  if (!username) {
    return NextResponse.json({ error: 'trail name is required' }, { status: 400 });
  }

  const target = await getUserByUsername(username);
  if (!target) {
    return NextResponse.json({ error: 'Trail name not found' }, { status: 404 });
  }

  await unfollowUser(currentUser.id, target.id);
  return NextResponse.json({ ok: true });
}
