/**
 * @param {PipelineContext} context - Contains config
 * @returns {{ catalogService: string }} The configured catalog service identifier.
 */
module.exports = async (context) => {
  return {
    catalogService: context.config.catalogService
  }
}
