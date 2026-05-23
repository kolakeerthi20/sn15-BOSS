import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const PUBLIC_PATHS = [
  '/auth/login',
  '/auth/register',
  '/auth/forgot-password',
  '/auth/callback',   // Google OAuth redirect — no token yet, tokens arrive in query params
  '/auth/pending',    // Waiting-for-role screen — authenticated but no role assigned yet
];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const isPublic = PUBLIC_PATHS.some((p) => pathname.startsWith(p));

  // Check for auth cookie or token in cookies (client-side auth uses localStorage,
  // but we also set a server cookie for middleware checks)
  const token = request.cookies.get('boss-token')?.value;

  if (!isPublic && !token) {
    const loginUrl = new URL('/auth/login', request.url);
    loginUrl.searchParams.set('from', pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Authenticated users can still visit /auth/pending (pending role users live here)
  // and /auth/callback (token exchange happens there). Only bounce them from login/register.
  const isAuthFormPage = pathname.startsWith('/auth/login') || pathname.startsWith('/auth/register');
  if (isAuthFormPage && token) {
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|api).*)'],
};
