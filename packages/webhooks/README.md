# @021.is/spine-webhooks

Inbound webhook HMAC verifier (4 formats: raw, GitHub `sha256=…`, Stripe `t=…,v1=…` with tolerance window, Resend svix-style `v1,<b64>`) + idempotency-key dedupe store. Timing-safe comparisons throughout.

## Use

```ts
import { makeHmacVerifier, makeMemoryIdempotencyStore } from "@021.is/spine-webhooks";

const stripe = makeHmacVerifier({
  secret: env.STRIPE_WEBHOOK_SECRET,
  toleranceSec: 5 * 60, // 5min — Stripe's recommended max clock skew
});

export const POST = withErrorHandling(async (req: Request) => {
  const rawBody = await req.text();
  const signature = req.headers.get("stripe-signature");
  if (!signature) throw new BadRequestException("missing signature");

  stripe.verify({ payload: rawBody, signature, headerScheme: "stripe" });

  const event = JSON.parse(rawBody);
  const seen = await store.seen(event.id);
  if (seen) return Response.json(ok({ duplicate: true }));

  await handleStripeEvent(event);
  return Response.json(ok({ processed: true }));
});
```

## Schemes

| | What |
|---|---|
| `raw` | Plain HMAC-SHA256 hex of body |
| `github` | `sha256=<hex>` prefix |
| `stripe` | `t=<unix>,v1=<sig>` — body is `${ts}.${rawBody}`; tolerance window enforces freshness |
| `resend` | svix-style `v1,<base64>` |

## Idempotency

Webhooks retry on network failure. Without dedup you charge twice / send twice / publish twice. `store.seen(key, ttlSec)` returns true if the key has been seen within TTL — first call returns false + records; subsequent calls return true.

Memory store for tests + tiny apps. Wire to your Prisma idempotency table for production.

## Timing-safe comparisons

All signature checks use `crypto.timingSafeEqual` — string compare is timing-attackable.
