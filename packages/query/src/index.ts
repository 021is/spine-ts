import { QueryClient } from "@tanstack/react-query";

/**
 * Build a QueryClient with the 021 defaults that minimize redundant
 * backend traffic (the DC-web rate-limit scar):
 *
 *   - `staleTime: 60_000` — assume fresh for 1 min; component swaps don't refetch
 *   - `refetchOnWindowFocus: false` — opt-in per query if needed
 *   - `refetchOnReconnect: false` — same; explicit > implicit
 *   - `retry: 1` — one retry on failure, no thrashing
 *   - `gcTime: 5 * 60_000` — keep evicted cache 5min for back-button warm hit
 *
 * Apps can override per-query but the defaults are tuned for "don't hammer".
 */
export function makeQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 60_000,
        gcTime: 5 * 60_000,
        refetchOnWindowFocus: false,
        refetchOnReconnect: false,
        retry: 1,
      },
      mutations: {
        retry: 0,
      },
    },
  });
}

/**
 * Typed query-key factory — keeps keys consistent across files and gives
 * autocomplete on `invalidateQueries`. Use one factory per feature.
 *
 *   const eventKeys = makeKeys("events", {
 *     all: () => [],
 *     byId: (id: string) => [id],
 *     listByOrganizer: (orgId: string) => ["by-org", orgId],
 *   });
 *
 *   useQuery({ queryKey: eventKeys.byId("e_1"), ... });
 *   queryClient.invalidateQueries({ queryKey: eventKeys.all() });
 */
export type KeyBuilders<TBuilders extends Record<string, (...args: never[]) => unknown[]>> = {
  [K in keyof TBuilders]: (
    ...args: Parameters<TBuilders[K]>
  ) => readonly unknown[];
};

export function makeKeys<TBuilders extends Record<string, (...args: never[]) => unknown[]>>(
  scope: string,
  builders: TBuilders,
): KeyBuilders<TBuilders> {
  const out = {} as KeyBuilders<TBuilders>;
  for (const [name, fn] of Object.entries(builders)) {
    (out as Record<string, (...args: unknown[]) => readonly unknown[]>)[name] = (...args: unknown[]) =>
      [scope, ...(fn as (...a: unknown[]) => unknown[])(...args)] as const;
  }
  return out;
}
