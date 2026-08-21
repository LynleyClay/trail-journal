import { NextRequest, NextResponse } from 'next/server';
import { fetchWalkPath } from '@/lib/walk-path';

function num(value: string | null): number | null {
  if (value == null || value.trim() === '') return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

export async function GET(request: NextRequest): Promise<NextResponse> {
  const fromLat = num(request.nextUrl.searchParams.get('fromLat'));
  const fromLng = num(request.nextUrl.searchParams.get('fromLng'));
  const toLat = num(request.nextUrl.searchParams.get('toLat'));
  const toLng = num(request.nextUrl.searchParams.get('toLng'));

  if (fromLat == null || fromLng == null || toLat == null || toLng == null) {
    return NextResponse.json({ error: 'fromLat, fromLng, toLat, and toLng are required' }, { status: 400 });
  }

  try {
    const path = await fetchWalkPath(
      { lat: fromLat, lng: fromLng },
      { lat: toLat, lng: toLng },
    );
    return NextResponse.json({ path });
  } catch {
    return NextResponse.json({ path: [] });
  }
}
