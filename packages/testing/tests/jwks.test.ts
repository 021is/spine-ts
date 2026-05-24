import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { type JwksMockServer, startJwksMockServer } from "../src/jwks.js";

describe("startJwksMockServer", () => {
  let jwks: JwksMockServer;
  beforeAll(async () => {
    jwks = await startJwksMockServer();
  });
  afterAll(async () => {
    await jwks.stop();
  });

  it("exposes a JWKS endpoint with one RS256 public key", async () => {
    const res = await fetch(`${jwks.url}/.well-known/jwks.json`);
    expect(res.ok).toBe(true);
    const body = (await res.json()) as { keys: { kid?: string; alg?: string; kty?: string }[] };
    expect(body.keys).toHaveLength(1);
    const key = body.keys[0];
    expect(key?.kid).toBe(jwks.keyId);
    expect(key?.alg).toBe("RS256");
    expect(key?.kty).toBe("RSA");
  });

  it("signs a token with the matching kid", async () => {
    const token = await jwks.signToken(
      { sub: "u_1", roles: ["admin"], iss: "spine-test" },
      { expiresIn: "5m" },
    );
    const [header] = token.split(".");
    if (!header) throw new Error("malformed JWT");
    const decoded = JSON.parse(Buffer.from(header, "base64url").toString());
    expect(decoded.alg).toBe("RS256");
    expect(decoded.kid).toBe(jwks.keyId);
    expect(decoded.typ).toBe("JWT");
  });

  it("404s any other path", async () => {
    const res = await fetch(`${jwks.url}/not-a-route`);
    expect(res.status).toBe(404);
  });
});
