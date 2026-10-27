const assert = require('assert')
const resolveCategoryPath = require('../lib/batteryincluded/category/resolveCategoryPath')

let collectionCounter = 0

const createClient = (handler) => {
  const calls = []
  collectionCounter += 1
  return {
    calls,
    baseUrl: 'https://api.example.test',
    collection: `customer.path-${collectionCounter}`,
    call: async (path, query) => {
      calls.push(query)
      return handler(query)
    }
  }
}

const treeResponse = categoryTree => ({ hits: [{ document: { _product_i18n: { categoryTree } } }] })

describe('resolveCategoryPath', () => {
  const realNow = Date.now

  afterEach(() => {
    Date.now = realNow
  })

  it('returns the path of the matching categoryTree entry', async () => {
    const client = createClient(() => treeResponse([
      { id: 'root', name: 'Marken' },
      { id: 'cat', name: 'Marken > BMW > BMW R-Serie' }
    ]))

    assert.strictEqual(await resolveCategoryPath(client, 'de-DE', 'cat'), 'Marken > BMW > BMW R-Serie')
    assert.deepStrictEqual(client.calls[0], {
      q: '',
      page: 1,
      per_page: 1,
      v: { locale: 'de-DE' },
      'f[_product_i18n.categoryTree.id][]': ['cat']
    })
  })

  it('returns null when BatteryIncluded has no product in the category', async () => {
    const client = createClient(() => ({ hits: [] }))

    assert.strictEqual(await resolveCategoryPath(client, 'de-DE', 'unknown'), null)
  })

  it('caches hits for one hour', async () => {
    const client = createClient(() => treeResponse([{ id: 'cat', name: 'A > B' }]))
    let now = 1000
    Date.now = () => now

    await resolveCategoryPath(client, 'de-DE', 'cat')
    now += 59 * 60 * 1000
    await resolveCategoryPath(client, 'de-DE', 'cat')
    assert.strictEqual(client.calls.length, 1)

    now += 2 * 60 * 1000
    await resolveCategoryPath(client, 'de-DE', 'cat')
    assert.strictEqual(client.calls.length, 2)
  })

  it('caches misses for five minutes', async () => {
    const client = createClient(() => ({ hits: [] }))
    let now = 1000
    Date.now = () => now

    await resolveCategoryPath(client, 'de-DE', 'cat')
    now += 4 * 60 * 1000
    await resolveCategoryPath(client, 'de-DE', 'cat')
    assert.strictEqual(client.calls.length, 1)

    now += 2 * 60 * 1000
    await resolveCategoryPath(client, 'de-DE', 'cat')
    assert.strictEqual(client.calls.length, 2)
  })

  it('does not cache errors', async () => {
    let fail = true
    const client = createClient(() => {
      if (fail) throw new Error('down')
      return treeResponse([{ id: 'cat', name: 'A' }])
    })

    await assert.rejects(resolveCategoryPath(client, 'de-DE', 'cat'), /down/)
    fail = false
    assert.strictEqual(await resolveCategoryPath(client, 'de-DE', 'cat'), 'A')
  })

  it('dedupes parallel lookups', async () => {
    const client = createClient(() => treeResponse([{ id: 'cat', name: 'A' }]))

    const paths = await Promise.all([
      resolveCategoryPath(client, 'de-DE', 'cat'),
      resolveCategoryPath(client, 'de-DE', 'cat')
    ])

    assert.deepStrictEqual(paths, ['A', 'A'])
    assert.strictEqual(client.calls.length, 1)
  })
})
