# next-app-starter

Reference Next.js app showing every Spine pattern in one place. Copy as a starting point or read as documentation.

## What it demonstrates

| Spine pattern | Where to look |
|---|---|
| Hexagonal feature folder | `src/feature/event/{domain,ports,adapters,usecase,schema,index.ts}` |
| Const-as-object enums | `src/feature/event/domain/event-enums.ts` |
| ResponseDto + withErrorHandling | `src/app/api/events/[id]/publish/route.ts` |
| Domain throws spine-errors exceptions | `src/feature/event/usecase/publishEvent.ts` |
| Testcontainers + InMemory adapter for tests | `src/feature/event/usecase/tests/publishEvent.test.ts` |
| Zod input schema | `src/feature/event/schema/publishEvent.ts` |
| i18n via spine-i18n (15-language ready) | `src/i18n/en.json` + `src/i18n/de.json` |
| Cross-feature import via public surface | `src/feature/event/index.ts` |
| Spine Quality Gate wired in CI | `.github/workflows/pr.yml` |

## Use

```bash
cp -r examples/next-app-starter ~/projects/my-new-app
cd ~/projects/my-new-app
bun install
bun run test
bun run dev
```

Then start adding features under `src/feature/<your-feature>/` following the same skeleton.
