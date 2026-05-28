# @021.is/spine-query

TanStack Query wrapper with sensible defaults that minimize backend traffic. Plus a typed `makeKeys` factory for consistent, scoped query keys.

## Why

DC-web hit a real rate-limit because 10 components were each calling the same endpoint. TanStack Query's defaults (`refetchOnFocus: true`, `staleTime: 0`) make this worse, not better. spine-query tunes for **don't hammer**.

## Defaults (built into `makeQueryClient`)

| | Value | Why |
|---|---|---|
| `staleTime` | 60_000 (1 min) | Component swaps within a minute don't refetch |
| `gcTime` | 5 * 60_000 (5 min) | Back-button warm hit |
| `refetchOnWindowFocus` | false | Opt-in per query if needed |
| `refetchOnReconnect` | false | Same — explicit > implicit |
| `retry` | 1 | Don't thrash on failure |
| `mutations.retry` | 0 | Never auto-retry mutations |

## Use — client setup

```tsx
import { QueryClientProvider } from "@tanstack/react-query";
import { makeQueryClient } from "@021.is/spine-query";

const qc = makeQueryClient();
<QueryClientProvider client={qc}>{children}</QueryClientProvider>
```

## Use — typed query keys

```ts
import { makeKeys } from "@021.is/spine-query";

export const eventKeys = makeKeys("events", {
  all: () => [],
  byId: (id: string) => [id],
  listByOrganizer: (orgId: string, status: "draft" | "published") => ["by-org", orgId, status],
});

useQuery({ queryKey: eventKeys.byId("e_1"), queryFn: () => fetchEvent("e_1") });
queryClient.invalidateQueries({ queryKey: eventKeys.all() }); // wipes ALL event queries
```

Result: every key is prefixed with the scope (`["events", "e_1"]`, `["events", "by-org", "o_1", "published"]`). Invalidation is reliable; typos are caught at compile time.

## Override per query when needed

```ts
useQuery({
  queryKey: eventKeys.byId(id),
  queryFn: () => fetchEvent(id),
  refetchOnWindowFocus: true, // override the default for hot-status surfaces
  staleTime: 5_000,
});
```
