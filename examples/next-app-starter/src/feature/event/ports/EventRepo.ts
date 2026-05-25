import type { Event } from "../domain/Event.js";
import type { EventStatus } from "../domain/event-enums.js";

// Port: what the use case needs from the outside world. Interfaces only;
// implementations live in adapters/.
export interface EventRepo {
  findById(id: string): Promise<Event | null>;
  setStatus(id: string, status: EventStatus): Promise<Event>;
}
