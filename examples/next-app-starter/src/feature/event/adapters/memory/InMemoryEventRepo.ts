import type { Event } from "../../domain/Event.js";
import type { EventStatus } from "../../domain/event-enums.js";
import type { EventRepo } from "../../ports/EventRepo.js";

// In-memory adapter — used by tests. Production uses the Prisma adapter
// (sibling folder, not shipped in this skeleton).
export function makeInMemoryEventRepo(seed: Event[] = []): EventRepo {
  const store = new Map<string, Event>(seed.map((e) => [e.id, e]));
  return {
    async findById(id) {
      return store.get(id) ?? null;
    },
    async setStatus(id, status) {
      const existing = store.get(id);
      if (!existing) throw new Error(`event ${id} not found (use case should have checked)`);
      const updated: Event = { ...existing, status };
      store.set(id, updated);
      return updated;
    },
  };
}
