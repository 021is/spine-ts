import { publishEvent, publishEventInput } from "@/feature/event";
import { requireUser } from "@/lib/auth";
import { eventsRepo } from "@/lib/wiring";
import { ok, withErrorHandling } from "@021.is/spine-errors/next";

/**
 * POST /api/events/[id]/publish
 *
 * Publishes a draft event. Caller must be the organizer + event must
 * have a poster. Returns the updated Event in a ResponseDto envelope.
 *
 * Authz: requireUser via spine-auth (cookie-based session).
 * Mutates: events.status (draft → published).
 */
export const POST = withErrorHandling(
  async (req: Request, ctx: { params: Promise<{ id: string }> }) => {
    const params = await ctx.params;
    const input = publishEventInput.parse({ eventId: params.id });
    const user = await requireUser(req);
    const result = await publishEvent(
      { eventId: input.eventId, userId: user.sub },
      { events: eventsRepo },
    );
    return Response.json(ok(result, { successMessage: "Event published" }));
  },
);
