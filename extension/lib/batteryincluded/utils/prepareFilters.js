/**
 * Converts cent-based values to standard units.
 *
 * @param {number} v - Numeric value.
 * @returns {number} Converted value.
 */
const convert = v => (v >= 100 ? v / 100 : v)

/**
 * Converts internal filter definitions into BatteryIncluded-compatible
 * query parameters.
 *
 * - range:       Produces f[field][from] / f[field][till]
 * - multiselect: Produces f[field][]=value
 *
 * @param {Object} filters Mapping of BI field names to filter objects.
 * @returns {Object} Flat query param object ready for BI API calls.
 */
function prepareFilters (filters = {}) {
  if (!filters || typeof filters !== 'object') return {}

  return Object.entries(filters).reduce((acc, [fieldName, f]) => {
    if (!f || typeof f !== 'object') return acc
    if (f.source === 'categories') return acc

    if (f.type === 'range') {
      const { minimum, maximum } = f
      if (typeof minimum !== 'number' || typeof maximum !== 'number') return acc

      acc[`f[${fieldName}][from]`] = Number(convert(minimum).toFixed(2))
      acc[`f[${fieldName}][till]`] = Number(convert(maximum).toFixed(2))
    }

    if (f.type === 'multiselect') {
      const values = Array.isArray(f.values)
        ? f.values.filter(v => v != null && v !== '')
        : []

      if (values.length) acc[`f[${fieldName}][]`] = values
    }

    return acc
  }, {})
}

module.exports = prepareFilters
