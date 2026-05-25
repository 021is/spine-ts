import type { Catalog } from "../../domain/catalog.js";
import { type Locale, makeLocale } from "../../domain/locale.js";
import type { CatalogStore } from "../../ports/catalog-store.js";

/**
 * R2-backed CatalogStore. One JSON object per locale at
 * `<rootPrefix>/<locale>.json`. Survives any number of consumer apps
 * since R2 is the source of truth.
 */
export interface R2Options {
  /** AWS S3 SDK v3 client, instantiated with R2 endpoint + credentials. */
  // biome-ignore lint/suspicious/noExplicitAny: avoid hard-import on the SDK
  client: any;
  bucket: string;
  /** Prefix inside the bucket — typically `<product>/i18n/`. */
  rootPrefix: string;
}

export function makeR2CatalogStore(opts: R2Options): CatalogStore {
  const prefix = opts.rootPrefix.replace(/\/$/, "");

  return {
    async load(locale) {
      try {
        const { GetObjectCommand } = await import("@aws-sdk/client-s3");
        const res = await opts.client.send(
          new GetObjectCommand({ Bucket: opts.bucket, Key: `${prefix}/${locale}.json` }),
        );
        const body = await streamToString(res.Body);
        const json = JSON.parse(body) as Omit<Catalog, "locale"> & { locale?: string };
        return { ...json, locale };
      } catch (e) {
        if (isNotFound(e)) return null;
        throw e;
      }
    },
    async save(catalog) {
      const { PutObjectCommand } = await import("@aws-sdk/client-s3");
      await opts.client.send(
        new PutObjectCommand({
          Bucket: opts.bucket,
          Key: `${prefix}/${catalog.locale}.json`,
          Body: JSON.stringify({ namespaces: catalog.namespaces }, null, 2),
          ContentType: "application/json",
          CacheControl: "public, max-age=300",
        }),
      );
    },
    async listLocales() {
      const { ListObjectsV2Command } = await import("@aws-sdk/client-s3");
      const out = await opts.client.send(
        new ListObjectsV2Command({ Bucket: opts.bucket, Prefix: `${prefix}/` }),
      );
      const keys = (out.Contents ?? [])
        .map((c: { Key?: string }) => c.Key)
        .filter((k: string | undefined): k is string => Boolean(k));
      return keys
        .map((k: string) => k.slice(prefix.length + 1).replace(/\.json$/, ""))
        .filter((tag: string) => tag.length > 0)
        .map((tag: string) => makeLocale(tag) as Locale);
    },
  };
}

// biome-ignore lint/suspicious/noExplicitAny: avoid hard-import on the SDK body shape
async function streamToString(body: any): Promise<string> {
  if (typeof body?.transformToString === "function") return body.transformToString();
  const chunks: Buffer[] = [];
  for await (const chunk of body) chunks.push(Buffer.from(chunk));
  return Buffer.concat(chunks).toString("utf-8");
}

function isNotFound(e: unknown): boolean {
  if (!e || typeof e !== "object") return false;
  const code = (e as { name?: string; Code?: string }).name ?? (e as { Code?: string }).Code;
  return code === "NoSuchKey" || code === "NotFound";
}
