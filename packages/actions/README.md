# @021.is/spine-actions

Type-safe server-action helper. Bakes zod input validation + auth + audit + `revalidatePath` into one wrapper. Always returns `ResponseDto<T | null>`.

## Use

```ts
"use server";
import { defineAction } from "@021.is/spine-actions";
import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { publishEvent } from "@/feature/event";

export const publishEventAction = defineAction({
  input: z.object({ eventId: z.string().min(1) }),
  auth: requireUser,
  audit: (input, principal) => ({
    action: "event.publish",
    targetId: input.eventId,
    actorId: principal.sub,
  }),
  auditor: async (row) => db.audit.create({ data: row }),
  revalidate: (input) => [`/events/${input.eventId}`, "/events"],
  onRevalidate: revalidatePath,
  handler: async ({ input, principal }) => publishEvent(input, { userId: principal.sub }),
}).run;
```

What the wrapper does in order: parse zod → run `auth` → run `handler` → audit on success → call `onRevalidate` for every returned path → wrap result in `ok(...)`. Any thrown spine-errors exception (`BadRequestException`, `ForbiddenException`, etc.) maps to the correct `ResponseDto` envelope.

## Why

- One pattern for every server action across your app
- Zod parsing failures become `400 BadRequest` with translation keys, not raw stack traces
- Audit happens only on success (no half-states)
- Revalidation hook makes "force-dynamic" pages refresh after writes
- Tested in isolation: `await action.run({ ... })` returns a typed `ResponseDto`, no Next.js context needed
