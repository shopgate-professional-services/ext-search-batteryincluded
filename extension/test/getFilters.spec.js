const assert = require('assert')
const getFilters = require('../steps/getFilters')
const { createContext, stubCall, restoreCall } = require('./helpers')

const facets = {
  facet_counts: [
    { field_name: '_product_i18n.manufacturer', type: 'string', counts: [{ value: 'Wunderlich', count: 3 }] },
    { field_name: '_product_i18n.categoryTree.name', type: 'string', counts: [{ value: 'Marken', count: 9 }] },
    { field_name: '_product.price', type: 'range', stats: { min: 9, max: 499 } }
  ]
}

describe('getFilters', () => {
  afterEach(restoreCall)

  it('applies the category filter and drops the category facets', async () => {
    const calls = stubCall(() => facets)

    const { filters } = await getFilters(createContext(), {
      searchPhrase: '*',
      filters: {
        '_product_i18n.categoryTree.name': { type: 'multiselect', values: ['Marken > BMW'] },
        '_product.price': { type: 'range', minimum: 900, maximum: 2000 }
      }
    })

    assert.deepStrictEqual(calls[0].query['f[_product_i18n.categoryTree.name][]'], ['Marken > BMW'])
    assert.strictEqual(calls[0].query['f[_product.price][from]'], undefined)
    assert.deepStrictEqual(filters.map(filter => filter.id), ['_product_i18n.manufacturer', '_product.price'])
  })

  it('applies the category id filter and drops the category facets', async () => {
    const calls = stubCall(() => ({
      facet_counts: [
        ...facets.facet_counts,
        { field_name: '_product_i18n.categoryTree.id', type: 'string', counts: [{ value: 'cat', count: 9 }] }
      ]
    }))

    const { filters } = await getFilters(createContext(), {
      searchPhrase: '*',
      filters: { '_product_i18n.categoryTree.id': { type: 'multiselect', values: ['cat'] } }
    })

    assert.deepStrictEqual(calls[0].query['f[_product_i18n.categoryTree.id][]'], ['cat'])
    assert.deepStrictEqual(filters.map(filter => filter.id), ['_product_i18n.manufacturer', '_product.price'])
  })

  it('keeps all facets for searches', async () => {
    const calls = stubCall(() => facets)

    const { filters } = await getFilters(createContext(), { searchPhrase: 'helm' })

    assert.deepStrictEqual(Object.keys(calls[0].query), ['q', 'v', 'page', 'per_page'])
    assert.strictEqual(filters.length, 3)
  })

  it('uses the plain value as label', async () => {
    stubCall(() => facets)

    const { filters } = await getFilters(createContext(), { searchPhrase: 'helm' })

    assert.deepStrictEqual(filters[0].values, [{ id: 'Wunderlich', label: 'Wunderlich', hits: 3 }])
  })
})
