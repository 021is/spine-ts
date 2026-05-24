import { describe, expect, it, vi } from "vitest";
import { SpineHttpClient } from "../src/client.js";

function makeFetch(handler: (url: string, init?: RequestInit) => Response | Promise<Response>): typeof fetch {
  return ((url: string | URL, init?: RequestInit) => Promise.resolve(handler(String(url), init))) as typeof fetch;
}

describe("SpineHttpClient", () => {
  it("GET unwraps ResponseDto", async () => {
    const client = new SpineHttpClient({
      baseUrl: "https://api.example",
      fetchImpl: makeFetch(() =>
        new Response(JSON.stringify({ success: true, data: { id: "x" }, code: 200, timestamp: 0 }), {
          status: 200,
          headers: { "content-type": "application/json" },
        }),
      ),
    });
    const result = await client.get<{ id: string }>("/items/x");
    expect(result).toEqual({ id: "x" });
  });

  it("passes through non-envelope JSON", async () => {
    const client = new SpineHttpClient({
      baseUrl: "https://api.example",
      fetchImpl: makeFetch(() =>
        new Response(JSON.stringify({ foo: "bar" }), {
          status: 200,
          headers: { "content-type": "application/json" },
        }),
      ),
    });
    const r = await client.get<{ foo: string }>("/x");
    expect(r).toEqual({ foo: "bar" });
  });

  it("throws on ResponseDto with success=false", async () => {
    const client = new SpineHttpClient({
      baseUrl: "https://api.example",
      fetchImpl: makeFetch(() =>
        new Response(
          JSON.stringify({
            success: false,
            data: null,
            code: 404,
            errorMessage: "missing",
            errorKey: "x.not_found",
            timestamp: 0,
          }),
          { status: 200, headers: { "content-type": "application/json" } },
        ),
      ),
    });
    await expect(client.get("/x")).rejects.toThrow(/missing/);
  });

  it("retries idempotent GET on failure", async () => {
    const calls = vi.fn();
    let n = 0;
    const client = new SpineHttpClient({
      baseUrl: "https://api.example",
      retries: 2,
      fetchImpl: makeFetch(() => {
        calls();
        if (++n < 3) return new Response("nope", { status: 500 });
        return new Response(JSON.stringify({ ok: 1 }), {
          status: 200,
          headers: { "content-type": "application/json" },
        });
      }),
    });
    const r = await client.get<{ ok: number }>("/x");
    expect(r).toEqual({ ok: 1 });
    expect(calls).toHaveBeenCalledTimes(3);
  });

  it("does NOT retry non-idempotent POST", async () => {
    const calls = vi.fn();
    const client = new SpineHttpClient({
      baseUrl: "https://api.example",
      retries: 3,
      fetchImpl: makeFetch(() => {
        calls();
        return new Response("nope", { status: 500 });
      }),
    });
    await expect(client.post("/x", {})).rejects.toThrow();
    expect(calls).toHaveBeenCalledTimes(1);
  });

  it("opens circuit after N failures + rejects fast while open", async () => {
    const calls = vi.fn();
    const client = new SpineHttpClient({
      baseUrl: "https://api.example",
      retries: 0,
      failureThreshold: 3,
      windowMs: 60_000,
      fetchImpl: makeFetch(() => {
        calls();
        return new Response("nope", { status: 500 });
      }),
    });
    await expect(client.get("/a")).rejects.toThrow();
    await expect(client.get("/b")).rejects.toThrow();
    await expect(client.get("/c")).rejects.toThrow();
    await expect(client.get("/d")).rejects.toThrow(/circuit open/);
    expect(calls).toHaveBeenCalledTimes(3);
  });

  it("sets Authorization header from authToken hook", async () => {
    let captured: string | null = null;
    const client = new SpineHttpClient({
      baseUrl: "https://api.example",
      authToken: async () => "tok_xyz",
      fetchImpl: makeFetch((_, init) => {
        captured = new Headers(init?.headers).get("authorization");
        return new Response(JSON.stringify({ ok: 1 }), {
          status: 200,
          headers: { "content-type": "application/json" },
        });
      }),
    });
    await client.get("/x");
    expect(captured).toBe("Bearer tok_xyz");
  });
});
