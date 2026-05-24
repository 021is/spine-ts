import { readFile, readdir, writeFile, mkdir } from "node:fs/promises";
import { dirname, join } from "node:path";
import type { Catalog } from "../domain/catalog.js";
import { makeLocale, type Locale } from "../domain/locale.js";
import type { CatalogStore } from "../ports/catalog-store.js";

/**
 * Filesystem CatalogStore. Useful for dev mode and CI tests where R2
 * isn't reachable. Reads `<dir>/<locale>.json`.
 */
export function makeFsCatalogStore(dir: string): CatalogStore {
  return {
    async load(locale) {
      try {
        const raw = await readFile(join(dir, `${locale}.json`), "utf-8");
        const json = JSON.parse(raw) as { namespaces: Catalog["namespaces"] };
        return { locale, namespaces: json.namespaces };
      } catch (e) {
        if ((e as NodeJS.ErrnoException).code === "ENOENT") return null;
        throw e;
      }
    },
    async save(catalog) {
      const path = join(dir, `${catalog.locale}.json`);
      await mkdir(dirname(path), { recursive: true });
      await writeFile(path, JSON.stringify({ namespaces: catalog.namespaces }, null, 2));
    },
    async listLocales() {
      try {
        const entries = await readdir(dir);
        return entries
          .filter((f) => f.endsWith(".json"))
          .map((f) => f.replace(/\.json$/, ""))
          .map((tag) => makeLocale(tag) as Locale);
      } catch (e) {
        if ((e as NodeJS.ErrnoException).code === "ENOENT") return [];
        throw e;
      }
    },
  };
}
