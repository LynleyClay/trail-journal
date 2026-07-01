import { NextRequest, NextResponse } from 'next/server';
import { createPost, updatePost, getPostBySlug } from '@/lib/posts';
import type { Trail } from '@/lib/posts';

const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const VALID_TRAILS = new Set<string>(['PCT', 'CDT', 'AT']);

function validateDate(date: string): boolean {
  if (!ISO_DATE_RE.test(date)) return false;
  const d = new Date(date);
  return !isNaN(d.getTime());
}

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
    const slug = createPost({
      title,
      date,
      excerpt,
      body: postBody,
      trail: trail as Trail | undefined,
      coverPhoto: typeof coverPhoto === 'string' ? coverPhoto : undefined,
      published: typeof published === 'boolean' ? published : false,
      photos: Array.isArray(photos) ? photos : [],
    });
    return NextResponse.json({ slug }, { status: 201 });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
): Promise<NextResponse> {
  const { slug } = await params;
  if (!getPostBySlug(slug)) {
    return NextResponse.json({ error: 'Post not found' }, { status: 404 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const data = body as Record<string, unknown>;
  if (data['date'] !== undefined && (typeof data['date'] !== 'string' || !validateDate(data['date']))) {
    return NextResponse.json({ error: 'date must be a valid ISO date (YYYY-MM-DD)' }, { status: 400 });
  }

  try {
    updatePost(slug, data);
    return NextResponse.json({ slug });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
