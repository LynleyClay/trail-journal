import { NextRequest, NextResponse } from 'next/server';
import { searchPlaces } from '@/lib/geocode';

export async function GET(request: NextRequest): Promise<NextResponse> {
  const q = request.nextUrl.searchParams.get('q')?.trim() ?? '';
  if (q.length < 2) {
    return NextResponse.json({ results: [] });
  }

  try {
    const results = await searchPlaces(q);
    return NextResponse.json({ results });
  } catch {
    return NextResponse.json({ error: 'Place search failed' }, { status: 502 });
  }
}
