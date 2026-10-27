/**
 * Validates whether a value represents a well-formed dot-notation path.
 *
 * @param {unknown} path - Value to validate.
 * @returns {boolean} True if the value is a valid dot-notation path; otherwise false.
 */
function isValidPathSyntax (path) {
  if (typeof path !== 'string') return false
  const p = path.trim()
  if (p.length === 0 || p.startsWith('.') || p.endsWith('.')) return false
  return p.split('.').every(seg => seg.trim() !== '' && seg === seg.trim())
}

/**
 * Resolves a nested value from an object using a dot-notation path.
 *
 * @param {unknown} obj - Root value to traverse.
 * @param {string} path - Dot-notation path describing the property chain.
 * @returns {unknown} The resolved value, or `undefined` if the path cannot be followed.
 */
function getByPath (obj, path) {
  if (typeof path !== 'string' || path.trim() === '') return undefined
  return path.trim().split('.').reduce(
    (acc, key) => (acc == null ? undefined : acc[key]),
    obj
  )
}

function getParentDocument (hit) {
  const document = hit && hit.document
  const groupingKey = getByPath(document, '_common.grouping.groupingKey')
  if (!groupingKey || !Array.isArray(hit.grouped)) return document

  const parent = hit.grouped
    .map(group => group && group.document)
    .find(doc => getByPath(doc, '_product.productNumber.0') === groupingKey)

  return parent || document
}

function extractProductIds (hits, identifierPath) {
  const ids = (Array.isArray(hits) ? hits : [])
    .map(hit => getByPath(getParentDocument(hit), identifierPath))
    .filter(id => id !== undefined && id !== null)

  return [...new Set(ids)]
}

module.exports = {
  isValidPathSyntax,
  getByPath,
  extractProductIds
}
