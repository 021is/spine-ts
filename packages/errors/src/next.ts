import { NextResponse } from "next/server";
import { type HandleOptions, toHandledError } from "./handler.js";

/**
 * Next.js App Router adapter. Wrap your route handler in `withErrorHandling`:
 *
 *   export const POST = withErrorHandling(async (req) => {
 *     const body = await req.json();
 *     if (!body.id) throw new BadRequestException("id is required");
 *     const user = await users.findOrThrow(body.id);  // throws NotFoundException
 *     return ok(user);
 *   });
 *
 * Any thrown `*Exception` becomes the correct HTTP status + ResponseDto.
 * Anything else (TypeError, etc.) becomes 500 + logged.
 */
export function withErrorHandling<TArgs extends unknown[]>(
  handler: (...args: TArgs) => Promise<Response> | Response,
  options?: HandleOptions,
): (...args: TArgs) => Promise<Response> {
  return async (...args: TArgs) => {
    try {
      return await handler(...args);
    } catch (error) {
      const handled = toHandledError(error, options);
      return NextResponse.json(handled.response, {
        status: handled.status,
        headers: handled.headers,
      });
    }
  };
}

/**
 * Server-action variant — returns the ResponseDto directly (server actions
 * don't go through HTTP status). Status is in `response.code`.
 */
export async function tryAction<T>(
  fn: () => Promise<T>,
  options?: HandleOptions,
): Promise<import("./response-dto.js").ResponseDto<T | null>> {
  try {
    const data = await fn();
    return {
      success: true,
      data,
      code: 200,
      timestamp: Date.now(),
      requestId: options?.requestId,
    };
  } catch (error) {
    const handled = toHandledError(error, options);
    return handled.response;
  }
}
