import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { ForbiddenException, UnauthorizedException } from "@021is/spine-errors";
import { type JwksMockServer, startJwksMockServer } from "@021is/spine-testing/jwks";
import { JwksVerifier, requireRoles, requireScopes } from "../src/verifier.js";

describe("JwksVerifier", () => {
  let jwks: JwksMockServer;
  let verifier: JwksVerifier;
  beforeAll(async () => {
    jwks = await startJwksMockServer();
    verifier = new JwksVerifier({
      jwksUri: `${jwks.url}/.well-known/jwks.json`,
      issuer: "spine-test",
      audience: "test-audience",
    });
  });
  afterAll(async () => {
    await jwks.stop();
  });

  it("verifies a valid token signed by the mock JWKS", async () => {
    const token = await jwks.signToken(
      { sub: "u_1", iss: "spine-test", aud: "test-audience", roles: ["admin"] },
      { expiresIn: "5m" },
    );
    const principal = await verifier.verify(token);
    expect(principal.sub).toBe("u_1");
    expect(principal.roles).toEqual(["admin"]);
  });

  it("throws UnauthorizedException on wrong issuer", async () => {
    const token = await jwks.signToken(
      { sub: "u_1", iss: "evil", aud: "test-audience" },
      { expiresIn: "5m" },
    );
    await expect(verifier.verify(token)).rejects.toThrow(UnauthorizedException);
  });

  it("throws on missing sub", async () => {
    const token = await jwks.signToken({ iss: "spine-test", aud: "test-audience" }, { expiresIn: "5m" });
    await expect(verifier.verify(token)).rejects.toThrow(UnauthorizedException);
  });

  it("verifyFromHeaders extracts bearer", async () => {
    const token = await jwks.signToken(
      { sub: "u_1", iss: "spine-test", aud: "test-audience" },
      { expiresIn: "5m" },
    );
    const headers = new Headers({ authorization: `Bearer ${token}` });
    const p = await verifier.verifyFromHeaders(headers);
    expect(p.sub).toBe("u_1");
  });

  it("verifyFromHeaders rejects malformed header", async () => {
    await expect(
      verifier.verifyFromHeaders(new Headers({ authorization: "Basic xyz" })),
    ).rejects.toThrow(/Bearer/);
  });

  it("verifyFromHeaders rejects missing header", async () => {
    await expect(verifier.verifyFromHeaders(new Headers())).rejects.toThrow(/Missing/);
  });
});

describe("requireRoles / requireScopes", () => {
  it("requireRoles passes when all roles present", () => {
    expect(() => requireRoles({ sub: "u", roles: ["admin", "editor"] }, ["admin"])).not.toThrow();
  });
  it("requireRoles throws Forbidden when missing", () => {
    expect(() => requireRoles({ sub: "u", roles: ["editor"] }, ["admin"])).toThrow(ForbiddenException);
  });
  it("requireRoles noop on empty required", () => {
    expect(() => requireRoles({ sub: "u" }, [])).not.toThrow();
  });
  it("requireScopes passes when all scopes present", () => {
    expect(() => requireScopes({ sub: "u", scopes: ["user.read", "user.write"] }, ["user.read"])).not.toThrow();
  });
  it("requireScopes throws on missing scope", () => {
    expect(() => requireScopes({ sub: "u", scopes: ["user.read"] }, ["user.write"])).toThrow(ForbiddenException);
  });
});
