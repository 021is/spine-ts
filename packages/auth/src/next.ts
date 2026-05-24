import { UnauthorizedException } from "@021/spine-errors";
import { JwksVerifier, type VerifiedPrincipal, type VerifierOptions } from "./verifier.js";

/**
 * Build a singleton verifier from env. Most apps call this once at startup:
 *
 *   // lib/auth.ts
 *   export const verifier = makeVerifier({ jwksUri: env.ELVIX_JWKS_URI, audience: env.ELVIX_AUDIENCE });
 */
export function makeVerifier(options: VerifierOptions): JwksVerifier {
  return new JwksVerifier(options);
}

/**
 * Use inside a Next.js route handler:
 *
 *   import { withAuth } from "@021/spine-auth/next";
 *   export const GET = withAuth(verifier, async (req, ctx) => {
 *     return Response.json({ me: ctx.principal.sub });
 *   }, { roles: ["admin"] });
 */
export function withAuth<TArgs extends unknown[], TCtx extends { request: Request }>(
  verifier: JwksVerifier,
  handler: (ctx: TCtx & { principal: VerifiedPrincipal }, ...args: TArgs) => Promise<Response> | Response,
  options?: { roles?: string[]; scopes?: string[] },
): (ctx: TCtx, ...args: TArgs) => Promise<Response> {
  return async (ctx, ...args) => {
    const headers = ctx.request.headers;
    const principal = await verifier.verifyFromHeaders(headers);
    if (options?.roles) {
      const { requireRoles } = await import("./verifier.js");
      requireRoles(principal, options.roles);
    }
    if (options?.scopes) {
      const { requireScopes } = await import("./verifier.js");
      requireScopes(principal, options.scopes);
    }
    return handler({ ...ctx, principal }, ...args);
  };
}

/**
 * Server-action variant. Use inside `"use server"` functions when you need
 * the calling user — pass the verifier + the request (from Next's headers()).
 */
export async function requireUser(
  verifier: JwksVerifier,
  headers: { get(name: string): string | null },
): Promise<VerifiedPrincipal> {
  if (!headers) throw new UnauthorizedException("Missing request context");
  return verifier.verifyFromHeaders(headers);
}
