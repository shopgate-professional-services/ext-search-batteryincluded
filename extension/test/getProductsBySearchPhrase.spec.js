const assert = require('assert')
const getProductsBySearchPhrase = require('../steps/getProductsBySearchPhrase')
const { createContext, stubCall, restoreCall } = require('./helpers')

const hit = (id, productNumber) => ({ document: { _product: { id, productNumber: [productNumber] } } })

describe('getProductsBySearchPhrase', () => {
  afterEach(restoreCall)

  it('returns the product ids of the requested slice and the total', async () => {
    const calls = stubCall((path, query) => ({
      hits: query.page === 1 ? [hit('a', 'A'), hit('b', 'B')] : [hit('c', 'C'), hit('d', 'D')],
      found: 4,
      extensions: []
    }))

    const result = await getProductsBySearchPhrase(createContext(), {
      searchPhrase: '*',
      sort: 'priceAsc',
      offset: 1,
      limit: 2,
      filters: { '_product_i18n.categoryTree.name': { type: 'multiselect', values: ['Marken'] } }
    })

    assert.deepStrictEqual(result, { productIds: ['b', 'c'], totalProductCount: 4 })
    assert.deepStrictEqual(calls[0].query, {
      q: '*',
      v: { locale: 'de-DE' },
      sort: '_product.price:asc',
      'f[_product_i18n.categoryTree.name][]': ['Marken'],
      page: 1,
      per_page: 2
    })
  })

  it('logs applied merchandising rules', async () => {
    stubCall(() => ({ hits: [hit('a', 'A')], found: 1, extensions: [{ type: 'overrides', data: { name: 'Pin' } }] }))
    const context = createContext()

    const filters = { '_product_i18n.categoryTree.name': { type: 'multiselect', values: ['Marken'] } }

    await getProductsBySearchPhrase(context, { searchPhrase: '*', filters })

    assert.deepStrictEqual(
      context.log.entries.map(entry => [entry.level, entry.data.rules, entry.data.filters]),
      [['debug', ['Pin'], filters]]
    )
  })

  it('returns no products for an invalid identifier path', async () => {
    const calls = stubCall(() => { throw new Error('no call expected') })

    const result = await getProductsBySearchPhrase(createContext({ productIdentifier: '.id' }), { searchPhrase: 'x' })

    assert.deepStrictEqual(result, { productIds: [], totalProductCount: 0 })
    assert.strictEqual(calls.length, 0)
  })

  it('warns when no hit has the identifier', async () => {
    stubCall(() => ({ hits: [{ document: {} }], found: 1 }))
    const context = createContext()

    const result = await getProductsBySearchPhrase(context, { searchPhrase: 'x' })

    assert.deepStrictEqual(result.productIds, [])
    assert.strictEqual(context.log.entries[0].level, 'warn')
  })
})
