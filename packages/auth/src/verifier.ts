import { ForbiddenException, UnauthorizedException } from "@021.is/spine-errors";
import { type JWTPayload, createRemoteJWKSet, jwtVerify } from "jose";

/**
 * Verifies RS256 JWTs against a JWKS endpoint (your identity provider in
 * production, the mock server from @021.is/spine-testing in tests).
 *
 * Caches the JWKS for `cacheTtlMs` (default 1h) and force-refreshes on
 * any unknown `kid` so IdP key rotation doesn't break the cluster.
 */
export interface VerifierOptions {
  jwksUri: string;
  issuer?: string | string[];
  audience?: string | string[];
  cacheTtlMs?: number;
  cooldownMs?: number;
}

export interface VerifiedPrincipal extends JWTPayload {
  sub: string;
  roles?: string[];
  scopes?: string[];
  memberships?: string[];
}

export class JwksVerifier {
  private readonly jwks: ReturnType<typeof createRemoteJWKSet>;
  private readonly issuer?: string | string[];
  private readonly audience?: string | string[];

  constructor(options: VerifierOptions) {
    this.jwks = createRemoteJWKSet(new URL(options.jwksUri), {
      cacheMaxAge: options.cacheTtlMs ?? 60 * 60 * 1000,
      cooldownDuration: options.cooldownMs ?? 30 * 1000,
    });
    this.issuer = options.issuer;
    this.audience = options.audience;
  }

  /**
   * Verify a token from the Authorization header (raw token, no "Bearer ").
   * Throws UnauthorizedException on invalid / expired / wrong-issuer tokens.
   */
  async verify(token: string): Promise<VerifiedPrincipal> {
    try {
      const { payload } = await jwtVerify(token, this.jwks, {
        issuer: this.issuer,
        audience: this.audience,
      });
      if (typeof payload.sub !== "string") {
        throw new UnauthorizedException("Token missing sub claim");
      }
      return payload as VerifiedPrincipal;
    } catch (e) {
      if (e instanceof UnauthorizedException) throw e;
      const msg = e instanceof Error ? e.message : String(e);
      throw new UnauthorizedException(`Token verification failed: ${msg}`);
    }
  }

  /**
   * Extract + verify token from a Headers/Request-like object.
   * Returns the principal or throws UnauthorizedException.
   */
  async verifyFromHeaders(headers: {
    get(name: string): string | null;
  }): Promise<VerifiedPrincipal> {
    const auth = headers.get("authorization") ?? headers.get("Authorization");
    if (!auth) throw new UnauthorizedException("Missing Authorization header");
    const match = /^bearer\s+(.+)$/i.exec(auth);
    if (!match) throw new UnauthorizedException("Authorization header must be 'Bearer <token>'");
    return this.verify((match[1] ?? "").trim());
  }
}

/**
 * Require the principal to hold every named role. Throws ForbiddenException
 * if any are missing. Empty `required` = noop (just any authed user).
 */
export function requireRoles(principal: VerifiedPrincipal, required: string[]): void {
  if (required.length === 0) return;
  const have = new Set(principal.roles ?? []);
  const missing = required.filter((r) => !have.has(r));
  if (missing.length > 0) {
    throw new ForbiddenException(`Missing required role(s): ${missing.join(", ")}`);
  }
}

/**
 * Require the principal to hold every named scope. Throws ForbiddenException
 * if any are missing.
 */
export function requireScopes(principal: VerifiedPrincipal, required: string[]): void {
  if (required.length === 0) return;
  const have = new Set(principal.scopes ?? []);
  const missing = required.filter((s) => !have.has(s));
  if (missing.length > 0) {
    throw new ForbiddenException(`Missing required scope(s): ${missing.join(", ")}`);
  }
}
