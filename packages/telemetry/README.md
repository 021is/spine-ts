# @021.is/spine-telemetry

Pino structured JSON logger with Loki-friendly base fields + AsyncLocalStorage-backed request context. Every log line automatically tagged with `request_id` when inside a request scope — no per-log boilerplate.

## Use

```ts
// src/lib/logger.ts
import { makeLogger } from "@021.is/spine-telemetry";

export const log = makeLogger({
  service: "my-app",
  cluster: "eu-1",
  env: process.env.NODE_ENV,
  level: "info",
});
```

## Request context (Next.js middleware or route wrapper)

```ts
import { newRequestId, withRequestContext } from "@021.is/spine-telemetry";

export async function middleware(req: Request) {
  const requestId = newRequestId();
  return withRequestContext({ requestId, path: req.url }, async () => {
    return NextResponse.next();
  });
}
```

Now every `log.info(...)` inside the request chain (across awaits, across files) emits:

```json
{
  "level": "info",
  "time": "2026-05-25T12:00:00.000Z",
  "service": "my-app",
  "cluster": "eu-1",
  "env": "production",
  "request_id": "req_lvxn9k0a1b2c3d",
  "msg": "..."
}
```

Loki labels (`service`, `cluster`) make per-app filtering instant in Grafana.

## Why AsyncLocalStorage

Don't pass `logger` or `requestId` through every function argument. The async store does it for you — works across `await`, `setTimeout`, `Promise.all`, etc.

## What's NOT included (yet)

- OpenTelemetry tracer wire-up — planned for next release.
- Pino transport for Loki HTTP push — for now, write to stdout + ship via Vector.
