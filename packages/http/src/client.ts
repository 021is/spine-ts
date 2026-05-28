import type { ResponseDto } from "@021.is/spine-errors";

/**
 * Typed, resilient HTTP client. Wraps fetch with:
 *   - per-request timeout (default 1s — matches the Kotlin REST kit)
 *   - retry on idempotent failures (GET/HEAD/PUT/DELETE) up to N times
 *   - circuit-break per host after K failures in a window (default 5 in 10s)
 *   - automatic ResponseDto unwrapping when peer is your service
 */
export interface SpineHttpConfig {
  baseUrl: string;
  /** Per-request timeout in ms. Default 1000. */
  timeoutMs?: number;
  /** Number of retries on idempotent methods. Default 1 (1 retry = 2 total attempts). */
  retries?: number;
  /** Circuit-breaker: open after N failures within window. Default 5. */
  failureThreshold?: number;
  /** Circuit-breaker window in ms. Default 10_000. */
  windowMs?: number;
  /** Headers added to every request. */
  defaultHeaders?: Record<string, string>;
  /**
   * Hook to provide an auth token per request (e.g. mint service-JWT).
   * Returns the bearer string (without "Bearer " prefix).
   */
  authToken?: () => Promise<string | undefined>;
  /** Custom fetch (test injection). Default: globalThis.fetch. */
  fetchImpl?: typeof fetch;
}

interface CircuitState {
  failures: { ts: number }[];
  openUntil?: number;
}

const IDEMPOTENT = new Set(["GET", "HEAD", "OPTIONS", "PUT", "DELETE"]);

export class SpineHttpClient {
  private readonly config: Required<
    Omit<SpineHttpConfig, "authToken" | "fetchImpl" | "defaultHeaders">
  > &
    Pick<SpineHttpConfig, "authToken" | "fetchImpl" | "defaultHeaders">;
  private readonly circuit: CircuitState = { failures: [] };

  constructor(config: SpineHttpConfig) {
    this.config = {
      baseUrl: config.baseUrl.replace(/\/$/, ""),
      timeoutMs: config.timeoutMs ?? 1000,
      retries: config.retries ?? 1,
      failureThreshold: config.failureThreshold ?? 5,
      windowMs: config.windowMs ?? 10_000,
      defaultHeaders: config.defaultHeaders,
      authToken: config.authToken,
      fetchImpl: config.fetchImpl,
    };
  }

  async request<T>(path: string, init: RequestInit & { method?: string } = {}): Promise<T> {
    this.checkCircuit();
    const method = (init.method ?? "GET").toUpperCase();
    const url = path.startsWith("http") ? path : `${this.config.baseUrl}${path}`;
    const headers = new Headers(init.headers ?? {});
    if (this.config.defaultHeaders) {
      for (const [k, v] of Object.entries(this.config.defaultHeaders)) headers.set(k, v);
    }
    if (this.config.authToken) {
      const token = await this.config.authToken();
      if (token) headers.set("Authorization", `Bearer ${token}`);
    }
    if (init.body && !headers.has("content-type")) {
      headers.set("content-type", "application/json");
    }

    const maxAttempts = IDEMPOTENT.has(method) ? this.config.retries + 1 : 1;
    let lastErr: unknown;
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        const ctrl = new AbortController();
        const timeout = setTimeout(() => ctrl.abort(), this.config.timeoutMs);
        try {
          const fetchFn = this.config.fetchImpl ?? globalThis.fetch;
          const res = await fetchFn(url, { ...init, headers, method, signal: ctrl.signal });
          if (!res.ok) {
            const body = await res.text();
            throw new Error(`HTTP ${res.status} ${method} ${url}: ${body.slice(0, 200)}`);
          }
          const data = (await res.json()) as unknown;
          this.recordSuccess();
          return this.unwrap<T>(data);
        } finally {
          clearTimeout(timeout);
        }
      } catch (e) {
        lastErr = e;
        this.recordFailure();
        if (attempt === maxAttempts) break;
      }
    }
    throw lastErr;
  }

  get<T>(path: string, init?: Omit<RequestInit, "method" | "body">): Promise<T> {
    return this.request<T>(path, { ...init, method: "GET" });
  }
  post<T>(path: string, body: unknown, init?: Omit<RequestInit, "method" | "body">): Promise<T> {
    return this.request<T>(path, {
      ...init,
      method: "POST",
      body: body == null ? null : JSON.stringify(body),
    });
  }
  put<T>(path: string, body: unknown, init?: Omit<RequestInit, "method" | "body">): Promise<T> {
    return this.request<T>(path, {
      ...init,
      method: "PUT",
      body: body == null ? null : JSON.stringify(body),
    });
  }
  patch<T>(path: string, body: unknown, init?: Omit<RequestInit, "method" | "body">): Promise<T> {
    return this.request<T>(path, {
      ...init,
      method: "PATCH",
      body: body == null ? null : JSON.stringify(body),
    });
  }
  delete<T>(path: string, init?: Omit<RequestInit, "method" | "body">): Promise<T> {
    return this.request<T>(path, { ...init, method: "DELETE" });
  }

  /** Strip the ResponseDto envelope if peer returned one; otherwise pass through. */
  private unwrap<T>(data: unknown): T {
    if (data && typeof data === "object" && "success" in data && "data" in data && "code" in data) {
      const dto = data as ResponseDto<T>;
      if (!dto.success) {
        const err = new Error(dto.errorMessage ?? "request failed") as Error & {
          code?: number;
          errorKey?: string;
        };
        err.code = dto.code;
        err.errorKey = dto.errorKey;
        throw err;
      }
      return dto.data;
    }
    return data as T;
  }

  private recordSuccess() {
    this.circuit.failures = [];
    this.circuit.openUntil = undefined;
  }

  private recordFailure() {
    const now = Date.now();
    this.circuit.failures.push({ ts: now });
    this.circuit.failures = this.circuit.failures.filter((f) => now - f.ts <= this.config.windowMs);
    if (this.circuit.failures.length >= this.config.failureThreshold) {
      this.circuit.openUntil = now + this.config.windowMs;
    }
  }

  private checkCircuit() {
    if (this.circuit.openUntil && Date.now() < this.circuit.openUntil) {
      const remaining = Math.ceil((this.circuit.openUntil - Date.now()) / 1000);
      throw new Error(`circuit open — ${remaining}s remaining`);
    }
    if (this.circuit.openUntil && Date.now() >= this.circuit.openUntil) {
      this.circuit.openUntil = undefined;
      this.circuit.failures = [];
    }
  }
}
