const BatteryIncludedClient = require('../lib/batteryincluded/client/BatteryIncludedClient')
const prepareSort = require('../lib/batteryincluded/utils/prepareSort')
const prepareFilters = require('../lib/batteryincluded/utils/prepareFilters')
const fetchHits = require('../lib/batteryincluded/utils/fetchHits')
const { isValidPathSyntax, extractProductIds } = require('../lib/batteryincluded/utils/productIds')

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
    offset,
    limit
  } = input
  const { locale, productIdentifier } = context.config

  const identifierPath =
    typeof productIdentifier === 'string' ? productIdentifier.trim() : ''

  if (!isValidPathSyntax(identifierPath)) {
    context.log.warn({ identifierPath }, 'BatteryIncluded: invalid identifier path')
    return {
      productIds: [],
      totalProductCount: 0
    }
  }

  const query = {
    q: searchPhrase,
    v: { locale },
    sort: prepareSort(sort),
    ...prepareFilters(filters)
  }

  const { hits, found, extensions } = await fetchHits(client, query, { offset, limit })

  const overrides = extensions.filter(extension => extension && extension.type === 'overrides')
  if (overrides.length) {
    context.log.debug({
      searchPhrase,
      filters,
      rules: overrides.map(extension => extension.data && extension.data.name)
    }, 'BatteryIncluded: merchandising rules applied')
  }

  const productIds = extractProductIds(hits, identifierPath)

  if (hits.length > 0 && productIds.length === 0) {
    context.log.warn({ identifierPath }, 'BatteryIncluded: identifier path not found in result documents')
  }

  return {
    productIds,
    totalProductCount: found
  }
}
