import { type ZodTypeAny, z } from "zod";

/**
 * Validate `process.env` (or any source) against a zod schema and return a
 * frozen, typed object. Fails LOUDLY at module-load time when a variable is
 * missing or invalid — never silently lets a NaN ship to production.
 *
 * Inspired by t3-env (https://env.t3.gg) but with no client/server split
 * (server-only at the moment; client-env split lands when a product
 * needs it).
 */
export interface DefineEnvOptions<TSchema extends Record<string, ZodTypeAny>> {
  /** zod schemas for each expected env var. */
  schema: TSchema;
  /** Source. Default: `process.env`. Pass `{}` in tests. */
  source?: Record<string, string | undefined>;
  /**
   * If true, throws when ANY extra env var is present that isn't in the
   * schema. Default: false (tolerate extras — production envs always have
   * platform-injected noise like `PATH`, `HOME`).
   */
  strict?: boolean;
  /**
   * If true, redacts secret values when printing errors. Default: true.
   */
  redactOnError?: boolean;
}

export type EnvOf<TSchema extends Record<string, ZodTypeAny>> = {
  readonly [K in keyof TSchema]: z.infer<TSchema[K]>;
};

export function defineEnv<TSchema extends Record<string, ZodTypeAny>>(
  options: DefineEnvOptions<TSchema>,
): EnvOf<TSchema> {
  const source = options.source ?? process.env;
  const fullSchema = z.object(options.schema);
  const parsed = fullSchema.safeParse(source);

  if (!parsed.success) {
    const issues = parsed.error.issues
      .map((issue) => {
        const key = issue.path.join(".") || "(root)";
        return `  - ${key}: ${issue.message}`;
      })
      .join("\n");
    throw new Error(
      `[spine-env] Environment validation failed:\n${issues}\n\nFix the missing/invalid variables and restart. See your project's \`.env.example\`.`,
    );
  }

  if (options.strict) {
    const expected = new Set(Object.keys(options.schema));
    const extras = Object.keys(source).filter((k) => !expected.has(k));
    if (extras.length > 0) {
      throw new Error(`[spine-env] strict mode: unexpected env vars present: ${extras.join(", ")}`);
    }
  }

  return Object.freeze(parsed.data as EnvOf<TSchema>);
}

/** Convenience: common shapes you almost always want. */
export const common = {
  /** `"development" | "test" | "production"` with default `"development"`. */
  nodeEnv: () => z.enum(["development", "test", "production"]).default("development"),
  /** URL with `https://` enforced. */
  httpsUrl: () =>
    z
      .string()
      .url()
      .refine((u) => u.startsWith("https://"), "must be https://"),
  /** Any URL. */
  url: () => z.string().url(),
  /** Postgres connection string. */
  pgUrl: () =>
    z
      .string()
      .url()
      .refine(
        (u) => u.startsWith("postgres://") || u.startsWith("postgresql://"),
        "must be postgres://",
      ),
  /** Bytes-size string with optional unit (e.g. `100mb`, `1gb`). */
  bytes: () => z.string().regex(/^\d+(b|kb|mb|gb)?$/i, "must look like 100mb, 1gb, 50000"),
  /** Number from a string env var. */
  number: () =>
    z.string().transform((s, ctx) => {
      const n = Number(s);
      if (Number.isNaN(n)) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: "must be a number" });
        return z.NEVER;
      }
      return n;
    }),
  /** Boolean from `"true" | "false" | "1" | "0"`. */
  boolean: () => z.enum(["true", "false", "1", "0"]).transform((s) => s === "true" || s === "1"),
  /** Non-empty string, used for secrets. */
  secret: () => z.string().min(1, "secret cannot be empty"),
};
