export const kGetIcon = Symbol('getIcon')

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
   * @param {object} icon
   * @param {import('@mapeo/schema').IconValue['name']} icon.name
   * @param {Array<Omit<import('@mapeo/schema').IconValue['variants'][number],
   * 'blobVersionId'> & {blob: Buffer}>} icon.variants
   */
  async create(icon) {
    if (icon.variants.length < 1) {
      throw new Error('empty variants array')
    }
    const savedVariants = await Promise.all(
      icon.variants.map(async ({ blob, ...variant }) => {
        const blobVersionId = await this.#dataStore.writeRaw(blob)
        return { ...variant, blobVersionId }
      })
    )
    return await this.#dataType.create({
      schemaName: 'icon',
      name: icon.name,
      // @ts-ignore TODO: remove
      variants: savedVariants,
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
  async [kGetIcon]({ iconId, size, pixelDensity, mimeType }) {
    const iconRecord = await this.#dataType.getByDocId(iconId)
    const iconVariant = getBestVariant(iconRecord.variants, {
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
  async getIconUrl({ iconId, size, pixelDensity }) {
    return `/${this.#projectId}/${iconId}/${size}/${pixelDensity}`
  }
}

/**
 * @param {import('@mapeo/schema').IconValue['variants']} variants
 * @param {object} opts
 * @param {string} [opts.size]
 * @param {number} [opts.pixelDensity]
 * @param {ValidMimeType} [opts.mimeType]
 **/
export function getBestVariant(
  variants,
  { size, pixelDensity, mimeType = 'image/png' }
) {
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
