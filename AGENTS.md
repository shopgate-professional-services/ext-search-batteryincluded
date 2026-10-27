This file gives AI coding assistants (Claude Code, etc.) and new developers a
fast on-ramp to this repository. Keep it short, factual, and up to date — when
behavior here drifts from the code, update this document in the same PR.

## AI Coding Agent Ground Rules

1. Ask, don't assume. If something is unclear, ask before writing a single line. Never make silent assumptions about intent, architecture, or requirements.

2. Simplest solution first. Always implement the simplest thing that could work. Do not add abstractions or flexibility that weren't explicitly requested.

3. Don't touch unrelated code. If a file or function is not directly part of the current task, do not modify it, even if you think it could be improved.

4. Flag uncertainty explicitly. If you are not confident about an approach or technical detail, say so before proceeding. Confidence without certainty causes more damage than admitting a gap.

## Project Overview

Shopgate Connect backend extension `@shopgate-project/search-batteryincluded`. It replaces Shopgate search, search suggestions and search filters with the BatteryIncluded (BI) `/browse` and `/suggest` APIs. Optionally (`categoryListingEnabled`) category listings also come from BI, so BI merchandising rules apply. BI returns product ids only; products are still loaded from the Shopgate catalog via `shopgate.catalog.getProducts.v1`.

## Tech Stack

- Node.js, CommonJS (`require` / `module.exports`). No `engines` field, no `.nvmrc`.
- npm, `package.json` lives in `extension/`, not in the repo root.
- axios for BI requests (`extension/lib/batteryincluded/client/BatteryIncludedClient.js`).
- mocha + Node `assert` for tests, `standard` for lint.

## Common Commands

Run from `extension/`:

- Install: `npm install` (not documented in the repo, verify before use)
- Test: `npm test` (`mocha --recursive test`)
- Lint: `npm run lint` (`standard`)

There is no build or start script. Running locally needs the Shopgate platform SDK (`sgconnect`), which the repo does not document.

## Repository Structure

- `extension-config.json`: extension id, version, admin configuration and the hook registration (`steps[]`).
- `pipelines/*.json`: overrides of the core pipelines `getProductsBySearchPhrase.v1`, `getProductsBySearchPhraseAndFilter.v1`, `getFilters.v1` and `getSearchSuggestions.v1`. Each search pipeline calls `steps/getProductsBySearchPhrase.js` for ids and then the core `shopgate.catalog.getProducts.v1` for products.
- `extension/steps/`: pipeline steps, one `module.exports = async (context, input) => ({...})` per file.
- `extension/lib/batteryincluded/`: `client/` (HTTP client), `utils/` (sort, filter, paging and id mapping), `category/` (category path lookup and filter field names).
- Category listings are wired twice through `extension/steps/routeCategoryToBi.js`:
  - as hook `shopgate.catalog.getProducts.v1:before` in `extension-config.json`
  - as first step of `pipelines/shopgate.catalog.getFilters.v1.json` (explicit ids 1/2/3, because `filters` is both input 3 and output 1000 there)
  - It rewrites a pure category request to `categoryId: null`, `searchPhrase: '*'` plus a category filter, so the core router picks this extension's search pipelines.
- `getFilters.v1` routes by the `catalogService` config: requests that still carry a `categoryId` go to BigAPI (`CATALOG_SERVICE_PRODUCTS` or `CATALOG_SERVICE_GENERIC`), all others to `steps/getFilters.js`.
- Pipeline step paths use the extension id: `@shopgate-project/search-batteryincluded/steps/<file>.js` maps to `extension/steps/<file>.js`. The hook path in `extension-config.json` is repo-relative (`extension/steps/...`).

## Internal Knowledge Base

Additional internal documentation may be available in the Knowledge Base:

https://gitlab.localdev.cc/internal/knowledge-base

Future AI coding assistants and developers should check this Knowledge Base when they need context about cross-service dependencies, shared platform conventions, infrastructure, deployment, authentication/authorization, internal libraries, or service contracts.

## Local Development Notes

- `extension/config.json` holds the backend config including `publicApiKey`. It is gitignored and must never be committed or printed.
- `**/package-lock.json` is gitignored.
- Configuration keys, their meaning and an example are in `README.md`.

## Testing Notes

- Specs: `extension/test/<unit>.spec.js`, shared helpers in `extension/test/helpers.js`.
- `createContext(config)` builds a fake context whose `log` records `{ level, data, message }` in `log.entries`.
- `stubCall(handler)` replaces `BatteryIncludedClient.prototype.call` and returns the recorded calls. Always `afterEach(restoreCall)`.
- Pure lib specs pass a hand-written fake client `{ call: async (path, query) => ... }`.
- `resolveCategoryPath` keeps a module-level cache. Tests isolate themselves with a unique collection or category id per test and fake time by reassigning `Date.now`.

## Deployment / CI Notes

- No CI config, Dockerfile or release script in the repo.
- The version lives in `extension-config.json`, `extension/package.json` and `CHANGELOG.md` (Keep a Changelog). Keep all three in sync.

## Project-Specific Pitfalls

- BI `per_page` is at most 250. `fetchHits` throws `EVALIDATION` for `limit` above 250 and defaults to 20.
- Offsets that are not a multiple of `limit` fetch two BI pages and take only the requested range from each.
- `productIdentifier` is a dot-notation path into the BI document (`_product.id` by default). Variant hits are mapped to their parent via `_common.grouping.groupingKey` (`utils/productIds.js`).
- Range filters: `getFilters.js` multiplies BI min/max by 100, `prepareFilters.js` divides by 100 only for values ≥ 100.
- Filters with `source: 'categories'` are skipped in `prepareFilters.js`. `routeCategoryToBi` only routes when every filter source is `BatteryIncluded` or `categories`. Filters without a source keep the Shopgate listing.
- Category merchandising rules only apply with `categoryFilterField: name` (`_product_i18n.categoryTree.name`). The Shopgate category id must equal `_product_i18n.categoryTree.id`.
- Routed category requests skip hooks on `getProductsByCategory.v1` and `getProductsByFilter.v1` and do not forward `locationCodes`, `properties` and `additionalWebhookData` (`README.md`, Limitations).
- `prepareSort` maps only priceAsc/Desc and nameAsc/Desc. Other sort keys send no sort, so BI's ranking applies.
- Client timeout defaults to 6.5 s to stay below the 8 s step timeout. The category lookup uses 3 s.
- Lint config is the `standard` key in `extension/package.json`. `standard` ignores `.eslintrc` files.

## Editing Guidelines for AI Agents

- Follow `standard` style: no semicolons, 2-space indent, single quotes.
- Log with `context.log.<level>({ ...data }, 'BatteryIncluded: <message>')`, object first. Never log the API key.
- Throw errors, do not return them. Use `err.code` for validation errors (`EVALIDATION`).
- When adding a step input or output, update the pipeline JSON (ids) or the hook entry in `extension-config.json` together with the step.
- Update `README.md` and `CHANGELOG.md` when configuration or behavior changes.
