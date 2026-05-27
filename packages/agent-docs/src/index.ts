/**
 * @021is/agent-docs — single-source-of-truth docs primitives shared
 * across every 021/edvone product. One catalog object feeds the JSX
 * page, the `.md` route handler, the `llms.txt` index, and the
 * `llms-full.txt` concatenation. Drift between surfaces becomes
 * physically impossible.
 *
 * Companion entry point `@021is/agent-docs/next` adds Next.js helpers
 * for the per-page `.md` route handlers + the llms.txt response.
 */
export * from "./catalog";
export * from "./render-markdown";
export * from "./llms-txt";
