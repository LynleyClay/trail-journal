import { NextResponse } from 'next/server';
import { clearUserSessionCookies } from '@/lib/user-session';

export async function POST(): Promise<NextResponse> {
  const res = NextResponse.json({ ok: true });
  res.headers.set('Cache-Control', 'no-store');
  clearUserSessionCookies(res);
  return res;
}
