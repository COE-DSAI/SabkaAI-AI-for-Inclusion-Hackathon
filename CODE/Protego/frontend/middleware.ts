import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(request: NextRequest) {
  const token = request.cookies.get('access_token')?.value

  const isAuthPage = request.nextUrl.pathname.startsWith('/auth')
  const isPublicPage = request.nextUrl.pathname === '/' || request.nextUrl.pathname.startsWith('/track/')
  const isGovDashboard = request.nextUrl.pathname.startsWith('/gov-dashboard')
  const isAdminPage = request.nextUrl.pathname.startsWith('/admin')
  const isRegularUserPage = ['/dashboard', '/contacts', '/safety', '/location', '/safe-locations', '/safety-call', '/settings'].some(
    path => request.nextUrl.pathname.startsWith(path)
  )

  // Redirect authenticated users away from auth pages
  if (token && isAuthPage) {
    return NextResponse.redirect(new URL('/dashboard', request.url))
  }

  // Allow access to root page, track pages, and auth pages without token
  if (isPublicPage || isAuthPage) {
    return NextResponse.next()
  }

  // Redirect unauthenticated users to signin for protected pages
  if (!token) {
    return NextResponse.redirect(new URL('/auth/signin', request.url))
  }

  // Note: User type-based access control is handled on the client side
  // and in the page components since we can't easily decode JWT in Edge Runtime
  // The pages themselves will check user.user_type and redirect if needed

  return NextResponse.next()
}

export const config = {
  matcher: [
    '/',
    '/dashboard/:path*',
    '/tracking/:path*',
    '/location/:path*',
    '/contacts/:path*',
    '/safety/:path*',
    '/safety-call/:path*',
    '/safe-locations/:path*',
    '/settings/:path*',
    '/report-incident/:path*',
    '/gov-dashboard/:path*',
    '/admin/:path*',
    '/auth/:path*',
    '/track/:path*',
  ],
}
