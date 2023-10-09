export default class IconApi {
  #dataType
  #dataStore

  /**
   * @param {Object} opts
   * @param {import('./datatype/index.js').DataType<
   *   import('./datastore/index.js').DataStore<'config'>,
   *   typeof import('./schema/project.js').iconTable,
   *   'icon',
   *   import('@mapeo/schema').Icon,
   *   import('@mapeo/schema').IconValue
   * >} opts.iconDataType
   * @param {import('./datastore/index.js').DataStore<'config'>} opts.iconDataStore
   */
  constructor({ iconDataType, iconDataStore }) {
    this.#dataType = iconDataType
    this.#dataStore = iconDataStore
  }

  /**
   * @param {Omit<import('@mapeo/schema').IconValue, 'variants'> &
   * {variants: Array<
   *    import('@mapeo/schema/dist/proto/icon/v1.js').Icon_1_IconVariant
   *    & {blob: Buffer}>}} icon
   */
  async create(icon) {
    if (icon.variants.length < 1) {
      throw new Error('empty variants array')
    }
    const blobsIds = await Promise.all(
      icon.variants.map(({ blob }) => {
        return this.#dataStore.writeRaw(blob)
      })
    )
    const variantsWithId = icon.variants.map((variant, i) => {
      // eslint-disable-next-line no-unused-vars
      const { blob, ...variantWithoutBlob } = variant
      return { ...variantWithoutBlob, blobVersionId: blobsIds[i] }
    })
    return await this.#dataType.create({
      schemaName: 'icon',
      name: icon.name,
      // @ts-ignore TODO: remove
      variants: variantsWithId,
    })
  }

  /**
   * @param {Object} opts
   * @param {String} opts.iconId
   * @param {String} opts.size
   * @param {number} opts.pixelDensity
   */
  async getIcon({ iconId, size, pixelDensity }) {
    const iconRecord = await this.#dataType.getByDocId(iconId)
    const iconVariant = this.#getBestVariant(iconRecord.variants, {
      size,
      pixelDensity,
    })
    return await this.#dataStore.readRaw(iconVariant.blobVersionId)
  }

  /**
   * @param {import('@mapeo/schema').IconValue['variants']} variants
   * @param {object} opts
   * @param {string} opts.size
   * @param {number} opts.pixelDensity
   **/
  #getBestVariant(variants, { size, pixelDensity }) {
    console.log(size, pixelDensity)
    // TODO
    return variants[0]
  }
}
