const assert = require('assert')
const fetchHits = require('../lib/batteryincluded/utils/fetchHits')

const createClient = (total, extensions = []) => {
  const calls = []
  return {
    calls,
    call: async (path, query) => {
      calls.push(query)
      const start = (query.page - 1) * query.per_page
      const end = Math.min(start + query.per_page, total)
      const hits = []
      for (let i = start; i < end; i++) hits.push({ document: { id: i } })
      return { hits, found: total, extensions }
    }
  }
}

const ids = result => result.hits.map(hit => hit.document.id)

describe('fetchHits', () => {
  it('fetches the first page with defaults', async () => {
    const client = createClient(100)
    const result = await fetchHits(client, { q: 'x' })

    assert.deepStrictEqual(client.calls, [{ q: 'x', page: 1, per_page: 20 }])
    assert.deepStrictEqual(ids(result), [...Array(20).keys()])
    assert.strictEqual(result.found, 100)
  })

  it('returns the requested slice for offsets that are not a multiple of limit', async () => {
    const client = createClient(100)
    const result = await fetchHits(client, {}, { offset: 3, limit: 4 })

    assert.deepStrictEqual(client.calls.map(call => call.page), [1, 2])
    assert.deepStrictEqual(ids(result), [3, 4, 5, 6])
  })

  it('keeps page-aligned requests on one page', async () => {
    const client = createClient(100)
    const result = await fetchHits(client, {}, { offset: 32, limit: 32 })

    assert.deepStrictEqual(client.calls.map(call => call.page), [2])
    assert.deepStrictEqual(ids(result), [...Array(32).keys()].map(i => i + 32))
  })

  it('rejects limits above 250', async () => {
    const client = createClient(1000)

    await assert.rejects(fetchHits(client, {}, { limit: 251 }), { code: 'EVALIDATION' })
    assert.strictEqual(client.calls.length, 0)
  })

  it('spans two pages of 250 for unaligned offsets', async () => {
    const client = createClient(1000)
    const result = await fetchHits(client, {}, { offset: 100, limit: 250 })

    assert.deepStrictEqual(client.calls.map(call => [call.page, call.per_page]), [[1, 250], [2, 250]])
    assert.deepStrictEqual(ids(result), [...Array(250).keys()].map(i => i + 100))
  })

  it('fails when a page fails', async () => {
    const client = {
      call: async (path, query) => {
        if (query.page === 2) throw new Error('down')
        return { hits: [], found: 100 }
      }
    }

    await assert.rejects(fetchHits(client, {}, { offset: 3, limit: 4 }), /down/)
  })

  it('takes only the requested range from each page when a page is short', async () => {
    const client = {
      call: async (path, query) => ({
        hits: query.page === 1 ? [0, 1, 2].map(id => ({ document: { id } })) : [4, 5, 6, 7].map(id => ({ document: { id } })),
        found: 8
      })
    }

    const result = await fetchHits(client, {}, { offset: 3, limit: 4 })

    assert.deepStrictEqual(ids(result), [4, 5, 6])
  })

  it('returns fewer hits at the end of the result', async () => {
    const client = createClient(10)
    const result = await fetchHits(client, {}, { offset: 8, limit: 4 })

    assert.deepStrictEqual(ids(result), [8, 9])
  })

  it('normalises invalid offset and limit', async () => {
    const client = createClient(100)
    const result = await fetchHits(client, {}, { offset: -5, limit: 'abc' })

    assert.deepStrictEqual(client.calls, [{ page: 1, per_page: 20 }])
    assert.strictEqual(result.hits.length, 20)
  })

  it('returns the extensions of the first response', async () => {
    const extensions = [{ type: 'overrides', data: { name: 'Rule' } }]
    const result = await fetchHits(createClient(5, extensions), {})

    assert.deepStrictEqual(result.extensions, extensions)
  })
})
