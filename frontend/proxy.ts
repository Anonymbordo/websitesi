import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function proxy(request: NextRequest) {
  const pathname = request.nextUrl.pathname

  // Some shared links mistakenly include an ampersand after the domain
  // (https://mikrokurs.com/&). Send that harmless typo to the homepage.
  if (pathname === '/&' || pathname === '/%26') {
    const url = request.nextUrl.clone()
    url.pathname = '/'
    return NextResponse.redirect(url, 308)
  }

  return NextResponse.next()
}

export const proxyConfig = {
  matcher: '/:path*',
}
