/**
 * The canonical response envelope for every 021 HTTP endpoint and server action.
 *
 * Lifted from DanceClub's `app.danceclub.lib.shared.domain.dto.ResponseDto`.
 * Differences from the Kotlin original:
 *   - All fields immutable (TypeScript / functional friendly).
 *   - `requestId` added for end-to-end tracing (links to telemetry span).
 *
 * MANDATORY across every 021 product. No endpoint may return a raw payload
 * without this envelope. Locked by Edvard 2026-05-24.
 */
export interface ResponseDto<T> {
  /** True iff the operation succeeded. Drives client UI branching. */
  readonly success: boolean;

  /** The payload. For success: the actual data. For failure: usually `null`. */
  readonly data: T;

  /** Mirror of the HTTP status code so the client doesn't need to read headers. */
  readonly code: number;

  /** Human-readable success message, if any (toast / banner copy). */
  readonly successMessage?: string;

  /** Human-readable error message, if any. NEVER reveals internals. */
  readonly errorMessage?: string;

  /**
   * Translation key for the error (e.g. `auth.session.expired`).
   * Client uses this with its i18n runtime to render the localized message,
   * falling back to `errorMessage` when no key exists.
   */
  readonly errorKey?: string;

  /** Parameters to interpolate into the translation. */
  readonly errorParams?: Record<string, string>;

  /** Extra helper copy (e.g. "Try signing out and back in"). */
  readonly helperMessage?: string;

  /** Unix epoch milliseconds at response time. */
  readonly timestamp: number;

  /**
   * The request id assigned by the telemetry middleware. Returned so the
   * client can include it in bug reports / support tickets.
   */
  readonly requestId?: string;
}

/** Construct a success response. */
export function ok<T>(
  data: T,
  options?: Omit<Partial<ResponseDto<T>>, "data" | "success">,
): ResponseDto<T> {
  return {
    success: true,
    data,
    code: options?.code ?? 200,
    successMessage: options?.successMessage,
    timestamp: options?.timestamp ?? Date.now(),
    requestId: options?.requestId,
  };
}

/** Construct an error response. `data` defaults to `null`. */
export function err<T = null>(
  code: number,
  errorMessage: string,
  options?: {
    data?: T;
    errorKey?: string;
    errorParams?: Record<string, string>;
    helperMessage?: string;
    requestId?: string;
  },
): ResponseDto<T | null> {
  return {
    success: false,
    data: (options?.data ?? null) as T | null,
    code,
    errorMessage,
    errorKey: options?.errorKey,
    errorParams: options?.errorParams,
    helperMessage: options?.helperMessage,
    timestamp: Date.now(),
    requestId: options?.requestId,
  };
}
