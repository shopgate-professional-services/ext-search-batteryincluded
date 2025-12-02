const BatteryIncludedClient = require('../client/BatteryIncludedClient')

/**
 * Transforms BatteryIncluded `facet_counts` into normalized filter objects.
 *
 * @param {PipelineContext} context - Execution context containing config and locale.
 * @param {Object} input - Input parameters for the pipeline step.
 * @param {string} input.searchPhrase - Search term used for the browse request.
 *
 * @returns {Promise<{ filters: Array }>} Resolves with a list of normalized filter objects.
 */
module.exports = async (context, input) => {
  const client = new BatteryIncludedClient(context)
  const { searchPhrase } = input
  const { locale, filterFacets = [] } = context.config

  const allowedFacetNames = filterFacets.map(f => f.fieldName)
  const labelMap = Object.fromEntries(
    filterFacets
      .filter(f => typeof f.fieldName === 'string' && typeof f.label === 'string')
      .map(f => [f.fieldName, f.label.trim()])
  )

  const result = await client.call('/browse', {
    q: searchPhrase,
    v: { locale },
    page: 1,
    per_page: 1
  })

  if (!result || !result.facet_counts || !result.facet_counts.length) {
    return { filters: [] }
  }

  const filters = result.facet_counts
    .filter(facet => (
      !allowedFacetNames.length || allowedFacetNames.includes(facet.field_name)
    ))
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
            label: `${c.value} (${c.count})`,
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

  return { filters }
}
