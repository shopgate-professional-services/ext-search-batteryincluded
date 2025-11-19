const axios = require('axios');

const BI_BASE_URL = 'https://api.batteryincluded.io';

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
   * @param {string} options.config.productIdentifier - Product identifier.
   * @param {Object} [options.log] - Logger object.
   *
   * @throws {Error} If any required config field is missing.
   */
  constructor({ config, log }) {
    const {
      publicApiKey,
      baseUrl,
      collection,
      productIdentifier,
    } = config;

    if (!publicApiKey || !baseUrl || !collection || !productIdentifier) {
      throw new Error('[BatteryIncluded] publicApiKey, baseUrl, collection and productIdentifier are required');
    }

    this.apiKey = publicApiKey;
    this.baseUrl = baseUrl.replace(/\/$/, '');
    this.collection = collection;
    this.log = log;

    this.http = axios.create({
      baseURL: baseUrl || BI_BASE_URL,
      headers: {
        'X-BI-API-KEY': this.apiKey,
        'Content-Type': 'application/x-ndjson',
      },
      timeout: 8000,
    });
  }

  /**
   * Generic call helper
   * @param {string} path e.g. '/browse' or '/suggest'
   * @param {Object} query optional query params
   * @returns {Promise<Object>}
   */
  async call(path, query = {}) {
    const url = `/api/v1/collections/${this.collection}/documents${path}`;

    try {
      this.log.debug(`[BatteryIncluded] Calling ${url} with query: ${JSON.stringify(query)}`);
      const response = await this.http.get(url, { params: query });
      return response.data;
    } catch (err) {
      const { response, message } = err;
      const status = response?.status ?? null;
      const statusText = response?.statusText ?? null;
      const data = response?.data;

      this.log.error('[BatteryIncluded] Request failed', {
        url,
        status,
        statusText,
        message,
        data,
      });

      throw new Error(
        `[BatteryIncluded] API error (${status || 'unknown'}): ${message || 'Unexpected error'}`,
        { cause: err }
      );
    }
  }
}

module.exports = BatteryIncludedClient;
