/**
 * Typed exception hierarchy mirroring DanceClub's `shared-lib/exceptions/`.
 * Every domain / service layer throws one of these; the framework adapter
 * (`toResponse()` / `handle()` in `./handler.ts` and `./next.ts`) maps each
 * to its HTTP status + ResponseDto error envelope.
 *
 * Subclass `TranslatableException` to add i18n metadata (translationKey +
 * translationParams). The client's i18n runtime picks up `errorKey` from
 * the response and renders the localized message.
 */

export abstract class TranslatableException extends Error {
  readonly translationKey?: string;
  readonly translationParams?: Record<string, string>;

  constructor(
    message: string,
    options?: {
      cause?: unknown;
      translationKey?: string;
      translationParams?: Record<string, string>;
    },
  ) {
    super(message);
    this.name = this.constructor.name;
    if (options?.cause !== undefined) {
      this.cause = options.cause;
    }
    this.translationKey = options?.translationKey;
    this.translationParams = options?.translationParams;
  }
}

/** 400 — client sent something invalid (bad input, missing field, wrong format). */
export class BadRequestException extends TranslatableException {
  constructor(
    message = "Bad request, please check your request and try again.",
    options?: { cause?: unknown; translationKey?: string; translationParams?: Record<string, string> },
  ) {
    super(message, options);
  }
}

/** 401 — caller is not authenticated (missing/invalid credentials). */
export class UnauthorizedException extends TranslatableException {
  constructor(
    message = "Authentication required.",
    options?: { cause?: unknown; translationKey?: string; translationParams?: Record<string, string> },
  ) {
    super(message, options);
  }
}

/** 403 — caller is authenticated but not allowed to perform this action. */
export class ForbiddenException extends TranslatableException {
  constructor(
    message = "You don't have permission to perform this action.",
    options?: { cause?: unknown; translationKey?: string; translationParams?: Record<string, string> },
  ) {
    super(message, options);
  }
}

/** 403 — variant: action would violate a business rule (semantically distinct from auth). */
export class NotAllowedException extends TranslatableException {
  constructor(
    message = "Action not allowed.",
    options?: { cause?: unknown; translationKey?: string; translationParams?: Record<string, string> },
  ) {
    super(message, options);
  }
}

/** 404 — resource not found. */
export class NotFoundException extends TranslatableException {
  constructor(
    message = "Resource not found.",
    options?: { cause?: unknown; translationKey?: string; translationParams?: Record<string, string> },
  ) {
    super(message, options);
  }
}

/** 409 — write would violate a uniqueness or state invariant. */
export class ConflictException extends TranslatableException {
  constructor(
    message = "Conflict — the operation cannot be completed in the current state.",
    options?: { cause?: unknown; translationKey?: string; translationParams?: Record<string, string> },
  ) {
    super(message, options);
  }
}

/** 417 — request expected a precondition that wasn't met. */
export class ExpectationFailedException extends TranslatableException {
  constructor(
    message = "Expectation failed.",
    options?: { cause?: unknown; translationKey?: string; translationParams?: Record<string, string> },
  ) {
    super(message, options);
  }
}

/** 429 — caller exceeded their rate limit. Includes `retryAfterSec`. */
export class RateLimitedException extends TranslatableException {
  readonly retryAfterSec: number;

  constructor(
    retryAfterSec: number,
    message = "Rate limit exceeded. Please try again later.",
    options?: { cause?: unknown; translationKey?: string; translationParams?: Record<string, string> },
  ) {
    super(message, options);
    this.retryAfterSec = retryAfterSec;
  }
}

/** 500 — explicit "something went wrong" (use sparingly; prefer specific types). */
export class SomethingWentWrongException extends TranslatableException {
  constructor(
    message = "Something went wrong. Try again or contact support.",
    options?: { cause?: unknown; translationKey?: string; translationParams?: Record<string, string> },
  ) {
    super(message, options);
  }
}
