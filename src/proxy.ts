import { NextRequest, NextResponse } from 'next/server';
import { SESSION_COOKIE_NAME, isValidSession } from '@/lib/auth';

const MUTATING_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);
const PUBLIC_PATHS = new Set(['/admin/login', '/api/login']);

function isAuthenticated(request: NextRequest): boolean {
  return isValidSession(request.cookies.get(SESSION_COOKIE_NAME)?.value);
}

// Reader-facing pages and reads are public. Only the admin UI and any
// request that mutates content require a logged-in session.
export function proxy(request: NextRequest): NextResponse {
  const { pathname } = request.nextUrl;

  if (PUBLIC_PATHS.has(pathname)) {
    return NextResponse.next();
  }

  const isAdminPage = pathname.startsWith('/admin');
  const isMutatingApi = pathname.startsWith('/api') && MUTATING_METHODS.has(request.method);

  if (isAdminPage && !isAuthenticated(request)) {
    const loginUrl = new URL('/admin/login', request.url);
    loginUrl.searchParams.set('returnTo', pathname);
    return NextResponse.redirect(loginUrl);
  }

  if (isMutatingApi && !isAuthenticated(request)) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/admin/:path*', '/api/:path*'],
};
