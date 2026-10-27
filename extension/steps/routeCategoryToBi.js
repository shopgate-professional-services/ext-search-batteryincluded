const BatteryIncludedClient = require('../lib/batteryincluded/client/BatteryIncludedClient')
const resolveCategoryPath = require('../lib/batteryincluded/category/resolveCategoryPath')
const CATEGORY_FILTER_FIELDS = require('../lib/batteryincluded/category/categoryFilterFields')

const BI_SOURCE = 'BatteryIncluded'
const NEUTRAL_SOURCES = [BI_SOURCE, 'categories']
const LOOKUP_TIMEOUT_MS = 3000

const isEnabled = value => [true, 'true', 1, '1'].includes(value)

async function getCategoryFilterValue (context, field, categoryId) {
  if (field === 'id') return categoryId

  const client = new BatteryIncludedClient(context, { timeout: LOOKUP_TIMEOUT_MS })
  return resolveCategoryPath(client, context.config.locale, categoryId)
}

module.exports = async (context, input) => {
  const { categoryId, searchPhrase, filters, productIds, offset } = input
  const passThrough = { categoryId, searchPhrase, filters }
  const { categoryListingEnabled, categoryFilterField } = context.config

  if (
    !isEnabled(categoryListingEnabled) ||
    !categoryId ||
    searchPhrase ||
    (Array.isArray(productIds) && productIds.length > 0)
  ) {
    return passThrough
  }

  const sources = Object.values(filters || {}).map(filter => filter && filter.source)

  if (sources.some(source => !NEUTRAL_SOURCES.includes(source))) return passThrough

  const hasBiFilters = sources.includes(BI_SOURCE)
  const field = categoryFilterField === 'id' ? 'id' : 'name'

  let value
  try {
    value = await getCategoryFilterValue(context, field, categoryId)
  } catch (err) {
    if (hasBiFilters || Number(offset) > 0) throw err

    context.log.error({ categoryId, errorMessage: err.message }, 'BatteryIncluded: category lookup failed, using the Shopgate listing')
    return passThrough
  }

  if (!value) {
    if (hasBiFilters) throw new Error('BatteryIncluded: category not found')

    context.log.warn({ categoryId }, 'BatteryIncluded: category not found, using the Shopgate listing')
    return passThrough
  }

  context.log.debug({ categoryId, field: CATEGORY_FILTER_FIELDS[field], value }, 'BatteryIncluded: category routed to search')

  return {
    categoryId: null,
    searchPhrase: '*',
    filters: {
      ...(filters || {}),
      [CATEGORY_FILTER_FIELDS[field]]: { type: 'multiselect', label: 'category', values: [value] }
    }
  }
}
