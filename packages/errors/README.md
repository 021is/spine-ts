# @021is/spine-errors

The canonical response envelope (`ResponseDto`) + typed exception hierarchy + framework-agnostic handler used by every 021 product.

Lifted from DanceClub's `shared-lib.domain.dto.ResponseDto` and `shared-lib.exceptions.*`. Same contract; idiomatic TypeScript.

## Why mandatory

Every 021 HTTP endpoint and server action returns a `ResponseDto<T>`. No exceptions, no "this small route doesn't need it". The client and the next service both rely on the envelope's `success` / `code` / `errorMessage` / `errorKey` / `errorParams` / `timestamp` / `requestId` to render UI, branch logic, propagate traces, and localize errors.

Locked by Edvard 2026-05-24. Reasoning: consistent client-side handling across every app; no per-route surprise shapes; first-class i18n via `errorKey`.

## Install

```bash
bun add @021is/spine-errors
```

## Use — domain code

```ts
import { BadRequestException, NotFoundException, ForbiddenException } from "@021is/spine-errors";

export async function publishEvent(eventId: string, userId: string) {
  const event = await db.event.findUnique({ where: { id: eventId } });
  if (!event) throw new NotFoundException("Event not found", { translationKey: "event.not_found" });
  if (event.organizerId !== userId) throw new ForbiddenException();
  if (!event.poster) {
    throw new BadRequestException("Event needs a poster before publishing", {
      translationKey: "event.publish.no_poster",
    });
  }
  return db.event.update({ where: { id: eventId }, data: { status: "PUBLISHED" } });
}
```

## Use — Next.js route handler

```ts
import { withErrorHandling, ok } from "@021is/spine-errors/next";
import { publishEvent } from "@/server/events/publish";

export const POST = withErrorHandling(async (req: Request) => {
  const userId = await requireUser(req);
  const { eventId } = await req.json();
  const event = await publishEvent(eventId, userId);
  return Response.json(ok(event, { successMessage: "Event published" }));
});
```

Any thrown `*Exception` becomes the correct HTTP status + `ResponseDto`. Unknown errors → 500 + logged.

## Use — Server action

```ts
import { tryAction } from "@021is/spine-errors/next";
import { publishEvent } from "@/server/events/publish";

export async function publishEventAction(formData: FormData) {
  "use server";
  return tryAction(async () => {
    const userId = await requireUser();
    return publishEvent(formData.get("eventId") as string, userId);
  });
}
```

Status code is in `response.code` (server actions don't have HTTP status).

## Exception → HTTP status map

| Exception | Status |
|---|---|
| `BadRequestException` | 400 |
| `UnauthorizedException` | 401 |
| `ForbiddenException` / `NotAllowedException` | 403 |
| `NotFoundException` | 404 |
| `ConflictException` | 409 |
| `ExpectationFailedException` | 417 |
| `RateLimitedException` | 429 (+ `Retry-After`) |
| `SomethingWentWrongException` / anything else | 500 |

## i18n

Every exception subclass accepts `translationKey` + `translationParams`. These flow into `ResponseDto.errorKey` + `errorParams`. The client's i18n runtime (`@021is/spine-i18n`) reads them and renders the localized message, falling back to `errorMessage` when no key exists.

## Testing

```bash
bun run test
```

Real unit tests, no mocks (this package has no I/O).
