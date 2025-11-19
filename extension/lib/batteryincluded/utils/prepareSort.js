/**
 * Maps a sort key to the corresponding BatteryIncluded sort expression.
 *
 * @param {string} sort - Input sort identifier.
 * @returns {string|undefined} The mapped sort expression or undefined for unknown or empty keys.
 */
function prepareSort(sort) {
  if (!sort) return undefined;

  const mapping = {
    priceAsc: '_product.price:asc',
    priceDesc: '_product.price:desc',
    nameAsc: '_product_i18n.name:asc',
    nameDesc: '_product_i18n.name:desc',
  };

  return mapping[sort];
}

module.exports = prepareSort;
