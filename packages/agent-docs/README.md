# @021.is/agent-docs

Single-source-of-truth docs catalog. One library, every product gets first-class agent integration without copy-paste.

One `DocsCatalog` object feeds:

- the JSX page (your existing `app/docs/<slug>/page.tsx`)
- the `.md` route handler (drop in `markdownRoute(catalog)`)
- the `/llms.txt` discovery index (`buildLlmsTxt`)
- the `/llms-full.txt` flat dump (`buildLlmsFullTxt`)

Drift between surfaces becomes physically impossible.

## Install

```bash
bun add @021.is/agent-docs
```

## Quickstart

Define one catalog per page in `lib/docs/<slug>.ts`:

```ts
import { type DocsCatalog, code, h2, p } from "@021.is/agent-docs";

export const installCatalog: DocsCatalog = {
  slug: "install",
  title: "Install the SDK",
  description: "One package, two minutes to working sign-in.",
  body: [
    h2("Install"),
    p("Use your package manager."),
    code("bash", "bun add @021.is/my-sdk"),
  ],
};
```

Drop the matching `.md` route handler:

```ts
// app/docs/install.md/route.ts
import { markdownRoute } from "@021.is/agent-docs/next";
import { installCatalog } from "@/lib/docs/install";

export const dynamic = "force-static";
export const GET = markdownRoute(installCatalog);
```

Wire `llms.txt`:

```ts
// app/llms.txt/route.ts
import { llmsTxtRoute } from "@021.is/agent-docs/next";
import { installCatalog } from "@/lib/docs/install";

export const dynamic = "force-static";
export const GET = llmsTxtRoute({
  name: "my-app",
  tagline: "Your product tagline.",
  siteUrl: "https://example.com",
  catalogs: [installCatalog],
  openapi: { yamlUrl: "https://example.com/openapi.yaml" },
});
```

That is the whole integration. Every catalog you ship is automatically rendered on `/docs/<slug>.md`, listed on `/llms.txt`, and concatenated into `/llms-full.txt`.

## Why

Stripe, Auth0, and Clerk all ship agent-consumable docs. So do we. Reuse the library and your product is on day one.

## License

MIT.
