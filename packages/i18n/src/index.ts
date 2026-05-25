// Domain
export { makeLocale, normalizeTag, languageOf, type Locale } from "./domain/locale.js";
export {
  emptyCatalog,
  pluralCategoryFor,
  renderPluralForm,
  type Catalog,
  type PluralCategory,
  type PluralForms,
} from "./domain/catalog.js";

// Ports
export type { CatalogStore } from "./ports/catalog-store.js";

// Adapters
export { makeMemoryCatalogStore } from "./adapters/driven/memory.js";

// Application
export { negotiateLocale, type NegotiateInput } from "./application/negotiate.js";
export { loadRuntime, buildRuntime, type Runtime } from "./application/runtime.js";
export {
  validateCatalogs,
  type ValidateInput,
  type ValidateResult,
  type Finding,
} from "./application/validate.js";

// Policy
export {
  DEFAULT_POLICY,
  RULE_CODES,
  RULE_LEVEL,
  resolveRule,
  type Policy,
  type RuleCode,
  type RuleLevel,
} from "./domain/policy.js";
