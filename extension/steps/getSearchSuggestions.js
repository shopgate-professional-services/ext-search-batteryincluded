const BatteryIncludedClient = require('../lib/batteryincluded/client/BatteryIncludedClient')

/**
 * BatteryIncluded: Search Suggestions
 *
 * Endpoint: GET /api/v1/collections/{collection}/documents/suggest
 *
 * @param {PipelineContext} context - Contains config.
 * @param {Object} input - Pipeline input.
 * @returns {Promise<{ suggestions: string[] }>}
 */
module.exports = async (context, input) => {
  const client = new BatteryIncludedClient(context)
  const { searchPhrase } = input
  const { locale } = context.config

  const query = {
    q: searchPhrase,
    v: { locale }
  }
  const result = await client.call('/suggest', query)

  return {
    suggestions: Array.isArray(result)
      ? result
        .filter(item => item.kind === 'query-completion')
        .flatMap(item => item.hits || [])
        .map(hit => hit.value)
        .filter(Boolean)
      : []
  }
}
