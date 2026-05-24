import {
  BadRequestException,
  ConflictException,
  ExpectationFailedException,
  ForbiddenException,
  NotAllowedException,
  NotFoundException,
  RateLimitedException,
  SomethingWentWrongException,
  TranslatableException,
  UnauthorizedException,
} from "./exceptions.js";
import { type ResponseDto, err } from "./response-dto.js";

/**
 * Map any thrown value to (httpStatus, ResponseDto).
 *
 * Framework-agnostic. The Next.js adapter (`./next.ts`) wraps this to return
 * a NextResponse; Express / Hono / Bun.serve adapters do the equivalent.
 *
 * Mirrors DanceClub's `GlobalExceptionHandler`:
 *   BadRequestException        → 400
 *   UnauthorizedException      → 401
 *   ForbiddenException         → 403
 *   NotAllowedException        → 403
 *   NotFoundException          → 404
 *   ConflictException          → 409
 *   ExpectationFailedException → 417
 *   RateLimitedException       → 429 (+ Retry-After header in the adapter)
 *   SomethingWentWrongException → 500
 *   anything else              → 500 (logged with full stack)
 */
export interface HandledError {
  status: number;
  response: ResponseDto<null>;
  /** HTTP header hints the framework adapter should set (e.g., Retry-After). */
  headers?: Record<string, string>;
  /** True iff the error was an unexpected internal error (worth logging at error level). */
  isInternal: boolean;
}

export interface HandleOptions {
  /** Caller-supplied request id (propagate from telemetry middleware). */
  requestId?: string;
  /** Optional logger; if not provided, internals are logged with `console.error`. */
  // biome-ignore lint/suspicious/noExplicitAny: logger is intentionally generic
  logger?: { error: (msg: string, meta?: any) => void };
}

export function toHandledError(error: unknown, options?: HandleOptions): HandledError {
  const requestId = options?.requestId;
  const logger = options?.logger ?? { error: (...args: unknown[]) => console.error(...args) };

  const e = error instanceof Error ? error : new Error(String(error));
  const isTranslatable = e instanceof TranslatableException;
  const errorKey = isTranslatable ? (e as TranslatableException).translationKey : undefined;
  const errorParams = isTranslatable ? (e as TranslatableException).translationParams : undefined;

  let status = 500;
  let headers: Record<string, string> | undefined;
  let isInternal = false;

  if (e instanceof BadRequestException) status = 400;
  else if (e instanceof UnauthorizedException) status = 401;
  else if (e instanceof ForbiddenException) status = 403;
  else if (e instanceof NotAllowedException) status = 403;
  else if (e instanceof NotFoundException) status = 404;
  else if (e instanceof ConflictException) status = 409;
  else if (e instanceof ExpectationFailedException) status = 417;
  else if (e instanceof RateLimitedException) {
    status = 429;
    headers = { "Retry-After": String(e.retryAfterSec) };
  } else if (e instanceof SomethingWentWrongException) {
    status = 500;
    isInternal = true;
  } else {
    status = 500;
    isInternal = true;
  }

  if (isInternal) {
    logger.error(`[spine-errors] unhandled error: ${e.message}`, {
      name: e.name,
      stack: e.stack,
      requestId,
    });
  }

  const response = err(status, e.message, { errorKey, errorParams, requestId });
  return { status, response, headers, isInternal };
}
