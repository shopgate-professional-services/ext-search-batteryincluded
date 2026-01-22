# BatteryIncluded Search Integration

This extension replaces the default Shopgate search implementation with **[BatteryIncluded](https://batteryincluded.ai/en/)** as a uniform search and filter provider.

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
* `CATALOG_SERVICE_SHOPIFY` – Shopify Sync Service

### Add a configuration object similar to the following:

```json
{
  "baseUrl": "https://api.batteryincluded.io",
  "collection": "customer.demo",
  "publicApiKey": "DeMoKeyK1tsfkpse9u9834hfhdhfKF7s",
  "productIdentifier": "_product.id",
  "locale": "de-DE",
  "catalogService": "CATALOG_SERVICE_PRODUCTS",
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
