import { z } from "zod";

export const publishEventInput = z.object({
  eventId: z.string().min(1),
});
export type PublishEventInput = z.infer<typeof publishEventInput>;
