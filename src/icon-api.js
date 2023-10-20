export const kCreate = Symbol('create')
export const kGetIcon = Symbol('getIcon')
export const kGetBestVariant = Symbol('getBestVariant')
export const kGetIconUrl = Symbol('getIconUrl')

export default class IconApi {
  #projectId
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
   * @param {string} [opts.projectId]
   */
  constructor({ iconDataType, iconDataStore, projectId }) {
    this.#dataType = iconDataType
    this.#dataStore = iconDataStore
    this.#projectId = projectId
  }

  /**
   * @param {Omit<import('@mapeo/schema').IconValue, 'variants'> &
   * {variants: Array<
   *    import('@mapeo/schema/dist/proto/icon/v1.js').Icon_1_IconVariant
   *    & {blob: Buffer}>}} icon
   */
  async [kCreate](icon) {
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

  /** @typedef {'image/png' | 'image/svg+xml'} ValidMimeType */

  /**
   * @param {Object} opts
   * @param {String} opts.iconId
   * @param {String} [opts.size]
   * @param {number} [opts.pixelDensity]
   * @param {ValidMimeType} [opts.mimeType]
   */
  async [kGetIcon]({ iconId, size, pixelDensity, mimeType = 'image/png' }) {
    const iconRecord = await this.#dataType.getByDocId(iconId)
    const iconVariant = this[kGetBestVariant](iconRecord.variants, {
      size,
      pixelDensity,
      mimeType,
    })
    const blob = await this.#dataStore.readRaw(iconVariant.blobVersionId)
    return { icon: blob, mimeType: iconVariant.mimeType }
  }

  /**
   * @param {Object} opts
   * @param {String} opts.iconId
   * @param {String} [opts.size]
   * @param {number} [opts.pixelDensity]
   * @param {ValidMimeType} [opts.mimeType]
   */
  async [kGetIconUrl]({ iconId, size, pixelDensity }) {
    return `/${this.#projectId}/${iconId}/${size}/${pixelDensity}`
  }

  /** @typedef {{
   * mimeType: ValidMimeType,
   * size: string,
   * pixelDensity: number,
   * score: number
   * }} IconVariant */

  /**
   * @param {import('@mapeo/schema').IconValue['variants']} variants
   * @param {object} opts
   * @param {string} [opts.size]
   * @param {number} [opts.pixelDensity]
   * @param {ValidMimeType} [opts.mimeType]
   **/
  [kGetBestVariant](variants, { size, pixelDensity, mimeType }) {
    let variantsScore = []
    const matchingMimeType = variants.filter(
      (variant) => variant.mimeType === mimeType
    )

    // only allow matching mimeType
    if (matchingMimeType.length === 0) {
      throw new Error('no matching mimeType for icon')
    }

    // score each variant
    for (let i = 0; i < matchingMimeType.length; i++) {
      const variant = matchingMimeType[i]
      variantsScore[i] = 0
      if (variant.pixelDensity === pixelDensity) {
        variantsScore[i]++
      }
      if (variant.size === size) {
        variantsScore[i]++
      }
    }

    // find variant with best score, tie break choosing the first one
    const bestVariantIdx = variantsScore.reduce(
      ({ bestIdx, bestScore }, score, idx) => {
        const oldBest = { bestIdx, bestScore }
        const possibleNewBest = { bestIdx: idx, bestScore: score }
        // new is best
        if (score > bestScore) {
          return possibleNewBest
          // tie break
        } else if (score === bestScore) {
          return oldBest
        } else {
          return oldBest
        }
      },
      { bestIdx: -1, bestScore: -1 }
    )
    return matchingMimeType[bestVariantIdx.bestIdx]
  }
}
