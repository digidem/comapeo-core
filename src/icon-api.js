export const kGetIconBlob = Symbol('getIcon')

/** @typedef {import('@mapeo/schema').IconValue['variants']} IconVariants */
/** @typedef {IconVariants[number]} IconVariant */

/**
 * @typedef {Object} BitmapOpts
 * @property {Extract<IconVariant['mimeType'], 'image/png'>} mimeType
 * @property {IconVariant['pixelDensity']} pixelDensity
 * @property {IconVariant['size']} size
 *
 * @typedef {Object} SvgOpts
 * @property {Extract<IconVariant['mimeType'], 'image/svg+xml'>} mimeType
 * @property {IconVariant['size']} size
 */

/** @type {{ [mime in IconVariant['mimeType']]: string }} */
const MIME_TO_EXTENSION = {
  'image/png': '.png',
  'image/svg+xml': '.svg',
}

export class IconApi {
  #projectId
  #dataType
  #dataStore
  #getMediaBaseUrl

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
   * @param {string} opts.projectId
   * @param {() => Promise<string>} opts.getMediaBaseUrl
   */
  constructor({ iconDataType, iconDataStore, projectId, getMediaBaseUrl }) {
    this.#dataType = iconDataType
    this.#dataStore = iconDataStore
    this.#projectId = projectId
    this.#getMediaBaseUrl = getMediaBaseUrl
  }

  /**
   * @param {object} icon
   * @param {import('@mapeo/schema').IconValue['name']} icon.name
   * @param {Array<(BitmapOpts | SvgOpts) & { blob: Buffer }>} icon.variants
   *
   * @returns {Promise<string>}
   */
  async create(icon) {
    if (icon.variants.length < 1) {
      throw new Error('empty variants array')
    }

    const savedVariants = await Promise.all(
      icon.variants.map(async ({ blob, ...variant }) => {
        const blobVersionId = await this.#dataStore.writeRaw(blob)

        return {
          ...variant,
          blobVersionId,
          pixelDensity:
            // Pixel density does not apply to svg variants
            // TODO: Ideally @mapeo/schema wouldn't require pixelDensity when the mime type is svg
            variant.mimeType === 'image/svg+xml'
              ? /** @type {const} */ (1)
              : variant.pixelDensity,
        }
      })
    )

    const { docId } = await this.#dataType.create({
      schemaName: 'icon',
      name: icon.name,
      variants: savedVariants,
    })

    return docId
  }

  /**
   * @param {string} iconId
   * @param {BitmapOpts | SvgOpts} opts
   *
   * @returns {Promise<Buffer>}
   */
  async [kGetIconBlob](iconId, opts) {
    const iconRecord = await this.#dataType.getByDocId(iconId)
    const iconVariant = getBestVariant(iconRecord.variants, opts)
    const blob = await this.#dataStore.readRaw(iconVariant.blobVersionId)
    return blob
  }

  /**
   * @param {string} iconId
   * @param {BitmapOpts | SvgOpts} opts
   *
   * @returns {Promise<string>}
   */
  async getIconUrl(iconId, opts) {
    let base = await this.#getMediaBaseUrl()

    if (!base.endsWith('/')) {
      base += '/'
    }

    base += `${this.#projectId}/${iconId}/`

    const mimeExtension = MIME_TO_EXTENSION[opts.mimeType]

    if (opts.mimeType === 'image/svg+xml') {
      return base + `${opts.size}${mimeExtension}`
    }

    return base + `${opts.size}@${opts.pixelDensity}x${mimeExtension}`
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
 *     2. Otherwise prefer closest larger density.
 *
 * @param {IconVariants} variants
 * @param {BitmapOpts | SvgOpts} opts
 */
export function getBestVariant(variants, opts) {
  const { size: wantedSize, mimeType: wantedMimeType } = opts
  // Pixel density doesn't matter for svg so default to 1
  const wantedPixelDensity =
    opts.mimeType === 'image/svg+xml' ? 1 : opts.pixelDensity

  if (variants.length === 0) {
    throw new Error('No variants exist')
  }

  const matchingMime = variants.filter((v) => v.mimeType === wantedMimeType)

  if (matchingMime.length === 0) {
    throw new Error(
      `No variants with desired mime type ${wantedMimeType} exist`
    )
  }

  const wantedSizeNum = SIZE_AS_NUMERIC[wantedSize]

  // Sort the relevant variants based on the desired size and pixel density, using the rules of the preference.
  // Sorted from closest match to furthest match.
  matchingMime.sort((a, b) => {
    const aSizeNum = SIZE_AS_NUMERIC[a.size]
    const bSizeNum = SIZE_AS_NUMERIC[b.size]

    const aSizeDiff = aSizeNum - wantedSizeNum
    const bSizeDiff = bSizeNum - wantedSizeNum

    // Both variants match desired size, use pixel density to determine preferred match
    if (aSizeDiff === 0 && bSizeDiff === 0) {
      // Pixel density doesn't matter for svg but prefer lower for consistent results
      if (opts.mimeType === 'image/svg+xml') {
        return a.pixelDensity <= b.pixelDensity ? -1 : 1
      }

      return determineSortValue(
        wantedPixelDensity,
        a.pixelDensity,
        b.pixelDensity
      )
    }

    return determineSortValue(wantedSizeNum, aSizeNum, bSizeNum)
  })

  // Closest match will be first element
  return matchingMime[0]
}

/**
 * Determines a sort value based on the order of precedence outlined below. Winning value moves closer to front.
 *
 * 1. Exactly match `target`
 * 2. Closest value smaller than `target`
 * 3. Closest value larger than `target`
 *
 * @param {number} target
 * @param {number} a
 * @param {number} b
 *
 * @returns {-1 | 0 | 1}
 */
function determineSortValue(target, a, b) {
  const aDiff = a - target
  const bDiff = b - target

  // Both match exactly, don't change sort order
  if (aDiff === 0 && bDiff === 0) {
    return 0
  }

  // a matches but b doesn't, prefer a
  if (aDiff === 0 && bDiff !== 0) {
    return -1
  }

  // b matches but a doesn't, prefer b
  if (bDiff === 0 && aDiff !== 0) {
    return 1
  }

  // Both are larger than desired, prefer smaller of the two
  if (aDiff > 0 && bDiff > 0) {
    return a < b ? -1 : 1
  }

  // Both are smaller than desired, prefer larger of the two
  if (aDiff < 0 && bDiff < 0) {
    return a < b ? 1 : -1
  }

  // Mix of smaller and larger than desired, prefer smaller of the two
  return a < b ? -1 : 1
}
