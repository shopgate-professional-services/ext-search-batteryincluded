const BatteryIncludedClient = require('../lib/batteryincluded/client/BatteryIncludedClient')

const originalCall = BatteryIncludedClient.prototype.call

const createLog = () => {
  const entries = []
  const log = level => (data, message) => entries.push({ level, data, message })
  return { entries, debug: log('debug'), info: log('info'), warn: log('warn'), error: log('error') }
}

const createContext = (config = {}) => ({
  config: {
    baseUrl: 'https://api.example.test',
    collection: 'customer.test',
    publicApiKey: 'test-key',
    locale: 'de-DE',
    productIdentifier: '_product.id',
    ...config
  },
  log: createLog()
})

const stubCall = (handler) => {
  const calls = []
  BatteryIncludedClient.prototype.call = async function (path, query) {
    calls.push({ path, query, timeout: this.http.defaults.timeout })
    return handler(path, query)
  }
  return calls
}

const restoreCall = () => {
  BatteryIncludedClient.prototype.call = originalCall
}

module.exports = { createContext, createLog, stubCall, restoreCall }
