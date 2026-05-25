import { type Server, createServer } from "node:http";
import { type JWK, type KeyLike, SignJWT, exportJWK, generateKeyPair } from "jose";

/**
 * Spin up an in-process JWKS server that mints + serves test JWTs.
 * Use in tests that need to assert a request hits the auth middleware
 * with a valid token, without depending on a real elvix instance.
 *
 *   const jwks = await startJwksMockServer();
 *   const token = await jwks.signToken({ sub: "u_1", roles: ["admin"] });
 *   // point your auth middleware at jwks.url + "/.well-known/jwks.json"
 *   await fetch(myApi, { headers: { Authorization: `Bearer ${token}` } });
 *   await jwks.stop();
 */
export interface JwksMockServer {
  url: string;
  keyId: string;
  publicJwk: JWK;
  signToken(
    claims: Record<string, unknown>,
    opts?: { expiresIn?: string | number },
  ): Promise<string>;
  stop(): Promise<void>;
}

export async function startJwksMockServer(
  options: { keyId?: string } = {},
): Promise<JwksMockServer> {
  const keyId = options.keyId ?? "spine-test-key-1";
  const { publicKey, privateKey } = (await generateKeyPair("RS256")) as {
    publicKey: KeyLike;
    privateKey: KeyLike;
  };
  const publicJwk = (await exportJWK(publicKey)) as JWK;
  publicJwk.kid = keyId;
  publicJwk.alg = "RS256";
  publicJwk.use = "sig";

  const server: Server = createServer((req, res) => {
    if (req.url === "/.well-known/jwks.json") {
      res.writeHead(200, { "content-type": "application/json" });
      res.end(JSON.stringify({ keys: [publicJwk] }));
      return;
    }
    res.writeHead(404);
    res.end();
  });
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const address = server.address();
  if (!address || typeof address === "string") throw new Error("jwks server failed to bind");
  const url = `http://127.0.0.1:${address.port}`;

  const signToken: JwksMockServer["signToken"] = async (claims, opts = {}) => {
    let jwt = new SignJWT(claims as Record<string, unknown>)
      .setProtectedHeader({ alg: "RS256", kid: keyId, typ: "JWT" })
      .setIssuedAt();
    if (opts.expiresIn) jwt = jwt.setExpirationTime(opts.expiresIn);
    return jwt.sign(privateKey);
  };

  return {
    url,
    keyId,
    publicJwk,
    signToken,
    async stop() {
      await new Promise<void>((resolve, reject) =>
        server.close((err) => (err ? reject(err) : resolve())),
      );
    },
  };
}
