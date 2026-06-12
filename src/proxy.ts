import { NextRequest, NextResponse } from 'next/server';
import { jwtVerify, createRemoteJWKSet } from 'jose';

const PUBLIC_ROUTES = ['/'];

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/favicon.ico') ||
    pathname.startsWith('/cdn-cgi') ||
    pathname.startsWith('/api/')
  ) {
    return NextResponse.next();
  }

  if (PUBLIC_ROUTES.includes(pathname)) {
    return NextResponse.next();
  }

  const token = req.cookies.get('CF_Authorization')?.value;

  if (!token) {
    return new NextResponse('Unauthorized', { status: 401 });
  }

  try {
    // ✅ Moved inside function — only runs at request time
    const TEAM_DOMAIN = process.env.CF_TEAM_DOMAIN!;
    const POLICY_AUD = process.env.CF_POLICY_AUD!;

    const JWKS = createRemoteJWKSet(
      new URL(`${TEAM_DOMAIN}/cdn-cgi/access/certs`)
    );

    const { payload } = await jwtVerify(token, JWKS, {
      audience: POLICY_AUD,
    });

    const response = NextResponse.next();
    response.headers.set('x-user-email', payload.email as string);
    response.headers.set('x-user-id', payload.sub as string);

    return response;

  } catch {
    return new NextResponse('Unauthorized', { status: 401 });
  }
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};