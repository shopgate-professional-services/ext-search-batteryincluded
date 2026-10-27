const CATEGORY_FILTER_FIELDS = require('./categoryFilterFields')

const TTL_FOUND_MS = 60 * 60 * 1000
const TTL_MISSING_MS = 5 * 60 * 1000
const MAX_ENTRIES = 1000

const cache = new Map()
const pending = new Map()

async function lookup (client, locale, categoryId) {
  const result = await client.call('/browse', {
    q: '',
    page: 1,
    per_page: 1,
    v: { locale },
    [`f[${CATEGORY_FILTER_FIELDS.id}][]`]: [categoryId]
  })

  const hit = result && Array.isArray(result.hits) ? result.hits[0] : undefined
  const tree = hit && hit.document && hit.document._product_i18n && hit.document._product_i18n.categoryTree
  const entry = Array.isArray(tree) ? tree.find(e => e && e.id === categoryId) : undefined

  return entry && typeof entry.name === 'string' && entry.name !== '' ? entry.name : null
}

function remember (key, path) {
  cache.delete(key)
  if (cache.size >= MAX_ENTRIES) cache.delete(cache.keys().next().value)
  cache.set(key, { path, expiresAt: Date.now() + (path ? TTL_FOUND_MS : TTL_MISSING_MS) })
}

async function resolveCategoryPath (client, locale, categoryId) {
  const key = [client.baseUrl, client.collection, locale, categoryId].join('|')

  const cached = cache.get(key)
  if (cached && cached.expiresAt > Date.now()) return cached.path

  if (pending.has(key)) return pending.get(key)

  const request = lookup(client, locale, categoryId)
    .then((path) => {
      remember(key, path)
      return path
    })
    .finally(() => pending.delete(key))

  pending.set(key, request)
  return request
}

module.exports = resolveCategoryPath
