import { NextRequest, NextResponse } from 'next/server';
import { updatePost, deletePost, getAllPosts } from '@/lib/posts';
import { validateDate, revalidatePostPages } from '../shared';

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
): Promise<NextResponse> {
  const { slug } = await params;
  const posts = await getAllPosts();
  if (!posts.some((p) => p.slug === slug)) {
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
    await updatePost(slug, data);
    revalidatePostPages();
    return NextResponse.json({ slug });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
): Promise<NextResponse> {
  const { slug } = await params;
  const posts = await getAllPosts();
  if (!posts.some((p) => p.slug === slug)) {
    return NextResponse.json({ error: 'Post not found' }, { status: 404 });
  }

  try {
    await deletePost(slug);
    revalidatePostPages();
    return NextResponse.json({ slug });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
