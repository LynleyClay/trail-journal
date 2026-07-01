import { NextRequest, NextResponse } from 'next/server';
import { createPost } from '@/lib/posts';
import type { Trail } from '@/lib/posts';
import { validateDate, VALID_TRAILS, revalidatePostPages } from './shared';

export async function POST(request: NextRequest): Promise<NextResponse> {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const data = body as Record<string, unknown>;
  const { title, date, excerpt, body: postBody, trail, coverPhoto, published, photos } = data;

  if (!title || typeof title !== 'string') {
    return NextResponse.json({ error: 'title is required' }, { status: 400 });
  }
  if (!date || typeof date !== 'string' || !validateDate(date)) {
    return NextResponse.json({ error: 'date must be a valid ISO date (YYYY-MM-DD)' }, { status: 400 });
  }
  if (!excerpt || typeof excerpt !== 'string') {
    return NextResponse.json({ error: 'excerpt is required' }, { status: 400 });
  }
  if (!postBody || typeof postBody !== 'string') {
    return NextResponse.json({ error: 'body is required' }, { status: 400 });
  }
  if (trail !== undefined && (typeof trail !== 'string' || !VALID_TRAILS.has(trail))) {
    return NextResponse.json({ error: 'trail must be PCT, CDT, or AT' }, { status: 400 });
  }

  try {
    const slug = await createPost({
      title,
      date,
      excerpt,
      body: postBody,
      trail: trail as Trail | undefined,
      coverPhoto: typeof coverPhoto === 'string' ? coverPhoto : undefined,
      published: typeof published === 'boolean' ? published : false,
      photos: Array.isArray(photos) ? photos : [],
    });
    revalidatePostPages();
    return NextResponse.json({ slug }, { status: 201 });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
