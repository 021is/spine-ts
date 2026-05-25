import type { EventStatus, EventVisibility } from "./event-enums.js";

// Pure domain entity. NO imports of Prisma, fetch, next, etc.
export interface Event {
  id: string;
  organizerId: string;
  title: string;
  status: EventStatus;
  visibility: EventVisibility;
  posterUrl: string | null;
  startsAt: Date;
  createdAt: Date;
}
