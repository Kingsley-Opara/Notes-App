import { jwtVerify, createRemoteJWKSet } from 'jose';

export interface CloudflareUser {
  email: string;
  sub: string;
  iat: number;
  exp: number;
}

export async function verifyCloudflareToken(
  token: string
): Promise<CloudflareUser | null> {
  try {
    // ✅ Moved inside function — only runs at request time, not build time
    const TEAM_DOMAIN = process.env.CF_TEAM_DOMAIN!;
    const POLICY_AUD = process.env.CF_POLICY_AUD!;

    const JWKS = createRemoteJWKSet(
      new URL(`${TEAM_DOMAIN}/cdn-cgi/access/certs`)
    );

    const { payload } = await jwtVerify(token, JWKS, {
      audience: POLICY_AUD,
    });

    return payload as unknown as CloudflareUser;
  } catch {
    return null;
  }
}