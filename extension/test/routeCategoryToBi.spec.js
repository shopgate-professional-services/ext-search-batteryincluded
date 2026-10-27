const assert = require('assert')
const routeCategoryToBi = require('../steps/routeCategoryToBi')
const { createContext, stubCall, restoreCall } = require('./helpers')

const NAME_FIELD = '_product_i18n.categoryTree.name'
const ID_FIELD = '_product_i18n.categoryTree.id'

let categoryCounter = 0
const nextCategoryId = () => {
  categoryCounter += 1
  return `cat-${categoryCounter}`
}

const pathResponse = (categoryId, name) => ({
  hits: [{ document: { _product_i18n: { categoryTree: [{ id: categoryId, name }] } } }]
})

describe('routeCategoryToBi', () => {
  afterEach(restoreCall)

  it('passes through when the switch is off', async () => {
    const calls = stubCall(() => { throw new Error('no call expected') })
    const input = { categoryId: 'cat', filters: { a: { type: 'multiselect', values: ['x'] } } }

    const result = await routeCategoryToBi(createContext({ categoryListingEnabled: false }), input)

    assert.deepStrictEqual(result, { categoryId: 'cat', searchPhrase: undefined, filters: input.filters })
    assert.strictEqual(calls.length, 0)
  })

  it('passes through search, product id and non-category requests', async () => {
    stubCall(() => { throw new Error('no call expected') })
    const context = createContext({ categoryListingEnabled: true })

    for (const input of [
      { searchPhrase: 'helm' },
      { categoryId: 'cat', searchPhrase: 'helm' },
      { categoryId: 'cat', productIds: ['p1'] }
    ]) {
      const result = await routeCategoryToBi(context, input)
      assert.deepStrictEqual(result, { categoryId: input.categoryId, searchPhrase: input.searchPhrase, filters: input.filters })
    }
  })

  it('rewrites a category request with the category path', async () => {
    const categoryId = nextCategoryId()
    const calls = stubCall(() => pathResponse(categoryId, 'Marken > BMW'))
    const price = { type: 'range', minimum: 900, maximum: 10000, source: 'BatteryIncluded' }

    const result = await routeCategoryToBi(
      createContext({ categoryListingEnabled: true }),
      { categoryId, filters: { '_product.price': price } }
    )

    assert.deepStrictEqual(result, {
      categoryId: null,
      searchPhrase: '*',
      filters: {
        '_product.price': price,
        [NAME_FIELD]: { type: 'multiselect', label: 'category', values: ['Marken > BMW'] }
      }
    })
    assert.strictEqual(calls[0].timeout, 3000)
  })

  it('uses the category id without a lookup when configured', async () => {
    const calls = stubCall(() => { throw new Error('no call expected') })

    const result = await routeCategoryToBi(
      createContext({ categoryListingEnabled: 'true', categoryFilterField: 'id' }),
      { categoryId: 'cat' }
    )

    assert.deepStrictEqual(result.filters, { [ID_FIELD]: { type: 'multiselect', label: 'category', values: ['cat'] } })
    assert.strictEqual(calls.length, 0)
  })

  it('passes through Shopgate filters', async () => {
    const calls = stubCall(() => { throw new Error('no call expected') })
    const filters = { color: { type: 'multiselect', values: ['red'], source: 'properties' } }

    const result = await routeCategoryToBi(createContext({ categoryListingEnabled: true }), { categoryId: 'cat', filters })

    assert.deepStrictEqual(result, { categoryId: 'cat', searchPhrase: undefined, filters })
    assert.strictEqual(calls.length, 0)
  })

  it('passes through filters without a source', async () => {
    const calls = stubCall(() => { throw new Error('no call expected') })
    const filters = { display_amount: { type: 'range', minimum: 100, maximum: 900 } }

    const result = await routeCategoryToBi(createContext({ categoryListingEnabled: true }), { categoryId: 'cat', filters })

    assert.strictEqual(result.categoryId, 'cat')
    assert.strictEqual(calls.length, 0)
  })

  it('keeps BatteryIncluded and category filters', async () => {
    const categoryId = nextCategoryId()
    stubCall(() => pathResponse(categoryId, 'Marken'))
    const filters = {
      brand: { type: 'multiselect', values: ['BMW'], source: 'BatteryIncluded' },
      categories: { type: 'multiselect', values: ['x'], source: 'categories' }
    }

    const result = await routeCategoryToBi(createContext({ categoryListingEnabled: true }), { categoryId, filters, offset: 32 })

    assert.deepStrictEqual(Object.keys(result.filters), ['brand', 'categories', NAME_FIELD])
  })

  it('falls back to the category path for unknown filter field values', async () => {
    const categoryId = nextCategoryId()
    stubCall(() => pathResponse(categoryId, 'Marken'))

    const result = await routeCategoryToBi(
      createContext({ categoryListingEnabled: true, categoryFilterField: 'other' }),
      { categoryId }
    )

    assert.deepStrictEqual(Object.keys(result.filters), [NAME_FIELD])
  })

  it('passes through unknown categories', async () => {
    stubCall(() => ({ hits: [] }))
    const context = createContext({ categoryListingEnabled: true })
    const categoryId = nextCategoryId()

    const result = await routeCategoryToBi(context, { categoryId })

    assert.strictEqual(result.categoryId, categoryId)
    assert.strictEqual(context.log.entries[0].level, 'warn')
  })

  it('fails for unknown categories with BatteryIncluded filters', async () => {
    stubCall(() => ({ hits: [] }))
    const filters = { brand: { type: 'multiselect', values: ['BMW'], source: 'BatteryIncluded' } }

    await assert.rejects(
      routeCategoryToBi(createContext({ categoryListingEnabled: true }), { categoryId: nextCategoryId(), filters }),
      /category not found/
    )
  })

  it('passes through a failed lookup on the first page', async () => {
    stubCall(() => { throw new Error('down') })
    const context = createContext({ categoryListingEnabled: true })
    const categoryId = nextCategoryId()

    const result = await routeCategoryToBi(context, { categoryId, offset: 0 })

    assert.strictEqual(result.categoryId, categoryId)
    assert.strictEqual(context.log.entries[0].level, 'error')
  })

  it('fails a failed lookup on later pages or with BatteryIncluded filters', async () => {
    stubCall(() => { throw new Error('down') })
    const context = createContext({ categoryListingEnabled: true })
    const filters = { brand: { type: 'multiselect', values: ['BMW'], source: 'BatteryIncluded' } }

    await assert.rejects(routeCategoryToBi(context, { categoryId: nextCategoryId(), offset: '32' }), /down/)
    await assert.rejects(routeCategoryToBi(context, { categoryId: nextCategoryId(), filters }), /down/)
  })
})
