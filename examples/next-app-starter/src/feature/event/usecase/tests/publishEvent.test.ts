import { describe, expect, it } from "vitest";
import { BadRequestException, ForbiddenException, NotFoundException } from "@021is/spine-errors";
import type { Event } from "../../domain/Event.js";
import { EVENT_STATUS, EVENT_VISIBILITY } from "../../domain/event-enums.js";
import { makeInMemoryEventRepo } from "../../adapters/memory/InMemoryEventRepo.js";
import { publishEvent } from "../publishEvent.js";

const seed: Event[] = [
  {
    id: "e_1",
    organizerId: "u_1",
    title: "Bachata night",
    status: EVENT_STATUS.DRAFT,
    visibility: EVENT_VISIBILITY.PUBLIC,
    posterUrl: "https://cdn.example/p1.jpg",
    startsAt: new Date("2026-06-01T20:00:00Z"),
    createdAt: new Date("2026-05-20T00:00:00Z"),
  },
  {
    id: "e_2",
    organizerId: "u_2",
    title: "Tango — no poster",
    status: EVENT_STATUS.DRAFT,
    visibility: EVENT_VISIBILITY.PUBLIC,
    posterUrl: null,
    startsAt: new Date("2026-07-01T20:00:00Z"),
    createdAt: new Date("2026-05-20T00:00:00Z"),
  },
];

describe("publishEvent", () => {
  it("publishes a draft event for the owning organizer", async () => {
    const events = makeInMemoryEventRepo(seed);
    const result = await publishEvent({ eventId: "e_1", userId: "u_1" }, { events });
    expect(result.status).toBe(EVENT_STATUS.PUBLISHED);
  });

  it("throws NotFound when event missing", async () => {
    const events = makeInMemoryEventRepo(seed);
    await expect(
      publishEvent({ eventId: "e_missing", userId: "u_1" }, { events }),
    ).rejects.toThrow(NotFoundException);
  });

  it("throws Forbidden when caller isn't the organizer", async () => {
    const events = makeInMemoryEventRepo(seed);
    await expect(
      publishEvent({ eventId: "e_1", userId: "u_other" }, { events }),
    ).rejects.toThrow(ForbiddenException);
  });

  it("throws BadRequest when no poster", async () => {
    const events = makeInMemoryEventRepo(seed);
    await expect(
      publishEvent({ eventId: "e_2", userId: "u_2" }, { events }),
    ).rejects.toThrow(BadRequestException);
  });
});
