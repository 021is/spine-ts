import { describe, expect, it, vi } from "vitest";
import { SomethingWentWrongException } from "@021/spine-errors";
import { makeEmailClient } from "../src/index.js";

function makeFetch(handler: (url: string, init?: RequestInit) => Response | Promise<Response>): typeof fetch {
  return ((url: string | URL, init?: RequestInit) => Promise.resolve(handler(String(url), init))) as typeof fetch;
}

describe("makeEmailClient", () => {
  it("sends with bearer auth + json body + returns id", async () => {
    let captured: { url: string; body: string; auth: string } | undefined;
    const client = makeEmailClient({
      apiKey: "re_test",
      defaultFrom: "Elvix <noreply@elvix.is>",
      fetchImpl: makeFetch((url, init) => {
        captured = {
          url,
          body: String(init?.body ?? ""),
          auth: new Headers(init?.headers).get("authorization") ?? "",
        };
        return new Response(JSON.stringify({ id: "e_42" }), {
          status: 200,
          headers: { "content-type": "application/json" },
        });
      }),
    });
    const r = await client.send({ to: "x@y.com", subject: "Hi", html: "<p>Hi</p>" });
    expect(r.id).toBe("e_42");
    expect(captured?.url).toBe("https://api.resend.com/emails");
    expect(captured?.auth).toBe("Bearer re_test");
    const parsed = JSON.parse(captured?.body ?? "{}");
    expect(parsed.from).toBe("Elvix <noreply@elvix.is>");
    expect(parsed.to).toEqual(["x@y.com"]);
    expect(parsed.subject).toBe("Hi");
  });

  it("retries on 5xx", async () => {
    let calls = 0;
    const client = makeEmailClient({
      apiKey: "k",
      defaultFrom: "x <a@b.c>",
      retries: 2,
      fetchImpl: makeFetch(() => {
        calls += 1;
        if (calls < 3) return new Response("nope", { status: 502 });
        return new Response(JSON.stringify({ id: "e_1" }), {
          status: 200,
          headers: { "content-type": "application/json" },
        });
      }),
    });
    const r = await client.send({ to: "a@b", subject: "x", html: "y" });
    expect(r.id).toBe("e_1");
    expect(calls).toBe(3);
  });

  it("does NOT retry on 4xx — throws immediately", async () => {
    const fetchSpy = vi.fn(() => Promise.resolve(new Response("bad", { status: 400 })));
    const client = makeEmailClient({
      apiKey: "k",
      defaultFrom: "x <a@b.c>",
      retries: 3,
      fetchImpl: fetchSpy as unknown as typeof fetch,
    });
    await expect(client.send({ to: "x", subject: "y", html: "z" })).rejects.toThrow(SomethingWentWrongException);
    expect(fetchSpy).toHaveBeenCalledTimes(1);
  });

  it("throws when neither html nor text given", async () => {
    const client = makeEmailClient({
      apiKey: "k",
      defaultFrom: "x <a@b.c>",
      fetchImpl: makeFetch(() => new Response("ok", { status: 200 })),
    });
    await expect(client.send({ to: "a", subject: "b" })).rejects.toThrow(/html or text/);
  });

  it("attaches idempotency-key header when provided", async () => {
    let captured: string | null = null;
    const client = makeEmailClient({
      apiKey: "k",
      defaultFrom: "x <a@b.c>",
      fetchImpl: makeFetch((_, init) => {
        captured = new Headers(init?.headers).get("idempotency-key");
        return new Response(JSON.stringify({ id: "e_1" }), {
          status: 200,
          headers: { "content-type": "application/json" },
        });
      }),
    });
    await client.send({ to: "a", subject: "b", html: "c", idempotencyKey: "user_signup_42" });
    expect(captured).toBe("user_signup_42");
  });
});
