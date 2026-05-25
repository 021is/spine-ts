import { spawn } from "node:child_process";
import { PostgreSqlContainer, type StartedPostgreSqlContainer } from "@testcontainers/postgresql";

/**
 * Spin up an ephemeral Postgres container per Vitest worker process and
 * return a connection URL. Idempotent within a process — repeated calls
 * return the same URL. Container is reaped on process exit by Testcontainers.
 *
 * Usage in a Vitest setup file:
 *
 *   // tests/setup.ts
 *   import { startSharedPostgres, runPrismaMigrate } from "@021is/spine-testing/postgres";
 *   import { beforeAll } from "vitest";
 *
 *   beforeAll(async () => {
 *     const url = await startSharedPostgres();
 *     process.env.DATABASE_URL = url;
 *     await runPrismaMigrate(url);
 *   }, 60_000);
 */

const SHARED_KEY = Symbol.for("spine-testing.postgres.shared");
type GlobalSlot = { container?: StartedPostgreSqlContainer; url?: string };

function slot(): GlobalSlot {
  // biome-ignore lint/suspicious/noExplicitAny: deliberate global slot
  const g = globalThis as any;
  if (!g[SHARED_KEY]) g[SHARED_KEY] = {};
  return g[SHARED_KEY] as GlobalSlot;
}

export interface StartSharedPostgresOptions {
  /** Postgres image tag. Default: `postgres:16-alpine` (small, fast). */
  image?: string;
  /** Database name. Default: `spine_test`. */
  database?: string;
  /** Username. Default: `spine`. */
  username?: string;
  /** Password. Default: `spine`. */
  password?: string;
}

export async function startSharedPostgres(
  options: StartSharedPostgresOptions = {},
): Promise<string> {
  const s = slot();
  if (s.url) return s.url;

  const image = options.image ?? "postgres:16-alpine";
  const database = options.database ?? "spine_test";
  const username = options.username ?? "spine";
  const password = options.password ?? "spine";

  const container = await new PostgreSqlContainer(image)
    .withDatabase(database)
    .withUsername(username)
    .withPassword(password)
    .withReuse()
    .start();

  s.container = container;
  s.url = container.getConnectionUri();
  return s.url;
}

export async function stopSharedPostgres(): Promise<void> {
  const s = slot();
  if (s.container) {
    await s.container.stop();
  }
  s.container = undefined;
  s.url = undefined;
}

/**
 * Run `prisma migrate deploy` (or `db push`) against a connection URL.
 * Use in a `beforeAll` once per worker — costs ~1s.
 */
export interface RunPrismaMigrateOptions {
  /** `deploy` for production-style migrations or `push` for schema-only quick spin. Default: deploy. */
  mode?: "deploy" | "push";
  /** Path to the schema file relative to cwd. Default: `prisma/schema.prisma`. */
  schemaPath?: string;
  /** Override the Prisma binary if not on PATH. Default: `bunx prisma`. */
  prismaBin?: string;
}

export async function runPrismaMigrate(
  databaseUrl: string,
  options: RunPrismaMigrateOptions = {},
): Promise<void> {
  const mode = options.mode ?? "deploy";
  const schemaPath = options.schemaPath ?? "prisma/schema.prisma";
  const prismaBin = options.prismaBin ?? "bunx prisma";
  const args =
    mode === "deploy"
      ? ["migrate", "deploy", "--schema", schemaPath]
      : ["db", "push", "--schema", schemaPath, "--skip-generate", "--accept-data-loss"];

  await new Promise<void>((resolve, reject) => {
    const [cmd, ...prefix] = prismaBin.split(" ");
    if (!cmd) throw new Error("prismaBin cannot be empty");
    const child = spawn(cmd, [...prefix, ...args], {
      env: { ...process.env, DATABASE_URL: databaseUrl },
      stdio: "pipe",
    });
    let stderr = "";
    child.stderr.on("data", (chunk) => {
      stderr += String(chunk);
    });
    child.on("error", reject);
    child.on("exit", (code) => {
      if (code === 0) resolve();
      else reject(new Error(`prisma exited with code ${code}\n${stderr}`));
    });
  });
}

/**
 * Truncate every user table in a Postgres database. Run between tests
 * when you don't want the container restart cost. Skips Prisma metadata
 * tables (`_prisma_migrations`).
 */
export async function truncateAll(
  databaseUrl: string,
  options: { exclude?: string[] } = {},
): Promise<void> {
  const exclude = new Set(options.exclude ?? ["_prisma_migrations"]);
  const { Client } = await import("pg");
  const client = new Client({ connectionString: databaseUrl });
  await client.connect();
  try {
    const { rows } = await client.query<{ tablename: string }>(
      `SELECT tablename FROM pg_tables WHERE schemaname = 'public'`,
    );
    const tables = rows.map((r) => r.tablename).filter((t) => !exclude.has(t));
    if (tables.length > 0) {
      await client.query(
        `TRUNCATE TABLE ${tables.map((t) => `"${t}"`).join(", ")} RESTART IDENTITY CASCADE`,
      );
    }
  } finally {
    await client.end();
  }
}
