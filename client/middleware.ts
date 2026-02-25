import { NextRequest, NextResponse } from 'next/server'

export function middleware(req: NextRequest) {
  const host = req.headers.get('host') ?? ''

  if (host === '1700chess.vercel.app') {
    const url = req.nextUrl.clone()
    url.protocol = 'https:'
    url.host = '1700chess.sh'
    return NextResponse.redirect(url, 308)
  }

  return NextResponse.next()
}

export const config = {
  matcher: '/:path*',
}
