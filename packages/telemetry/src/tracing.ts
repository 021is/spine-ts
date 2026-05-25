/**
 * OpenTelemetry SDK wire-up. Opt-in — apps that don't import this file
 * don't pay the bundle cost.
 *
 *   // src/lib/telemetry.ts
 *   import { initTelemetry } from "@021is/spine-telemetry/tracing";
 *   initTelemetry({
 *     service: "elvix",
 *     env: process.env.NODE_ENV,
 *     otlpEndpoint: process.env.OTEL_EXPORTER_OTLP_ENDPOINT,
 *   });
 *
 * Then in route handlers / use cases:
 *
 *   import { withSpan } from "@021is/spine-telemetry/tracing";
 *   const event = await withSpan("publishEvent", async (span) => {
 *     span.setAttribute("event.id", id);
 *     return publishEvent(id);
 *   });
 *
 * If the SDK isn't initialized, withSpan is a no-op pass-through.
 */
import { type Span, SpanStatusCode, type Tracer, trace } from "@opentelemetry/api";

export interface InitTelemetryOptions {
  service: string;
  env?: string;
  cluster?: string;
  /** OTLP HTTP collector endpoint. e.g., http://tempo.021-mon:4318 */
  otlpEndpoint?: string;
  /** Sampling rate 0..1. Default: 1 (always sample in dev), 0.05 in prod. */
  samplingRate?: number;
}

let initialized = false;
let cachedTracer: Tracer | undefined;

/**
 * Initialize the OTel SDK. Idempotent — repeated calls are no-ops.
 * Designed to run once at process startup.
 *
 * Heavy deps (@opentelemetry/sdk-node, @opentelemetry/exporter-trace-otlp-http)
 * are dynamic-imported so apps that opt out don't pay the bundle cost.
 */
export async function initTelemetry(options: InitTelemetryOptions): Promise<void> {
  if (initialized) return;
  if (!options.otlpEndpoint) {
    // No endpoint = no telemetry. Stay silent — apps can still call withSpan;
    // it'll be a no-op against the default no-op tracer.
    initialized = true;
    return;
  }
  try {
    const sdkNode = await import("@opentelemetry/sdk-node");
    const { OTLPTraceExporter } = await import("@opentelemetry/exporter-trace-otlp-http");
    const resourcesPkg = await import("@opentelemetry/resources");
    const semconv = await import("@opentelemetry/semantic-conventions");
    // OpenTelemetry has reshuffled exports across major versions — defensively
    // pick the right names so this package works with both 1.x and 2.x.
    const NodeSDK =
      sdkNode.NodeSDK ?? (sdkNode as unknown as { default: typeof sdkNode }).default.NodeSDK;
    const Resource =
      // biome-ignore lint/suspicious/noExplicitAny: cross-version compat
      (resourcesPkg as any).Resource ??
      (resourcesPkg as any).resourceFromAttributes ??
      (resourcesPkg as any).default?.Resource;
    // biome-ignore lint/suspicious/noExplicitAny: cross-version compat
    const semAttrs = semconv as any;
    const ATTR_SERVICE_NAME =
      semAttrs.ATTR_SERVICE_NAME ?? semAttrs.SEMRESATTRS_SERVICE_NAME ?? "service.name";
    const ATTR_DEPLOYMENT_ENV =
      semAttrs.ATTR_DEPLOYMENT_ENVIRONMENT_NAME ??
      semAttrs.SEMRESATTRS_DEPLOYMENT_ENVIRONMENT ??
      "deployment.environment";

    const attrs = {
      [ATTR_SERVICE_NAME]: options.service,
      [ATTR_DEPLOYMENT_ENV]: options.env ?? "development",
      ...(options.cluster ? { "service.cluster": options.cluster } : {}),
    };
    const resource = typeof Resource === "function" ? new Resource(attrs) : Resource(attrs);
    const sdk = new NodeSDK({
      resource,
      traceExporter: new OTLPTraceExporter({ url: `${options.otlpEndpoint}/v1/traces` }),
    });
    sdk.start();
    initialized = true;
  } catch (e) {
    // OTel deps not installed — silent fall-back to no-op tracer.
    initialized = true;
  }
}

/** Get a tracer by name (or the default service tracer). */
export function getTracer(name = "@021is/spine-telemetry"): Tracer {
  if (!cachedTracer) cachedTracer = trace.getTracer(name);
  return cachedTracer;
}

/**
 * Wrap a function in a span. If OTel isn't initialized, the no-op tracer
 * makes this transparent — caller pays effectively zero overhead.
 */
export async function withSpan<T>(
  name: string,
  fn: (span: Span) => Promise<T> | T,
  attributes?: Record<string, string | number | boolean>,
): Promise<T> {
  const tracer = getTracer();
  return tracer.startActiveSpan(name, async (span) => {
    try {
      if (attributes) span.setAttributes(attributes);
      const result = await fn(span);
      span.setStatus({ code: SpanStatusCode.OK });
      return result;
    } catch (e) {
      const err = e instanceof Error ? e : new Error(String(e));
      span.recordException(err);
      span.setStatus({ code: SpanStatusCode.ERROR, message: err.message });
      throw e;
    } finally {
      span.end();
    }
  });
}
