export const kGetIcon = Symbol('getIcon')

/** @typedef {import('@mapeo/schema').IconValue['variants']} IconVariants */
/** @typedef {IconVariants[number]} IconVariant */

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
   * @param {Array<Omit<IconVariant, 'blobVersionId'> & { blob: Buffer }>} icon.variants
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
    return this.#dataType.create({
      schemaName: 'icon',
      name: icon.name,
      variants: savedVariants,
    })
  }

  /**
   * @param {Object} opts
   * @param {string} opts.iconId
   * @param {IconVariant['size']} opts.size
   * @param {IconVariant['pixelDensity']} opts.pixelDensity
   * @param {IconVariant['mimeType']} opts.mimeType
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
   * @param {string} opts.iconId
   * @param {string} opts.size
   * @param {number} opts.pixelDensity
   */
  getIconUrl({ iconId, size, pixelDensity }) {
    return `/${this.#projectId}/${iconId}/${size}/${pixelDensity}`
  }
}

/**
 * @type {Record<IconVariant['size'], number>}
 */
const SIZE_AS_NUMERIC = {
  small: 1,
  medium: 2,
  large: 3,
}

/**
 * Given a list of icon variants returns the variant that most closely matches the desired parameters.
 * Rules, in order of precedence:
 *
 * 1. Matching mime type (throw if no matches)
 * 2. Matching size. If no exact match:
 *     1. If smaller ones exist, prefer closest smaller size.
 *     2. Otherwise prefer closest larger size.
 * 3. Matching pixel density. If no exact match:
 *     1. If smaller ones exist, prefer closest smaller density.
 *     2. Otherwise Prefer closest larger density.
 *
 * @param {IconVariants} variants
 * @param {object} opts
 * @param {IconVariant['size']} opts.size
 * @param {number} opts.pixelDensity
 * @param {IconVariant['mimeType']} opts.mimeType
 */
export function getBestVariant(variants, { size, pixelDensity, mimeType }) {
  if (variants.length === 0) {
    throw new Error('No variants exist')
  }

  const matchingMime = variants.filter((v) => v.mimeType === mimeType)

  if (matchingMime.length === 0) {
    throw new Error(`No variants with desired mime type ${mimeType} exist`)
  }

  // Sort the relevant variants based on the desired size and pixel density, using the rules of the preference.
  // Sorted from closest match to furthest match.
  matchingMime.sort((a, b) => {
    const aSizeNum = SIZE_AS_NUMERIC[a.size]
    const bSizeNum = SIZE_AS_NUMERIC[b.size]

    const aSizeDiff = aSizeNum - SIZE_AS_NUMERIC[size]
    const bSizeDiff = bSizeNum - SIZE_AS_NUMERIC[size]

    // Both variants match desired size, use pixel density to determine preferred match
    if (aSizeDiff === 0 && bSizeDiff === 0) {
      const aPixelDensityDiff = a.pixelDensity - pixelDensity
      const bPixelDensityDiff = b.pixelDensity - pixelDensity

      // Both have desired pixel density so don't change sort order
      if (aPixelDensityDiff === 0 && bPixelDensityDiff === 0) {
        return 0
      }

      // Both are larger than desired density, prefer smaller of the two
      if (aPixelDensityDiff > 0 && bPixelDensityDiff > 0) {
        return a.pixelDensity < b.pixelDensity ? -1 : 1
      }

      // Both are smaller than desired density, prefer larger of the two
      if (aPixelDensityDiff < 0 && bPixelDensityDiff < 0) {
        return a.pixelDensity < b.pixelDensity ? 1 : -1
      }

      // a matches in pixel density but b doesn't, prefer a
      if (aPixelDensityDiff === 0 && bPixelDensityDiff !== 0) {
        return -1
      }

      // b matches in pixel density but a doesn't, prefer b
      if (bPixelDensityDiff === 0 && aPixelDensityDiff !== 0) {
        return 1
      }

      // Mix of smaller and larger than desired density, prefer smaller of the two
      return a.pixelDensity < b.pixelDensity ? -1 : 1
    }

    // a matches in size but b doesn't, prefer a
    if (aSizeDiff === 0 && bSizeDiff !== 0) {
      return -1
    }

    // b matches in size but a doesn't, prefer b
    if (bSizeDiff === 0 && aSizeDiff !== 0) {
      return 1
    }

    // Both are larger than desired size, prefer smaller of the two
    if (aSizeDiff > 0 && bSizeDiff > 0) {
      return aSizeNum < bSizeNum ? -1 : 1
    }

    // Both are smaller than desired size, prefer larger of the two
    if (aSizeDiff < 0 && bSizeDiff < 0) {
      return aSizeNum < bSizeNum ? 1 : -1
    }

    // Mix of smaller and larger than desired size, prefer smaller of the two
    return aSizeNum < bSizeNum ? -1 : 1
  })

  // Closest match will be first element
  return matchingMime[0]
}
