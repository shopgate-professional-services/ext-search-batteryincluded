# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](http://keepachangelog.com/) and this project adheres to [Semantic Versioning](http://semver.org/).

## [1.2.0] - unreleased
### Added
- Category product listings from BatteryIncluded, so its merchandising rules apply in the app (`categoryListingEnabled`, default off).
- `categoryFilterField` selects the category filter: category path (`name`, merchandising rules apply) or category id (`id`).

### Changed
- Display title is now "BatteryIncluded".
- Variant hits are mapped to their parent product, also in search.
- Filter value labels no longer contain the hit count. PWA 7.32.0 and later add it themselves.
- BatteryIncluded request timeout lowered from 8 s to 6.5 s, so requests fail before the step timeout.
- Search requests with `limit` above 250 fail with `EVALIDATION`, like the core search.

### Fixed
- Search results for offsets that are not a multiple of `limit` (e.g. product widgets).

### Security
- Raised `axios` to `^1.21.0` to exclude versions with known vulnerabilities.

## [1.1.0] - 2026-06-12
### Changed
- Removed the `CATALOG_SERVICE_SHOPIFY` catalog service option.

## [1.0.1] - 2026-06-01
### Changed
- Updated `CATALOG_SERVICE_GENERIC` filter pipeline integration to align with `@shopgate/catalog` 2.1.0 search-pipeline refactoring.

## [1.0.0] - 2025-11-19
### Added
- First release of the **BatteryIncluded Search Integration**
- Provides unified search functionality powered by BatteryIncluded:
  - Product search
  - Filtered search
  - Search suggestions
