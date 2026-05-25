// Reference: const-as-object enums (the only enum style Spine accepts).
// See axon/knowledge/spine-rules.md § Enums + STRUCTURE.md § Enum-over-string.

export const EVENT_STATUS = {
  DRAFT: "draft",
  PUBLISHED: "published",
  CANCELLED: "cancelled",
  ARCHIVED: "archived",
} as const;
export type EventStatus = (typeof EVENT_STATUS)[keyof typeof EVENT_STATUS];

export const EVENT_VISIBILITY = {
  PUBLIC: "public",
  UNLISTED: "unlisted",
  PRIVATE: "private",
} as const;
export type EventVisibility = (typeof EVENT_VISIBILITY)[keyof typeof EVENT_VISIBILITY];
