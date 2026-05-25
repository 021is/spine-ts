import { http, HttpResponse, type RequestHandler } from "msw";
import { type SetupServer, setupServer } from "msw/node";

/**
 * Stand up an MSW server for outbound HTTP mocking. Use this to mock
 * Resend, Stripe, R2, Google APIs — anything beyond the host's boundary.
 * Never mock your own domain (that's what Testcontainers Postgres is for).
 *
 *   const mocks = startMockServer();
 *   mocks.useHandlers(
 *     http.post("https://api.resend.com/emails", () => HttpResponse.json({ id: "e_1" })),
 *   );
 *   // ... call code that hits Resend, assert the mock got called
 *   mocks.stop();
 */
export interface MockServer {
  server: SetupServer;
  /** Add handlers for a single test; reset between tests. */
  useHandlers(...handlers: RequestHandler[]): void;
  reset(): void;
  stop(): void;
}

export function startMockServer(handlers: RequestHandler[] = []): MockServer {
  const server = setupServer(...handlers);
  server.listen({ onUnhandledRequest: "error" });
  return {
    server,
    useHandlers: (...h) => server.use(...h),
    reset: () => server.resetHandlers(),
    stop: () => server.close(),
  };
}

export { http, HttpResponse };
