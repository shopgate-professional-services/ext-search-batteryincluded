const BatteryIncludedClient = require('../lib/batteryincluded/client/BatteryIncludedClient')
const prepareFilters = require('../lib/batteryincluded/utils/prepareFilters')
const CATEGORY_FILTER_FIELDS = require('../lib/batteryincluded/category/categoryFilterFields')

const CATEGORY_FIELD_NAMES = Object.values(CATEGORY_FILTER_FIELDS)

/**
 * Transforms BatteryIncluded `facet_counts` into normalized filter objects.
 *
 * @param {PipelineContext} context - Execution context containing config and locale.
 * @param {Object} input - Input parameters for the pipeline step.
 * @param {string} input.searchPhrase - Search term used for the browse request.
 * @param {Object} [input.filters] - Only the category filter is applied, other filters are ignored.
 *
 * @returns {Promise<{ filters: Array }>} Resolves with a list of normalized filter objects.
 */
module.exports = async (context, input) => {
  const client = new BatteryIncludedClient(context)
  const { searchPhrase, filters: requestFilters } = input
  const { locale, filterFacets = [] } = context.config

  const allowedFacetNames = filterFacets
    .map(f => f.fieldName)
    .filter((n) => { return typeof n === 'string' && n.trim() !== '' })

  const labelMap = Object.fromEntries(
    filterFacets
      .filter(f => typeof f.fieldName === 'string' && typeof f.label === 'string')
      .map(f => [f.fieldName, f.label.trim()])
  )

  const categoryFilters = Object.fromEntries(
    Object.entries(requestFilters || {}).filter(([fieldName]) => CATEGORY_FIELD_NAMES.includes(fieldName))
  )
  const isCategoryListing = Object.keys(categoryFilters).length > 0

  const result = await client.call('/browse', {
    q: searchPhrase,
    v: { locale },
    page: 1,
    per_page: 1,
    ...prepareFilters(categoryFilters)
  })

  if (!result || !result.facet_counts || !result.facet_counts.length) {
    return { filters: [] }
  }

  const filters = result.facet_counts
    .filter(facet => (
      !allowedFacetNames.length || allowedFacetNames.includes(facet.field_name)
    ))
    .filter(facet => !isCategoryListing || !CATEGORY_FIELD_NAMES.includes(facet.field_name))
    .map((facet) => {
      const rawLabel = labelMap[facet.field_name]
      const label = (typeof rawLabel === 'string' && rawLabel.trim() !== '')
        ? rawLabel.trim()
        : facet.field_name.split('.').pop() || facet.field_name

      if (facet.type === 'range') {
        const stats = facet.stats || {}

        return {
          id: facet.field_name,
          label,
          source: 'BatteryIncluded',
          type: 'range',
          minimum: Math.floor((stats.min || 0) * 100),
          maximum: Math.ceil((stats.max || 0) * 100)
        }
      }

      const values = Array.isArray(facet.counts)
        ? facet.counts
          .filter(c => c.count > 0)
          .map(c => ({
            id: c.value,
            label: c.value,
            hits: c.count
          }))
        : []

      return {
        id: facet.field_name,
        label,
        source: 'BatteryIncluded',
        type: 'multiselect',
        values
      }
    })

  // sort filters
  if (allowedFacetNames.length > 0) {
    filters.sort((a, b) => allowedFacetNames.indexOf(a.id) - allowedFacetNames.indexOf(b.id))
  }

  return { filters }
}
