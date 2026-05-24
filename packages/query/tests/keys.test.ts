import { describe, expect, it } from "vitest";
import { makeKeys, makeQueryClient } from "../src/index.js";

describe("makeKeys", () => {
  const eventKeys = makeKeys("events", {
    all: () => [],
    byId: (id: string) => [id],
    listByOrganizer: (orgId: string, status: "draft" | "published") => ["by-org", orgId, status],
  });

  it("scopes every key with the namespace", () => {
    expect(eventKeys.all()).toEqual(["events"]);
    expect(eventKeys.byId("e_1")).toEqual(["events", "e_1"]);
    expect(eventKeys.listByOrganizer("o_1", "published")).toEqual([
      "events",
      "by-org",
      "o_1",
      "published",
    ]);
  });

  it("returns readonly arrays", () => {
    const k = eventKeys.byId("x");
    expect(Object.isFrozen(k)).toBe(false);
    expect(Array.isArray(k)).toBe(true);
  });
});

describe("makeQueryClient", () => {
  it("uses 021 default options", () => {
    const qc = makeQueryClient();
    const def = qc.getDefaultOptions();
    expect(def.queries?.staleTime).toBe(60_000);
    expect(def.queries?.refetchOnWindowFocus).toBe(false);
    expect(def.queries?.refetchOnReconnect).toBe(false);
    expect(def.queries?.retry).toBe(1);
    expect(def.mutations?.retry).toBe(0);
  });
});
