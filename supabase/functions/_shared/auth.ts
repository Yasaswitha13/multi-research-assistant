import { jwtVerify, createRemoteJWKSet } from "https://esm.sh/jose@5.9.6";

export class AuthError extends Error {}

let jwks: ReturnType<typeof createRemoteJWKSet> | null = null;

/**
 * Verifies a Supabase access token and returns the authenticated user id.
 * Tries HS256 with the project JWT secret first (the default), then falls
 * back to the project JWKS (ES256/RS256) like the original FastAPI backend.
 */
export async function getUserID(authorization: string | null): Promise<string> {
  if (!authorization || !authorization.startsWith("Bearer ")) {
    throw new AuthError("Missing bearer token");
  }
  const token = authorization.slice(7);
  const audience = "authenticated";

  const secret = Deno.env.get("JWT_SECRET");
  if (secret) {
    try {
      const { payload } = await jwtVerify(token, new TextEncoder().encode(secret), { audience });
      const sub = payload.sub;
      if (!sub) throw new AuthError("Token missing sub claim");
      return sub;
    } catch (e) {
      if (e instanceof AuthError) throw e;
      // fall through to JWKS
    }
  }

  if (!jwks) {
    const base = (Deno.env.get("SUPABASE_URL") ?? "").replace(/\/$/, "");
    jwks = createRemoteJWKSet(new URL(`${base}/auth/v1/.well-known/jwks.json`));
  }
  try {
    const { payload } = await jwtVerify(token, jwks, { audience });
    const sub = payload.sub;
    if (!sub) throw new AuthError("Token missing sub claim");
    return sub;
  } catch {
    throw new AuthError("Invalid token");
  }
}
