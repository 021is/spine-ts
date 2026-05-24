import { describe, expect, it } from "vitest";
import { z } from "zod";
import { common, defineEnv } from "../src/index.js";

describe("defineEnv", () => {
  it("parses + freezes a valid env", () => {
    const env = defineEnv({
      schema: {
        NODE_ENV: common.nodeEnv(),
        DATABASE_URL: common.pgUrl(),
        PORT: common.number(),
      },
      source: {
        NODE_ENV: "production",
        DATABASE_URL: "postgres://user@host:5432/db",
        PORT: "4400",
      },
    });
    expect(env.NODE_ENV).toBe("production");
    expect(env.DATABASE_URL).toBe("postgres://user@host:5432/db");
    expect(env.PORT).toBe(4400);
    expect(() => {
      // @ts-expect-error frozen
      env.NODE_ENV = "x";
    }).toThrow();
  });

  it("throws with a clear multi-issue message when validation fails", () => {
    expect(() =>
      defineEnv({
        schema: {
          DATABASE_URL: common.pgUrl(),
          SECRET: common.secret(),
        },
        source: { DATABASE_URL: "not-a-url" },
      }),
    ).toThrow(/Environment validation failed[\s\S]+DATABASE_URL[\s\S]+SECRET/);
  });

  it("applies defaults from the schema", () => {
    const env = defineEnv({
      schema: { NODE_ENV: common.nodeEnv() },
      source: {},
    });
    expect(env.NODE_ENV).toBe("development");
  });

  it("rejects extra env vars in strict mode", () => {
    expect(() =>
      defineEnv({
        schema: { A: z.string() },
        source: { A: "ok", B: "extra" },
        strict: true,
      }),
    ).toThrow(/unexpected env vars/);
  });

  it("tolerates extras when not strict (default)", () => {
    const env = defineEnv({
      schema: { A: z.string() },
      source: { A: "ok", PATH: "/usr/bin" },
    });
    expect(env.A).toBe("ok");
  });

  it("common.boolean parses 'true'/'false'/'1'/'0'", () => {
    const e = defineEnv({
      schema: { ON: common.boolean(), OFF: common.boolean() },
      source: { ON: "true", OFF: "0" },
    });
    expect(e.ON).toBe(true);
    expect(e.OFF).toBe(false);
  });

  it("common.httpsUrl rejects http://", () => {
    expect(() =>
      defineEnv({
        schema: { URL: common.httpsUrl() },
        source: { URL: "http://insecure.example" },
      }),
    ).toThrow(/https:/);
  });
});
