# Spine Folder Doctrine

> The mandatory shape of every 021 app. Same skeleton in every repo so any human or agent walking into any service knows exactly where to look.
>
> Lifted + generalized from DanceClub (`backend/event-service/*`, `hub/src/feature/*`, `web/src/feature/*`).
> Locked 2026-05-24 by Edvard.

## The principle

**Hexagonal + DDD + Clean Architecture + feature-focused.** Each feature is a vertical slice that owns its domain, ports, adapters, use cases, components, schemas, and tests. Cross-cutting concerns live at the top level. Framework-specific code (Next routes, Spring controllers) lives in the outermost ring and only knows how to call use cases.

Dependencies point INWARD:

```
ui / routes / cli  →  use cases  →  ports  →  adapters (implement ports)
                                    │
                                    └→ domain (pure: entities, value objects, errors)
```

Domain knows nothing about Prisma, Next.js, Resend, or any framework. Adapters know the framework. Use cases orchestrate ports. Routes are skinny.

## Spine-TS app skeleton (Next.js / Node)

Mirrors `danceclub/hub/src/` and `danceclub/web/src/`, formalized.

```
my-app/
├── prisma/
│   ├── schema.prisma                Single Prisma schema; all features share
│   └── migrations/                  Flyway-style forward-only migrations
├── public/                          Static assets served as-is
├── src/
│   ├── app/                         Next.js App Router (routes, layouts, server actions)
│   │   ├── (public)/                Public route group
│   │   ├── (account)/               Authed route group
│   │   ├── api/                     Route handlers (always wrap with withErrorHandling)
│   │   ├── layout.tsx
│   │   └── page.tsx
│   ├── feature/                     ← THE MEAT — one folder per business capability
│   │   ├── <feature-name>/          e.g., event, billing, ambassador-desk, identity
│   │   │   ├── domain/              Pure: entities, value objects, errors, no imports of pg/next/fetch
│   │   │   │   ├── entity/          Event.ts, Ticket.ts, Membership.ts
│   │   │   │   ├── value-object/    EventId.ts, Money.ts, Locale.ts
│   │   │   │   └── error/           feature-specific errors (extend spine-errors)
│   │   │   ├── ports/               Interfaces the feature needs from outside
│   │   │   │   ├── EventRepo.ts     interface EventRepo { findById, save, … }
│   │   │   │   └── EmailPort.ts
│   │   │   ├── adapters/            Implementations of ports
│   │   │   │   ├── prisma/          PrismaEventRepo.ts
│   │   │   │   ├── http/            ResendEmailAdapter.ts
│   │   │   │   └── memory/          InMemoryEventRepo.ts  (tests)
│   │   │   ├── usecase/             One file per use case
│   │   │   │   ├── publishEvent.ts  publishEvent(input, { eventRepo, emailPort }) → Event
│   │   │   │   └── tests/           publishEvent.test.ts  (Testcontainers)
│   │   │   ├── schema/              Zod schemas (input/output validation)
│   │   │   │   ├── publishEvent.ts
│   │   │   │   └── tests/
│   │   │   ├── components/          React components specific to this feature
│   │   │   ├── hooks/               Feature-specific React hooks
│   │   │   └── index.ts             Public surface — only these symbols leave the feature folder
│   │   └── …
│   ├── components/                  Shared UI primitives (cross-feature)
│   │   ├── ui/                      shadcn/ui primitives only
│   │   └── …                        StatCard, MetricChart, etc.
│   ├── lib/                         Cross-cutting helpers
│   │   ├── db.ts                    Prisma client singleton
│   │   ├── env.ts                   defineEnv from @021.is/spine-env
│   │   ├── auth.ts                  re-exports from @021.is/spine-auth
│   │   ├── format.ts                pure formatters
│   │   └── cn.ts                    clsx + tailwind-merge
│   ├── hooks/                       Shared React hooks
│   ├── config/                      Static config (feature flags, constants)
│   ├── data/                        Static catalogs (countries, currencies)
│   ├── types/                       Global TS types
│   └── i18n/                        Translation runtime + per-feature catalogs (see @021.is/spine-i18n)
├── tests/
│   ├── setup.ts                     Vitest setup (Testcontainers PG, MSW, JWKS mock)
│   ├── factories/                   Reusable test data factories
│   └── e2e/                         Playwright E2E suites
├── scripts/                         Canonical ops scripts (redeploy.sh, etc.)
├── AGENTS.md                        Project rules (always-loaded by agents)
├── CLAUDE.md                        @AGENTS.md
├── README.md
├── biome.json
├── tsconfig.json
├── vitest.config.ts
├── playwright.config.ts
└── package.json
```

