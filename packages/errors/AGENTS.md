# AGENTS.md — @021is/spine-errors

## What this is

The mandatory response envelope + exception hierarchy for every 021 HTTP endpoint and server action. Lifted from DanceClub's `shared-lib.domain.dto.ResponseDto` + `shared-lib.exceptions.*`.

## Hard rules

- **`ResponseDto` is the only return shape.** Never return raw data from an endpoint or server action.
- **Every domain function that can fail throws an exception** from this package — never return `{ ok: false, error }` discriminated unions for HTTP-mappable errors (that's a layer-leak).
- **Always provide `translationKey` for user-facing errors.** `errorMessage` is the fallback; `errorKey` is the contract with the client's i18n runtime.
- **Never `catch` an exception of this hierarchy** in app code — let the adapter (`withErrorHandling` / `tryAction`) handle it. Catching domain exceptions in route handlers defeats the global handler purpose.

## When to subclass

Don't. The 9 exceptions cover every HTTP-mappable case. If your domain needs a richer error, create a domain-private error type and wrap with one of these at the boundary.

## How to extend the handler

If a new framework adapter is needed (Hono, Bun.serve, Elysia), add a sibling file to `src/next.ts` that imports from `./handler.js`. Keep `./handler.ts` framework-agnostic.

## Tests

`tests/*.test.ts` — Vitest, no Testcontainers needed (zero I/O).
