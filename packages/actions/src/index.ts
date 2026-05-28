import { BadRequestException, type ResponseDto, ok, toHandledError } from "@021.is/spine-errors";
import type { ZodTypeAny, z } from "zod";

/**
 * Type-safe server-action helper.
 *
 *   const publishEvent = defineAction({
 *     input: z.object({ eventId: z.string().cuid() }),
 *     auth: requireUser,                      // your project's auth resolver
 *     audit: (input, principal) => ({         // audit metadata
 *       action: "event.publish",
 *       targetId: input.eventId,
 *       actorId: principal.sub,
 *     }),
 *     revalidate: (input) => [`/events/${input.eventId}`, "/events"],
 *     handler: async ({ input, principal }) => {
 *       return publishEventUseCase(input.eventId, { principal });
 *     },
 *   });
 *
 *   // usage:
 *   "use server";
 *   export const publishEventAction = publishEvent.run;
 *
 * Always returns a ResponseDto<T | null>:
 *   - validation fail  → 400 + errorMessage
 *   - auth fail        → 401/403
 *   - business fail    → mapped via spine-errors handler
 *   - success          → 200 + data
 */
export interface ActionDefinition<TSchema extends ZodTypeAny, TPrincipal, TResult> {
  input: TSchema;
  /** Resolve the current principal (e.g. requireUser). Throws Unauthorized if absent. */
  auth?: () => Promise<TPrincipal>;
  /** Audit row builder; if returned, the auditor callback gets it. */
  audit?: (input: z.infer<TSchema>, principal: TPrincipal) => Record<string, unknown> | undefined;
  /** Auditor callback; default: noop. Wire to your audit table. */
  auditor?: (row: Record<string, unknown>) => Promise<void> | void;
  /** Paths to revalidate on success. Strings get `revalidatePath(p)`. */
  revalidate?: (input: z.infer<TSchema>, result: TResult) => string[];
  /** The actual handler. Receives validated input + principal. */
  handler: (ctx: { input: z.infer<TSchema>; principal: TPrincipal }) => Promise<TResult>;
  /** Hook to invoke `revalidatePath` (Next.js). Default: noop. */
  onRevalidate?: (path: string) => void;
  /** Logger hook for unhandled errors. */
  // biome-ignore lint/suspicious/noExplicitAny: open logger
  logger?: { error: (msg: string, meta?: any) => void };
}

export interface BuiltAction<TResult> {
  run(rawInput: unknown): Promise<ResponseDto<TResult | null>>;
}

export function defineAction<TSchema extends ZodTypeAny, TPrincipal, TResult>(
  def: ActionDefinition<TSchema, TPrincipal, TResult>,
): BuiltAction<TResult> {
  return {
    async run(rawInput: unknown): Promise<ResponseDto<TResult | null>> {
      try {
        const parsed = def.input.safeParse(rawInput);
        if (!parsed.success) {
          const issues = parsed.error.issues
            .map((i) => `${i.path.join(".") || "(root)"}: ${i.message}`)
            .join("; ");
          throw new BadRequestException(`Invalid input: ${issues}`, {
            translationKey: "validation.failed",
          });
        }
        const input = parsed.data as z.infer<TSchema>;
        const principal = def.auth ? await def.auth() : (undefined as TPrincipal);

        const result = await def.handler({ input, principal });

        if (def.audit) {
          const row = def.audit(input, principal);
          if (row && def.auditor) await def.auditor(row);
        }

        if (def.revalidate && def.onRevalidate) {
          for (const p of def.revalidate(input, result)) def.onRevalidate(p);
        }

        return ok(result);
      } catch (error) {
        const handled = toHandledError(error, { logger: def.logger });
        return handled.response;
      }
    },
  };
}
