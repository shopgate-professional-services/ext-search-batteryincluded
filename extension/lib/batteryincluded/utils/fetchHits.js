const MAX_PER_PAGE = 250
const DEFAULT_LIMIT = 20

function toNonNegativeInteger (value) {
  const number = Number(value)
  return Number.isInteger(number) && number >= 0 ? number : undefined
}

async function fetchHits (client, query, { offset, limit } = {}) {
  const start = toNonNegativeInteger(offset) || 0
  const size = toNonNegativeInteger(limit) || DEFAULT_LIMIT

  if (size > MAX_PER_PAGE) {
    const err = new Error(`The limit can't be greater than ${MAX_PER_PAGE}`)
    err.code = 'EVALIDATION'
    throw err
  }

  const firstPage = Math.floor(start / size) + 1
  const lastPage = Math.floor((start + size - 1) / size) + 1
  const pages = Array.from({ length: lastPage - firstPage + 1 }, (_, i) => firstPage + i)

  const results = await Promise.all(
    pages.map(page => client.call('/browse', { ...query, page, per_page: size }))
  )

  const hits = results.flatMap((result, index) => {
    const pageStart = (firstPage - 1 + index) * size
    const pageHits = result && Array.isArray(result.hits) ? result.hits : []
    return pageHits.slice(Math.max(start - pageStart, 0), start + size - pageStart)
  })
  const first = results[0] || {}

  return {
    hits,
    found: first.found || 0,
    extensions: Array.isArray(first.extensions) ? first.extensions : []
  }
}

module.exports = fetchHits
