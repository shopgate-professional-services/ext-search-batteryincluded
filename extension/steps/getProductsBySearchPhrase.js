const BatteryIncludedClient = require('../lib/batteryincluded/client/BatteryIncludedClient')
const prepareSort = require('../lib/batteryincluded/utils/prepareSort')
const prepareFilters = require('../lib/batteryincluded/utils/prepareFilters')

/**
 * Validates whether a value represents a well-formed dot-notation path.
 *
 * @param {unknown} path - Value to validate.
 * @returns {boolean} True if the value is a valid dot-notation path; otherwise false.
 */
function isValidPathSyntax (path) {
  if (typeof path !== 'string') return false
  const p = path.trim()
  if (p.length === 0 || p.startsWith('.') || p.endsWith('.')) return false
  return p.split('.').every(seg => seg.trim() !== '' && seg === seg.trim())
}

/**
 * Resolves a nested value from an object using a dot-notation path.
 *
 * @param {unknown} obj - Root value to traverse.
 * @param {string} path - Dot-notation path describing the property chain.
 * @returns {unknown} The resolved value, or `undefined` if the path cannot be followed.
 */
function getByPath (obj, path) {
  if (typeof path !== 'string' || path.trim() === '') return undefined
  return path.trim().split('.').reduce(
    (acc, key) => (acc == null ? undefined : acc[key]),
    obj
  )
}

/**
 * BatteryIncluded: Product Search
 *
 * Endpoint: GET /api/v1/collections/{collection}/documents/browse
 *
 * @param {PipelineContext} context - Contains config
 * @param {Object} input - Pipeline input
 * @returns {Promise<{ productIds: string[], totalProductCount: number }>}
 */
module.exports = async (context, input) => {
  const client = new BatteryIncludedClient(context)
  const {
    searchPhrase,
    filters,
    sort,
    offset = 0,
    limit = 20
  } = input
  const { locale, productIdentifier } = context.config

  const identifierPath =
    typeof productIdentifier === 'string' ? productIdentifier.trim() : ''

  if (!isValidPathSyntax(identifierPath)) {
    context.log.warn(`BatteryIncluded: Invalid identifier path "${identifierPath}".`)
    return {
      productIds: [],
      totalProductCount: 0
    }
  }

  const query = {
    q: searchPhrase,
    page: offset && limit > 0 ? Math.floor(offset / limit) + 1 : 1,
    per_page: limit > 0 ? limit : 20,
    v: { locale },
    sort: prepareSort(sort),
    ...prepareFilters(filters)
  }

  const result = await client.call('/browse', query)
  const hits = Array.isArray(result.hits) ? result.hits : []

  if (hits.length === 0) {
    return {
      productIds: [],
      totalProductCount: result.found || 0
    }
  }

  const ids = hits
    .map(hit => getByPath(hit && hit.document, identifierPath))
    .filter(id => id !== undefined && id !== null)

  if (ids.length === 0) {
    // Hits found, but identifier path not found in any document
    context.log.warn(
      `BatteryIncluded: Identifier path "${identifierPath}" not found in any of the result documents.`
    )
  }

  return {
    productIds: ids,
    totalProductCount: result.found || 0
  }
}
