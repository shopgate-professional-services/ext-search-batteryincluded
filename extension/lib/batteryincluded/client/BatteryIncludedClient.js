const axios = require('axios')

/**
 * Client for interacting with the BatteryIncluded API.
 */
class BatteryIncludedClient {
  /**
   * @param {Object} options - Initialization options.
   * @param {Object} options.config - Required configuration values.
   * @param {string} options.config.publicApiKey - Public API key for authentication.
   * @param {string} options.config.baseUrl - Base API URL.
   * @param {string} options.config.collection - Collection identifier.
   * @param {Object} [options.log] - Logger object.
   *
   * @throws {Error} If any required config field is missing.
   */
  constructor ({ config, log }) {
    const {
      publicApiKey,
      baseUrl,
      collection
    } = config

    if (!publicApiKey || !baseUrl || !collection) {
      throw new Error('BatteryIncluded: internal configuration error')
    }

    this.apiKey = publicApiKey
    this.baseUrl = baseUrl.replace(/\/$/, '')
    this.collection = collection
    this.log = log

    this.http = axios.create({
      baseURL: baseUrl,
      headers: {
        'X-BI-API-KEY': this.apiKey,
        'Content-Type': 'application/x-ndjson'
      },
      timeout: 8000
    })
  }

  /**
   * Generic call helper
   * @param {string} path e.g. '/browse' or '/suggest'
   * @param {Object} query optional query params
   * @returns {Promise<Object>}
   */
  async call (path, query = {}) {
    const url = `/api/v1/collections/${this.collection}/documents${path}`

    try {
      this.log.debug({
        url,
        queryKeys: Object.keys(query)
      }, 'BatteryIncluded: request start')
      const response = await this.http.get(url, { params: query })
      return response.data
    } catch (err) {
      const res = err.response
      this.log.error(
        {
          url,
          statusCode: res ? res.status : null,
          statusText: res ? res.statusText : null,
          errorMessage: err.message || null,
          code: err.code || null
        },
        'BatteryIncluded: request failed'
      )

      throw new Error('BatteryIncluded: request failed', { cause: err })
    }
  }
}

module.exports = BatteryIncludedClient
