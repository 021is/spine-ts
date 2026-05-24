import { createHmac, timingSafeEqual } from "node:crypto";
import { BadRequestException, UnauthorizedException } from "@021/spine-errors";

/**
 * Verify an inbound webhook with HMAC-SHA256.
 *
 *   const verifier = makeHmacVerifier({ secret: env.STRIPE_WEBHOOK_SECRET });
 *   verifier.verify({
 *     payload: rawBody,
 *     signature: req.headers.get("stripe-signature")!,
 *     headerScheme: "stripe", // or "raw" | "github" | "resend"
 *   });
 */
export type HeaderScheme = "raw" | "github" | "stripe" | "resend";

export interface VerifierConfig {
  secret: string;
  /** Reject signatures older than this. Default: 5 minutes. */
  toleranceSec?: number;
}

export interface VerifyInput {
  payload: string | Buffer;
  signature: string;
  headerScheme: HeaderScheme;
  /** Override `now` (for tests). */
  nowSec?: number;
}

export interface Verifier {
  verify(input: VerifyInput): void;
  computeSignature(payload: string | Buffer, scheme: HeaderScheme, nowSec?: number): string;
}

export function makeHmacVerifier(config: VerifierConfig): Verifier {
  const secret = config.secret;
  const toleranceSec = config.toleranceSec ?? 5 * 60;

  function hmac(body: string | Buffer): string {
    return createHmac("sha256", secret).update(body).digest("hex");
  }

  return {
    verify(input) {
      const now = input.nowSec ?? Math.floor(Date.now() / 1000);
      const body = typeof input.payload === "string" ? input.payload : input.payload;

      switch (input.headerScheme) {
        case "raw": {
          const expected = hmac(body);
          if (!safeEqHex(expected, input.signature)) {
            throw new UnauthorizedException("Invalid webhook signature");
          }
          return;
        }
        case "github": {
          const provided = input.signature.replace(/^sha256=/, "");
          const expected = hmac(body);
          if (!safeEqHex(expected, provided)) {
            throw new UnauthorizedException("Invalid GitHub webhook signature");
          }
          return;
        }
        case "stripe": {
          // header format: t=<unix>,v1=<sig>[,v0=<...>]
          const parts = Object.fromEntries(
            input.signature.split(",").map((p) => {
              const [k, v] = p.split("=");
              return [k ?? "", v ?? ""];
            }),
          );
          const ts = Number.parseInt(parts.t ?? "", 10);
          const v1 = parts.v1;
          if (!ts || !v1) throw new BadRequestException("Malformed Stripe signature header");
          if (Math.abs(now - ts) > toleranceSec) {
            throw new UnauthorizedException("Stripe signature timestamp outside tolerance");
          }
          const signedPayload = `${ts}.${typeof body === "string" ? body : body.toString("utf8")}`;
          const expected = hmac(signedPayload);
          if (!safeEqHex(expected, v1)) {
            throw new UnauthorizedException("Invalid Stripe webhook signature");
          }
          return;
        }
        case "resend": {
          // Resend uses svix-style: header is "v1,<base64-sig>"
          const provided = input.signature.split(",").pop() ?? "";
          const expectedB64 = createHmac("sha256", secret).update(body).digest("base64");
          if (!safeEqStr(expectedB64, provided)) {
            throw new UnauthorizedException("Invalid Resend webhook signature");
          }
          return;
        }
      }
    },
    computeSignature(payload, scheme, nowSec) {
      const now = nowSec ?? Math.floor(Date.now() / 1000);
      switch (scheme) {
        case "raw":
          return hmac(payload);
        case "github":
          return `sha256=${hmac(payload)}`;
        case "stripe": {
          const body = typeof payload === "string" ? payload : payload.toString("utf8");
          return `t=${now},v1=${hmac(`${now}.${body}`)}`;
        }
        case "resend": {
          const b64 = createHmac("sha256", secret).update(payload).digest("base64");
          return `v1,${b64}`;
        }
      }
    },
  };
}

function safeEqHex(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  try {
    return timingSafeEqual(Buffer.from(a, "hex"), Buffer.from(b, "hex"));
  } catch {
    return false;
  }
}

function safeEqStr(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  return timingSafeEqual(Buffer.from(a), Buffer.from(b));
}

/**
 * Idempotency-key dedupe: returns true if `key` has been seen before.
 * Wire to your Prisma idempotency table.
 */
export interface IdempotencyStore {
  /** Atomically: if key not present, insert + return false; else return true. */
  seen(key: string, ttlSec?: number): Promise<boolean>;
}

export function makeMemoryIdempotencyStore(): IdempotencyStore {
  const map = new Map<string, number>();
  return {
    async seen(key, ttlSec = 24 * 60 * 60) {
      const now = Date.now();
      const expiresAt = map.get(key);
      if (expiresAt && expiresAt > now) return true;
      map.set(key, now + ttlSec * 1000);
      return false;
    },
  };
}
