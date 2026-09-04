import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { jwtVerify } from 'jose';

const jwtSecret = process.env.JWT_SECRET || (process.env.NODE_ENV === 'production' ? '' : 'local-development-only-secret-change-me');
const JWT_SECRET = new TextEncoder().encode(jwtSecret);

export async function middleware(request: NextRequest) {
  const token = request.cookies.get('auth_token')?.value;

  const pathname = request.nextUrl.pathname;
  const isAuthPage = pathname === '/login' || pathname === '/admin/login';

  if (!token) {
    if (!isAuthPage) {
      return NextResponse.redirect(new URL('/login', request.url));
    }
    return NextResponse.next();
  }

  try {
    const verified = await jwtVerify(token, JWT_SECRET);
    if (isAuthPage) {
      const role = verified.payload.role;
      return NextResponse.redirect(new URL(role === 'ADMIN' ? '/admin/dashboard' : '/dashboard', request.url));
    }
    if (pathname.startsWith('/admin') && verified.payload.role !== 'ADMIN') return NextResponse.redirect(new URL('/dashboard', request.url));
    if (pathname.startsWith('/dashboard') && verified.payload.role === 'ADMIN') return NextResponse.redirect(new URL('/admin/dashboard', request.url));
    return NextResponse.next();
  } catch (error) {
    if (!isAuthPage) {
      return NextResponse.redirect(new URL('/login', request.url));
    }
    return NextResponse.next();
  }
}

export const config = {
  matcher: ['/dashboard/:path*', '/login', '/admin/:path*'],
};
