# @021.is/spine-env

Type-safe, zod-validated environment loader. Fails LOUDLY at module-load time when a variable is missing or invalid.

## Use

```ts
// lib/env.ts
import { defineEnv, common } from "@021.is/spine-env";
import { z } from "zod";

export const env = defineEnv({
  schema: {
    NODE_ENV: common.nodeEnv(),
    DATABASE_URL: common.pgUrl(),
    APP_URL: common.httpsUrl(),
    RESEND_API_KEY: common.secret(),
    PORT: common.number(),
    SIGN_UPS_OPEN: common.boolean(),
    MAX_UPLOAD: common.bytes(),
    AUTH_CLIENT_ID: z.string().startsWith("app_"),
  },
});
```

Now `env.DATABASE_URL` is typed `string`, `env.PORT` is typed `number`, etc. Reading a typo at the call site is a compile error.

## Why

- **Fail at startup, not at request 100.** A missing `RESEND_API_KEY` should crash the boot, not silently 500 the first email.
- **Single source of truth.** Every app's env shape lives in one file.
- **Free type narrowing.** No more `process.env.X!.trim()` everywhere.
- **`.env.example` writes itself.** Run the schema against `{}` and the error message lists every required key.

## `common` helpers

| | What it validates |
|---|---|
| `common.nodeEnv()` | `"development" \| "test" \| "production"` (default `"development"`) |
| `common.httpsUrl()` | URL starting with `https://` |
| `common.url()` | Any URL |
| `common.pgUrl()` | `postgres://` / `postgresql://` |
| `common.bytes()` | `100mb`, `1gb`, `50000` |
| `common.number()` | Coerces string env to number |
| `common.boolean()` | `"true"` / `"false"` / `"1"` / `"0"` |
| `common.secret()` | Non-empty string |

For anything else, just use raw zod (`z.string()`, `z.enum([...])`).
