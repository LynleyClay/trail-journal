import { NextRequest, NextResponse } from 'next/server';

function isLocalhost(request: NextRequest): boolean {
  // x-forwarded-for is set by proxies; absent on direct local connections
  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) {
    const firstIp = forwarded.split(',')[0]?.trim() ?? '';
    return firstIp === '127.0.0.1' || firstIp === '::1';
  }
  // Next.js 14+ exposes request.ip
  const ip = (request as NextRequest & { ip?: string }).ip ?? '';
  return ip === '127.0.0.1' || ip === '::1' || ip === '';
}

export function proxy(request: NextRequest): NextResponse {
  if (!isLocalhost(request)) {
    return new NextResponse('Forbidden', { status: 403 });
  }
  return NextResponse.next();
}

export const config = {
  matcher: ['/admin/:path*', '/api/:path*'],
};