### Strict import rules (enforced by biome import-restrictions)

| Layer | May import from | May NOT import |
|---|---|---|
| `feature/<f>/domain/**` | other `domain/` files only | ports, adapters, framework, prisma, fetch |
| `feature/<f>/ports/**` | `feature/<f>/domain/**` | adapters |
| `feature/<f>/adapters/**` | `feature/<f>/domain/**`, `ports/**`, framework SDKs | other features' adapters |
| `feature/<f>/usecase/**` | `feature/<f>/{domain,ports,schema}/**` | adapters, framework |
| `feature/<f>/components/**` | `feature/<f>/{usecase,schema}/**`, `src/components/ui/**` | adapters, domain (use use cases) |
| `app/**` (Next routes) | `feature/<f>/{usecase,schema}/**`, `lib/**` | domain, adapters, ports |
| `src/components/**` | only `src/components/ui/**` + zero feature imports | features |

**Cross-feature imports go through each feature's `index.ts`** (its public surface) — never reach into a sibling's `usecase/` or `domain/` directly.

## Spine-Kotlin app skeleton (Spring Boot service)

Mirrors `danceclub/backend/event-service/*`, formalized.

```
<service-name>/                      e.g., dc-event, helvix-billing
├── api/                             Public service contracts (interfaces only)
│   └── src/main/kotlin/<pkg>/api/
│       └── EventService.kt          interface EventService { publish(input): Event }
├── pub-dom/                         PUBLIC domain — shipped to other services via OpenAPI
│   └── src/main/kotlin/<pkg>/dom/pb/
│       ├── dto/                     EventDto, TicketDto
│       ├── enums/                   EventStatus, AccessLevel
│       ├── keys/                    Type-safe key wrappers (EventId, OrganizerId)
│       └── marker/                  Marker interfaces (Publishable, Auditable)
├── private-dom/                     PRIVATE domain — internal entities
│   └── src/main/kotlin/<pkg>/dom/pv/
│       └── entity/                  internal aggregate roots
├── business/                        Implementations
│   └── src/main/kotlin/<pkg>/business/
│       ├── service/                 EventServiceImpl
│       ├── usecase/                 PublishEvent, CancelEvent (callable use cases)
│       └── specification/           Domain specifications (filter predicates)
├── dao/                             Data access (repositories + JPA/Exposed entities)
│   └── src/main/kotlin/<pkg>/dao/
│       ├── repository/              EventRepository (Spring Data interface)
│       └── entity/                  EventEntity (JPA-mapped)
├── rest/                            HTTP controllers — skinny, only call api/
│   └── src/main/kotlin/<pkg>/rest/
│       ├── controller/              EventController
│       └── dto/                     REST-shaped request/response DTOs
└── build.gradle.kts                 module dependencies: api depends on pub-dom,
                                     business depends on api+dao+private-dom,
                                     rest depends on api+pub-dom (NEVER on business)
```

### Module dependency rules (Spine-Kotlin)

```
rest      → api, pub-dom
business  → api, dao, private-dom, pub-dom (impl side)
dao       → private-dom
api       → pub-dom (only)
pub-dom   → (nothing in the service)
private-dom → pub-dom (one-way)
```

This is what locks the architecture — you cannot accidentally have `rest` call into `business` directly. The compiler stops you.

## Cross-service shared libs

| Concern | TS package | Kotlin module (future spine-kotlin) |
|---|---|---|
| Response envelope + exceptions | `@021.is/spine-errors` | `021-platform-errors` |
| Auth (JWKS verify) | `@021.is/spine-auth` | `021-platform-auth` (SecurityConfigBase) |
| HTTP client + resilience | `@021.is/spine-http` | `021-platform-rest` (WebClient + Resilience4j) |
| Telemetry | `@021.is/spine-telemetry` | `021-platform-otel` |
| Env loading | `@021.is/spine-env` | `021-platform-env` |
| i18n | `@021.is/spine-i18n` | `021-platform-locale` |
| NATS jobs | `@021.is/spine-jobs` | `021-platform-nats` |
| Rate-limit | `@021.is/spine-ratelimit` | `021-platform-ratelimit` |

