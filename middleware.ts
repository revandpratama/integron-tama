import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { verifyToken } from './app/lib/auth';

export async function middleware(request: NextRequest) {
    const { pathname } = request.nextUrl;

    // Public paths
    const publicPaths = ['/login', '/register', '/api/auth/login', '/api/auth/register', '/logo.png'];
    if (
        publicPaths.some((path) => pathname.startsWith(path)) ||
        pathname.startsWith('/_next') ||
        pathname.startsWith('/static') ||
        pathname === '/favicon.ico'
    ) {

        // If user is logged in and tries to access login/register, redirect to dashboard
        const token = request.cookies.get('session')?.value;
        if (token && (pathname === '/login' || pathname === '/register')) {
            const payload = await verifyToken(token);
            if (payload) {
                return NextResponse.redirect(new URL('/', request.url));
            }
        }

        return NextResponse.next();
    }

    // Protected paths
    const token = request.cookies.get('session')?.value;

    if (!token) {
        return NextResponse.redirect(new URL('/login', request.url));
    }

    const payload = await verifyToken(token);
    if (!payload) {
        // Invalid token
        const response = NextResponse.redirect(new URL('/login', request.url));
        response.cookies.delete('session');
        return response;
    }

    return NextResponse.next();
}

export const config = {
    matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
};
