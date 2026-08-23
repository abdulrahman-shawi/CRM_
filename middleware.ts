import { NextRequest, NextResponse } from 'next/server';
import { decrypt } from '@/lib/auth';

export async function middleware(request: NextRequest) {
  const session = request.cookies.get('skynova')?.value;

  // إذا لم يوجد توكن، وجهه لصفحة تسجيل الدخول
  if (!session && request.nextUrl.pathname.startsWith('/dashboard')) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  if (session && request.nextUrl.pathname === '/login') {
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    // "/dashboard/:path*",
    // "/api/dashboard/:path*",
    "/dashboard/:path*",
    "/",
    '/((?!api/users/login|_next/static|_next/image|favicon.ico).*)'
  ],
};