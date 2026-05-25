# @021is/spine-email

Resend wrapper. Bearer auth, retry on 5xx, terminal on 4xx (no infinite-loop on permanent client errors), idempotency-key passthrough, structured logging hook.

## Use

```ts
import { makeEmailClient } from "@021is/spine-email";

const email = makeEmailClient({
  apiKey: env.RESEND_API_KEY,
  defaultFrom: "Elvix <noreply@elvix.is>",
  retries: 2,
  logger: console, // optional pino-compatible logger
});

await email.send({
  to: "edvard@edvone.dev",
  subject: "Welcome to Elvix",
  html: renderToString(<WelcomeEmail name="Edvard" />),
  tags: { app: "elvix", flow: "signup" },
  idempotencyKey: `signup-${userId}`,
});
```

## Behavior

- 5xx → up to `retries` more attempts (default 2)
- 4xx → throws `SomethingWentWrongException` immediately, no retries (4xx is permanent — looping wastes time + money)
- Missing both `html` and `text` → throws
- Sets `idempotency-key` header when provided (Resend dedupes server-side)

## React Email templates

Templates live in the consuming app (React Email, MJML, plain HTML — your call). spine-email is just the transport.

## Why not just `fetch`

Default fetch has no retry, no logging, no terminal-on-4xx logic, no idempotency. After the third app reimplemented it, it became a package.
