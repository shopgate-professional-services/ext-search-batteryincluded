# BatteryIncluded

This extension replaces the default Shopgate search implementation with **[BatteryIncluded](https://batteryincluded.ai/en/)** as a uniform search and filter provider. Optionally, category product listings come from BatteryIncluded as well, so its merchandising rules apply in the app.

Documentation reference: <https://www.postman.com/batteryincluded/core/overview>

## ⚙️ Configuration

| Key                 | Description                                                                                                                          | Required | Default                          |
| ------------------- | ------------------------------------------------------------------------------------------------------------------------------------ | -------- | -------------------------------- |
| `baseUrl`           | BatteryIncluded API endpoint used for all search, filter, suggestion and facet requests.                                             | **Yes**       | `https://api.batteryincluded.io` |
| `collection`        | Identifier of the data collection to query. You can find this name at the example curl request at "Schema" in <https://portal.batteryincluded.io/>. The collection name always starts with "customer".              | **Yes**  | —                                |
| `publicApiKey`      | Public integration key sent with all requests. Provided by BatteryIncluded. You can find it at "Connection" in <https://portal.batteryincluded.io/>.                                                          | **Yes**  | —                                |
| `productIdentifier` | Dot-notation path pointing to the unique product ID inside the search response payload. Must be a valid dot-notation expression.     | **Yes**       | `_product.id`                    |
| `locale`            | Locale code used to query localized attributes (e.g. `de`, `de-DE`). Must match a locale configured in your BatteryIncluded project. | **Yes**  | —                                |
| `filterFacets`      | List of allowed filter definitions. Each entry must contain a `fieldName`, optionally a `label`. When the array is empty(`[]`), all available facets from BatteryIncluded will be exposed.                                    | No       | `[]`                             |
| `catalogService`      | Defines which catalog backend is used.                                    | **Yes**       | `CATALOG_SERVICE_PRODUCTS`                             |
| `categoryListingEnabled` | Category product listings, their filters and counts come from BatteryIncluded. See "Category listings" below. | No | `false` |
| `categoryFilterField` | How category listings are filtered in BatteryIncluded: `name` (category path, merchandising rules apply) or `id` (category id, no merchandising rules). | No | `name` |



### 📌 filterFacets details

Each facet entry follows:

```json
{
  "fieldName": "_product_i18n.attributes.brand",
  "label": "Hersteller"
}
```

You can find the `fieldName` at "Filters" in the BatteryIncluded backend. For example: `_product_i18n ❯ (locale) ❯ attributes ❯ brand`

### 🧾 Product Identifier Rules

`productIdentifier` can be customized but must follow a valid dot-notation path.
Example values:

```
_product.id
_product_i18n.attributes.sku
_customMapping.product_uuid
````

### 🌐 Locale Requirements

Must match a locale configured in the BatteryIncluded backend.

Example: `de` or `de-DE`

### 🗄️ Supported Catalog Services

The extension can resolve product data through different catalog services:

* `CATALOG_SERVICE_PRODUCTS` – Shopgate Products Service
* `CATALOG_SERVICE_GENERIC` – Shopgate Catalog Service

### 🗂️ Category listings

With `categoryListingEnabled`, a `before` hook on `shopgate.catalog.getProducts.v1` and the first step of `shopgate.catalog.getFilters.v1` turn a category request into a BatteryIncluded search for `*` with a category filter. Product order, total count, filters and paging then come from BatteryIncluded. Products are still loaded from the configured catalog service. This works for every catalog backend. Page widgets that list a category behave the same way.

The Shopgate category id must equal the category id in BatteryIncluded (`_product_i18n.categoryTree.id`).

`categoryFilterField`:

* `name` filters by `_product_i18n.categoryTree.name`. The extension looks up the category path once per category (cached for one hour, unknown categories for five minutes). BatteryIncluded merchandising rules (pinned, boosted, hidden products) only apply with this filter.
* `id` filters by `_product_i18n.categoryTree.id` without a lookup. Merchandising rules do not apply.

Fallback and errors:

* `name`: categories unknown to BatteryIncluded and failed lookups on the first page without BatteryIncluded filters show the regular Shopgate listing. With active BatteryIncluded filters, unknown categories and failed lookups fail the request like search does. Failed lookups on later pages and any later BatteryIncluded error fail as well.
* Requests with filters that do not come from BatteryIncluded (Shopgate filters) always use the Shopgate listing.
* If the first page fell back to the Shopgate listing and a later page reaches BatteryIncluded, the two orders mix within one listing. The PWA drops duplicate products.
* `id`: no fallback. Categories unknown to BatteryIncluded list no products.

Limitations:

* Category requests run through the search pipelines. Hooks bound to `getProductsByCategory.v1` or `getProductsByFilter.v1` do not run for them, hooks bound to the search pipelines and `getProductsByIds.v1` do.
* `locationCodes`, `properties` and `additionalWebhookData` are not forwarded to the product request.
* Variant hits are mapped to their parent product (search included).

### Add a configuration object similar to the following:

```json
{
  "baseUrl": "https://api.batteryincluded.io",
  "collection": "customer.your-collection",
  "publicApiKey": "<public API key>",
  "productIdentifier": "_product.id",
  "locale": "de-DE",
  "catalogService": "CATALOG_SERVICE_PRODUCTS",
  "categoryListingEnabled": false,
  "categoryFilterField": "name",
  "filterFacets": [
    {
      "fieldName": "_product_i18n.attributes.Hersteller",
      "label": ""
    },
    {
      "fieldName": "_product_i18n.properties.Farbe",
      "label": ""
    },
    {
      "fieldName": "_product.price",
      "label": "Preis"
    },
    {
      "fieldName": "_product.categories",
      "label": "Kategorien"
    }
  ]
}
````

## About Shopgate

Shopgate is the leading mobile commerce platform.

Shopgate offers everything online retailers need to be successful in mobile. Our leading
software-as-a-service (SaaS) enables online stores to easily create, maintain and optimize native
apps and mobile websites for the iPhone, iPad, Android smartphones and tablets.

## License

Shopgate Connect - Extension Boilerplate is available under the Apache License, Version 2.0.

See the [LICENSE](./LICENSE) file for more information.
