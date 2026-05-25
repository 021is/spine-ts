import { describe, expect, it } from "vitest";
import { connectJobs } from "../src/index.js";

// Unit smoke: shape + error-on-invalid-URL. Full Testcontainers NATS
// integration test lands when @testcontainers/nats is wired (Phase B
// of the spine deep-dive). For now we lock the public surface so
// downstream package changes don't accidentally rename `connectJobs`.
describe("@021is/spine-jobs", () => {
  it("exports connectJobs as an async function", () => {
    expect(typeof connectJobs).toBe("function");
  });

  it("rejects with a real error when NATS server is unreachable", async () => {
    await expect(connectJobs({ servers: "nats://127.0.0.1:1" })).rejects.toThrow();
  }, 15_000);
});
