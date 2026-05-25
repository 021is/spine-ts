import { BadRequestException, ForbiddenException, NotFoundException } from "@021is/spine-errors";
import type { Event } from "../domain/Event.js";
import { EVENT_STATUS } from "../domain/event-enums.js";
import type { EventRepo } from "../ports/EventRepo.js";

// Use case: orchestrates ports. Pure business logic — never touches a
// framework, never imports an adapter. Tests inject an in-memory port.
export interface PublishEventInput {
  eventId: string;
  userId: string;
}

export interface PublishEventPorts {
  events: EventRepo;
}

export async function publishEvent(
  input: PublishEventInput,
  ports: PublishEventPorts,
): Promise<Event> {
  const event = await ports.events.findById(input.eventId);
  if (!event) {
    throw new NotFoundException("Event not found", {
      translationKey: "event.not_found",
      translationParams: { id: input.eventId },
    });
  }
  if (event.organizerId !== input.userId) {
    throw new ForbiddenException("Only the organizer can publish this event", {
      translationKey: "event.publish.not_organizer",
    });
  }
  if (event.status === EVENT_STATUS.PUBLISHED) {
    throw new BadRequestException("Event already published", {
      translationKey: "event.publish.already_published",
    });
  }
  if (!event.posterUrl) {
    throw new BadRequestException("Add a poster before publishing", {
      translationKey: "event.publish.no_poster",
    });
  }
  return ports.events.setStatus(input.eventId, EVENT_STATUS.PUBLISHED);
}
