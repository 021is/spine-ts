# @021.is/spine-http

Typed fetch client with resilience defaults: per-request timeout, retry on idempotent failures, circuit breaker per host. Auto-unwraps `ResponseDto` envelopes from sibling packages.

## Use

```ts
import { SpineHttpClient } from "@021.is/spine-http";

const dcEvents = new SpineHttpClient({
  baseUrl: "https://api.example.com",
  timeoutMs: 1000,             // default
  retries: 1,                  // default — retries idempotent methods only
  failureThreshold: 5,         // default — open circuit after 5 fails in 10s
  windowMs: 10_000,
  defaultHeaders: { "x-service": "my-app" },
  authToken: async () => mintServiceJwt(), // optional
});

// Auto-unwraps ResponseDto<Event> if peer is your service
const event = await dcEvents.get<Event>(`/events/${id}`);
```

## Resilience defaults (tuned for service-to-service)

| | Default | Tunable |
|---|---|---|
| Timeout per request | 1000 ms | `timeoutMs` |
| Retries on GET/HEAD/PUT/DELETE | 1 | `retries` |
| Circuit-break threshold | 5 failures in 10s | `failureThreshold`, `windowMs` |
| Retries on POST/PATCH | 0 (POST is non-idempotent by default) | — |

## Circuit behavior

After `failureThreshold` failures within `windowMs`, the circuit opens for the remainder of `windowMs`. New requests fail fast with `circuit open — Xs remaining` until the window expires, then probe-mode resumes.

## ResponseDto unwrap

If peer returns `{ success, data, code, ... }` shape (i.e., they use spine-errors), the client unwraps and returns `data` directly. If `success: false`, throws an Error carrying `code` + `errorKey`.