These NEVER live inside an app. They're versioned packages every app declares as deps.

## Spine package skeleton (every `packages/*/` folder)

Same shape across all 15+ Spine packages so agents and humans move between them at zero cost.

```
packages/<pkg-name>/
├── package.json              name, version, exports map (every subpath listed),
│                             scripts (build / typecheck), deps + peerDeps
├── tsconfig.json             extends ../../tsconfig.base.json, outDir: ./dist
├── README.md                 What it is, install, usage example per public surface
├── AGENTS.md                 Project-local rules (hard rules + when to extend)
├── src/
│   ├── index.ts              Default public surface (`@021/<pkg>`)
│   ├── <feature>.ts          Implementation modules (file-per-concept)
│   ├── next.ts               Optional Next.js adapter (subpath `@021/<pkg>/next`)
│   ├── postgres.ts           Optional subpath (subpath `@021/<pkg>/postgres`)
│   └── domain/               For complex packages (i18n, jobs, ratelimit):
│       ├── ports/            full hexagonal layout INSIDE the package src/
│       ├── adapters/
│       └── application/
├── tests/
│   ├── *.test.ts             Vitest unit tests (one per src/<feature>.ts)
│   └── factories/            Reusable test data factories (if multiple tests need them)
└── dist/                     Build output, gitignored
```

### Package conventions (locked)

- **One file per concept inside `src/`.** Not "utils.ts" — name the thing.
- **`src/index.ts` is the only default-exported surface.** Subpath exports (`/next`, `/postgres`, `/jwks`) are explicit entries in `package.json` exports.
- **`tests/*.test.ts` mirrors `src/`.** `src/foo.ts` → `tests/foo.test.ts`. Finding a test is mechanical.
- **`README.md` opens with one-paragraph purpose + one usage example per public surface.** No marketing fluff.
- **`AGENTS.md` lists hard rules + when extension is/isn't allowed.** Future agents read this on entry — saves them re-deriving conventions.
- **`peerDependencies`** for framework deps (Next, Prisma) so the consuming app pins the version.
- **`@021.is/spine-*` cross-package deps via `workspace:*`** during dev; Changesets publishes pinned ranges.

### Hexagonal layout INSIDE a complex package (e.g., spine-i18n, spine-jobs)

When a package itself is non-trivial — multiple adapters per port, swappable backends — apply the same hexagonal pattern that apps use:

```
packages/spine-i18n/src/
├── domain/                   Pure: Locale, Catalog, PluralRule, NegotiationError
├── ports/                    Interfaces: CatalogStore, LocaleNegotiator, Translator
├── adapters/
│   ├── store/
│   │   ├── R2CatalogStore.ts
│   │   ├── FsCatalogStore.ts
│   │   └── MemoryCatalogStore.ts    (tests)
│   └── translator/
│       ├── DeepLAdapter.ts
│       └── GoogleAdapter.ts
├── application/              Use cases: NegotiateLocale, TranslateKey, LoadCatalog
├── react/                    React adapter (useT, LocaleProvider) — separate subpath
├── server/                   Server runtime (getServerLocaleRuntime) — separate subpath
└── index.ts                  Default re-exports
```

Same shape as `danceclub/locale/src/{domain,ports,application,adapters}/`. Agents who know one Spine package know the layout for all.

## What this gives you

- **Onboarding cost = read STRUCTURE.md once.** Any 021 repo opens up identically.
- **Refactoring across products is mechanical.** Same file lives at the same path everywhere.
- **Compiler enforces the architecture.** Hexagonal isn't a comment in a README — it's how the imports resolve.
- **Tests live next to code.** `feature/event/usecase/publishEvent.test.ts` is right where the human looking for it would look.
- **Features are deletable.** Pull a `feature/<name>/` folder, the rest of the app keeps compiling. That's the test for whether features are properly isolated.

## What you scaffold

The `spine` CLI (Wave D) creates this exact tree:

```bash
spine new my-app --type next-app
# → creates the full skeleton above with one example feature scaffolded
spine new my-svc --type kotlin-service
# → creates the Kotlin module layout above

spine add feature events                 # scaffold src/feature/events/ skeleton
spine add usecase events publishEvent    # scaffold usecase + test stubs
spine doctor                             # audit current repo against this doc
```
