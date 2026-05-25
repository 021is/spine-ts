import {
  type ReactNode,
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { type Runtime, buildRuntime } from "./application/runtime.js";
import type { Catalog } from "./domain/catalog.js";
import type { Locale } from "./domain/locale.js";

const RuntimeCtx = createContext<Runtime | null>(null);

export interface LocaleProviderProps {
  initial: Runtime;
  children: ReactNode;
}

export function LocaleProvider({ initial, children }: LocaleProviderProps) {
  const [runtime, setRuntime] = useState<Runtime>(initial);

  useEffect(() => {
    const listener = (e: Event) => {
      const detail = (e as CustomEvent<{ primary: Catalog; fallback: Catalog | null }>).detail;
      if (detail) setRuntime(buildRuntime(detail.primary, detail.fallback));
    };
    window.addEventListener("spine-locale-change", listener as EventListener);
    return () => window.removeEventListener("spine-locale-change", listener as EventListener);
  }, []);

  return <RuntimeCtx.Provider value={runtime}>{children}</RuntimeCtx.Provider>;
}

/** Hook returning the bound `t` and full runtime. */
export function useRuntime(): Runtime {
  const r = useContext(RuntimeCtx);
  if (!r)
    throw new Error(
      "[spine-i18n] LocaleProvider missing — wrap your tree in <LocaleProvider initial={...} />",
    );
  return r;
}

export function useT() {
  const r = useRuntime();
  // biome-ignore lint/correctness/useExhaustiveDependencies: r.t is bound; r reference is the dep
  return useCallback(r.t.bind(r), [r]);
}

export function useLocale(): Locale {
  return useRuntime().locale;
}

/**
 * Instant locale switch — fire a CustomEvent the provider listens for.
 *
 *   switchLocale({ primary: deCatalog, fallback: enCatalog });
 *
 * Apps typically wrap this with a hook that also writes the cookie + posts
 * to a server route to remember the choice.
 */
export function switchLocale(payload: { primary: Catalog; fallback: Catalog | null }) {
  window.dispatchEvent(new CustomEvent("spine-locale-change", { detail: payload }));
}

/** Convenience: memoized formatter access. */
export function useFmt() {
  const r = useRuntime();
  return useMemo(
    () => ({
      number: r.fmtNumber.bind(r),
      date: r.fmtDate.bind(r),
      currency: r.fmtCurrency.bind(r),
    }),
    [r],
  );
}
