# @021is/spine-auth

JWKS-based RS256 JWT verifier with cached key fetching + role/scope guards. Verifies elvix-issued tokens in production; pair with `@021is/spine-testing/jwks` for tests.

## Use — verify a token

```ts
import { JwksVerifier, requireRoles } from "@021is/spine-auth";

const verifier = new JwksVerifier({
  jwksUri: env.ELVIX_JWKS_URI,            // https://elvix.is/.well-known/jwks.json
  issuer: env.ELVIX_ISSUER,                // "elvix.is"
  audience: env.ELVIX_AUDIENCE,            // your app's client id
  cacheTtlMs: 60 * 60 * 1000,              // 1h (default)
});

const principal = await verifier.verifyFromHeaders(req.headers);
requireRoles(principal, ["admin"]);
```

## Use — Next.js route handler

```ts
import { withAuth, makeVerifier } from "@021is/spine-auth/next";
export const verifier = makeVerifier({ jwksUri: env.ELVIX_JWKS_URI });

export const GET = withAuth(verifier, async ({ principal }) => {
  return Response.json({ me: principal.sub });
}, { roles: ["admin"] });
```

## Behavior

- **Caches JWKS** for `cacheTtlMs` (default 1h)
- **Force-refreshes** on any unknown `kid` — elvix key rotation doesn't break the cluster
- Throws `UnauthorizedException` on bad/expired/wrong-issuer token (→ 401)
- Throws `ForbiddenException` on missing role/scope (→ 403)
- Pairs with `@021is/spine-testing/jwks` for in-process test JWKS server (no real elvix needed)
