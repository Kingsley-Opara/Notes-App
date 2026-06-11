import { NextRequest, NextResponse } from 'next/server';
import { jwtVerify, createRemoteJWKSet } from 'jose';
import { GetCommand, PutCommand } from '@aws-sdk/lib-dynamodb';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';

// ── Cloudflare config ──────────────────────────────────────────
const TEAM_DOMAIN = process.env.CF_TEAM_DOMAIN!;
const POLICY_AUD = process.env.CF_POLICY_AUD!;

const JWKS = createRemoteJWKSet(
  new URL(`${TEAM_DOMAIN}/cdn-cgi/access/certs`)
);

// ── DynamoDB client ────────────────────────────────────────────
const client = new DynamoDBClient({
  region: process.env.AWS_REGION!,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
});
const dynamo = DynamoDBDocumentClient.from(client);
const TABLE = process.env.DYNAMODB_TABLE_NAME!;

// ── Public routes (no auth required) ──────────────────────────
const PUBLIC_ROUTES = ['/'];

// ── Save or update user in DynamoDB ───────────────────────────
async function syncUser(email: string, sub: string) {
  try {
    const existing = await dynamo.send(
      new GetCommand({
        TableName: TABLE,
        Key: { email },
      })
    );

    if (!existing.Item) {
      // New user — create record
      await dynamo.send(
        new PutCommand({
          TableName: TABLE,
          Item: {
            email,
            userId: sub,
            createdAt: new Date().toISOString(),
            lastLogin: new Date().toISOString(),
            provider: 'cloudflare-access',
          },
        })
      );
      console.log('✅ New user saved to DynamoDB:', email);
    } else {
      // Returning user — update lastLogin
      await dynamo.send(
        new PutCommand({
          TableName: TABLE,
          Item: {
            ...existing.Item,
            lastLogin: new Date().toISOString(),
          },
        })
      );
      console.log('✅ Returning user updated:', email);
    }
  } catch (err) {
    console.error('🔴 DynamoDB sync error:', err);
  }
}

// ── Middleware ─────────────────────────────────────────────────
export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // 1. Skip static files, Cloudflare internal routes, and API routes
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/favicon.ico') ||
    pathname.startsWith('/cdn-cgi') ||
    pathname.startsWith('/api/')
  ) {
    return NextResponse.next();
  }

  // 2. Allow public routes
  // if (PUBLIC_ROUTES.includes(pathname)) {
  //   return NextResponse.next();
  // }

  // 3. Get Cloudflare JWT
  const token = req.cookies.get('CF_Authorization')?.value;

  if (!token) {
    console.log('🔴 No token found for:', pathname);
    return new NextResponse('Unauthorized', { status: 401 });
  }

  // 4. Verify JWT
  try {
    const { payload } = await jwtVerify(token, JWKS, {
      audience: POLICY_AUD,
    });

    const email = payload.email as string;
    const sub = payload.sub as string;

    console.log('🟢 Authenticated user:', email, 'accessing:', pathname);

    // 5. Build response and attach user info to headers
    const response = NextResponse.next();
    response.headers.set('x-user-email', email);
    response.headers.set('x-user-id', sub);

    // 6. Sync to DynamoDB once per session
    const alreadySynced = req.cookies.get('cf_user_synced')?.value;
    if (!alreadySynced) {
      await syncUser(email, sub);
      response.cookies.set('cf_user_synced', '1', {
        httpOnly: true,
        sameSite: 'lax',
        maxAge: 60 * 60 * 24, // 24 hours
      });
    }

    return response;

  } catch (err) {
    console.error('🔴 JWT verification failed:', err);
    return new NextResponse('Unauthorized — invalid or expired token', {
      status: 401,
    });
  }
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};