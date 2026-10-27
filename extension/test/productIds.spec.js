const assert = require('assert')
const { extractProductIds } = require('../lib/batteryincluded/utils/productIds')

const doc = (id, productNumber, groupingKey) => ({
  _product: { id, productNumber: [productNumber] },
  _common: groupingKey ? { grouping: { groupingKey } } : {}
})

describe('extractProductIds', () => {
  it('maps a variant hit to its parent from grouped', () => {
    const parent = doc('parent', 'SW1', 'SW1')
    const variant = doc('variant', 'SW1.1', 'SW1')
    const hits = [{ document: variant, grouped: [{ document: variant }, { document: parent }] }]

    assert.deepStrictEqual(extractProductIds(hits, '_product.id'), ['parent'])
  })

  it('keeps the hit document without grouping data', () => {
    const hits = [{ document: doc('a', 'A') }, { document: doc('b', 'B', 'B'), grouped: [] }]

    assert.deepStrictEqual(extractProductIds(hits, '_product.id'), ['a', 'b'])
  })

  it('keeps the variant when grouped has no parent', () => {
    const variant = doc('variant', 'SW1.1', 'SW1')
    const hits = [{ document: variant, grouped: [{ document: variant }] }]

    assert.deepStrictEqual(extractProductIds(hits, '_product.id'), ['variant'])
  })

  it('dedupes ids and keeps the hit order', () => {
    const parent = doc('parent', 'SW1', 'SW1')
    const hits = [
      { document: doc('x', 'X') },
      { document: doc('v1', 'SW1.1', 'SW1'), grouped: [{ document: parent }] },
      { document: doc('v2', 'SW1.2', 'SW1'), grouped: [{ document: parent }] }
    ]

    assert.deepStrictEqual(extractProductIds(hits, '_product.id'), ['x', 'parent'])
  })

  it('skips hits without the identifier', () => {
    const hits = [{ document: { _product: {} } }, { document: doc('a', 'A') }]

    assert.deepStrictEqual(extractProductIds(hits, '_product.id'), ['a'])
  })
})
