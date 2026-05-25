import { AsyncLocalStorage } from "node:async_hooks";
import { type LoggerOptions, type Logger as PinoLogger, pino } from "pino";

/**
 * Structured JSON logger with Loki-friendly field names (cluster, service,
 * env, request_id). Wraps Pino with sensible defaults.
 *
 * The `request_id` field is automatically attached when the call site is
 * inside `withRequestContext`. This lets Vector's Loki sink correlate logs
 * with traces without any per-log boilerplate.
 */
export interface LoggerConfig {
  service: string;
  cluster?: string;
  env?: string;
  level?: "debug" | "info" | "warn" | "error" | "fatal";
}

export interface RequestContext {
  requestId: string;
  // biome-ignore lint/suspicious/noExplicitAny: arbitrary trace fields allowed
  [key: string]: any;
}

const als = new AsyncLocalStorage<RequestContext>();

export function makeLogger(config: LoggerConfig): PinoLogger {
  const opts: LoggerOptions = {
    level: config.level ?? "info",
    base: {
      service: config.service,
      cluster: config.cluster,
      env: config.env ?? process.env.NODE_ENV ?? "development",
    },
    mixin: () => {
      const ctx = als.getStore();
      if (!ctx) return {};
      return { request_id: ctx.requestId, ...ctx };
    },
    timestamp: pino.stdTimeFunctions.isoTime,
    formatters: {
      level: (label) => ({ level: label }),
    },
  };
  return pino(opts);
}

/**
 * Run `fn` with a request context that's automatically attached to every
 * log line produced inside it (across awaits).
 *
 *   app.use((req, res, next) => withRequestContext({ requestId: nanoid() }, next));
 */
export async function withRequestContext<T>(
  ctx: RequestContext,
  fn: () => T | Promise<T>,
): Promise<T> {
  return als.run(ctx, async () => fn());
}

/** Get the current request id, or undefined if outside a request context. */
export function currentRequestId(): string | undefined {
  return als.getStore()?.requestId;
}

/** Generate a request id (cuid-like — 16 char base36 + timestamp suffix). */
export function newRequestId(): string {
  const ts = Date.now().toString(36);
  const rand = Math.random().toString(36).slice(2, 12);
  return `req_${ts}${rand}`;
}
