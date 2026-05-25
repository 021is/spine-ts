// Public surface — only these symbols leave the feature folder.
// Cross-feature callers import from here, never reach into domain/ or usecase/.
export {
  publishEvent,
  type PublishEventInput,
  type PublishEventPorts,
} from "./usecase/publishEvent.js";
export { publishEventInput } from "./schema/publishEvent.js";
export type { Event } from "./domain/Event.js";
export {
  EVENT_STATUS,
  EVENT_VISIBILITY,
  type EventStatus,
  type EventVisibility,
} from "./domain/event-enums.js";
export type { EventRepo } from "./ports/EventRepo.js";
