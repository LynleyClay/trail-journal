import { NextRequest, NextResponse } from 'next/server';
import { isValidSession, SESSION_COOKIE_NAME } from '@/lib/auth';
import { verifyUserSession } from '@/lib/password';
import { USER_ID_COOKIE, USER_SESSION_COOKIE } from '@/lib/user-session';

const MUTATING_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);
const PUBLIC_PATHS = new Set([
  '/admin/login',
  '/api/login',
  '/api/auth/signup',
  '/api/auth/login',
  '/api/auth/logout',
]);

function isAdminAuthenticated(request: NextRequest): boolean {
  return isValidSession(request.cookies.get(SESSION_COOKIE_NAME)?.value);
}

function isUserAuthenticated(request: NextRequest): boolean {
  const userId = request.cookies.get(USER_ID_COOKIE)?.value;
  const token = request.cookies.get(USER_SESSION_COOKIE)?.value;
  return !!userId && verifyUserSession(userId, token);
}

function isAnyAuthenticated(request: NextRequest): boolean {
  return isAdminAuthenticated(request) || isUserAuthenticated(request);
}

// Reader-facing pages and reads are public. Admin UI and content mutations require auth.
export function proxy(request: NextRequest): NextResponse {
  const { pathname } = request.nextUrl;

  if (PUBLIC_PATHS.has(pathname)) {
    return NextResponse.next();
  }

  const isAdminPage = pathname.startsWith('/admin');
  const isRoutesApi = pathname.startsWith('/api/routes');
  const isMutatingApi =
    pathname.startsWith('/api') && MUTATING_METHODS.has(request.method) && !isRoutesApi;

  if (isAdminPage && !isAdminAuthenticated(request)) {
    const loginUrl = new URL('/admin/login', request.url);
    loginUrl.searchParams.set('returnTo', pathname);
    return NextResponse.redirect(loginUrl);
  }

  if (isMutatingApi && !isAnyAuthenticated(request)) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/admin/:path*', '/api/:path*'],
};
