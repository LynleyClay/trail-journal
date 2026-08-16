import { NextResponse } from 'next/server';
import { clearUserSessionCookies } from '@/lib/user-session';

export async function POST(): Promise<NextResponse> {
  const res = NextResponse.json({ ok: true });
  clearUserSessionCookies(res);
  return res;
}
