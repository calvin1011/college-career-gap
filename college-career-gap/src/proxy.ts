import { NextRequest, NextResponse } from 'next/server';

/**
 * Per-request CSP middleware.
 *
 * Generates a cryptographically random nonce for every page request and
 * injects it into the Content-Security-Policy header. The nonce is also
 * forwarded to the app via the `x-nonce` response header so that the root
 * layout can apply it to <Script> tags.
 *
 * `'strict-dynamic'` means any script already trusted via the nonce may
 * load additional scripts, which covers Firebase SDK dynamic imports and
 * Google Analytics without needing `'unsafe-eval'` or `'unsafe-inline'`.
 */
export function proxy(request: NextRequest) {
  // Only apply to page navigation — skip static assets and API routes
  const { pathname } = request.nextUrl;
  if (
    pathname.startsWith('/_next/') ||
    pathname.startsWith('/api/') ||
    pathname.match(/\.(ico|png|jpg|jpeg|svg|webp|woff2?|ttf|css)$/)
  ) {
    return NextResponse.next();
  }

  const nonce = Buffer.from(crypto.getRandomValues(new Uint8Array(16))).toString('base64');

  const csp = [
    "default-src 'self'",
    `script-src 'nonce-${nonce}' 'strict-dynamic' *.googleapis.com *.googletagmanager.com *.gstatic.com`,
    "style-src 'self' 'unsafe-inline' fonts.googleapis.com",
    "img-src 'self' data: blob: *.googleapis.com firebasestorage.googleapis.com *.cloudfront.net",
    "connect-src 'self' *.googleapis.com *.cloudfunctions.net wss://*.firebaseio.com",
    "font-src 'self' fonts.gstatic.com",
    "worker-src 'self' blob:",
    "frame-ancestors 'none'",
  ].join('; ');

  const response = NextResponse.next();
  response.headers.set('Content-Security-Policy', csp);
  // Expose nonce to the root layout via a readable response header
  response.headers.set('x-nonce', nonce);
  return response;
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
