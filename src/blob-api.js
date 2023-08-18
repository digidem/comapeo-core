import fs from 'fs'
import sodium from 'sodium-universal'
import b4a from 'b4a'

/** @typedef {import('./types.js').BlobId} BlobId */
/** @typedef {import('./types.js').BlobType} BlobType  */
/** @typedef {import('./types.js').BlobVariant<BlobType>} BlobVariant  */

export class BlobApi {
  /**
   * @param {object} options
   * @param {string} options.projectId
   */
  constructor({ projectId }) {
    this.projectId = projectId
  }

  /**
   * Get a url for a blob based on its BlobId
   * @param {import('./types.js').BlobId} blobId
   * @returns {String}
   */
  getUrl(blobId) {
    const { driveId, type, variant, name } = blobId
    return `http:///127.0.0.1/${this.projectId}/${driveId}/${type}/${variant}/${name}`
  }

  /**
   * Write blobs for provided variants of a file
   * @param {{ original: string, preview?: string, thumbnail?: string }} filepaths
   * @param {{ mimeType: string }} metadata
   * @returns {Promise<{ original: Omit<BlobId, 'driveId'>, preview?: Omit<BlobId, 'driveId'>, thumbnail?: Omit<BlobId, 'driveId'> }>}
   */
  async create(filepaths, metadata) {
    const { original, preview, thumbnail } = filepaths
    const { mimeType } = metadata
    const blobType = getType(mimeType)
    const hash = b4a.alloc(sodium.crypto_generichash_BYTES)
    sodium.crypto_generichash(hash, b4a.from(original))

    const originalBlobId = await writeFile({
      name: hash,
      variant: 'original',
      type: blobType,
    })
    const previewBlobId = preview
      ? await writeFile({ name: hash, variant: 'preview', type: blobType })
      : null
    const thumbnailBlobId = thumbnail
      ? await writeFile({
          name: hash,
          variant: 'thumbnail',
          type: blobType,
        })
      : null

    const blobIds =
      /** @type {{ original: Omit<BlobId, 'driveId'>, preview?: Omit<BlobId, 'driveId'>, thumbnail?: Omit<BlobId, 'driveId'> }} */ ({
        original: originalBlobId,
      })

    if (previewBlobId) blobIds.preview = previewBlobId
    if (thumbnailBlobId) blobIds.thumbnail = thumbnailBlobId

    return blobIds

    /**
     * @param {Omit<BlobId, 'driveId'>} options
     * @returns {Promise<Omit<BlobId, 'driveId'>>}
     */
    function writeFile({ name, variant, type }) {
      return new Promise((resolve, reject) => {
        fs.createReadStream(name)
          .pipe(
            this.createWriteStream(
              { type, variant, name },
              { metadata: { mimeType } }
            )
          )
          .on('error', reject)
          .on('finish', () => {
            resolve({ type, variant, name })
          })
      })
    }
  }
}

/**
 * @param {string} mimeType
 * @returns {BlobType}
 */
function getType(mimeType) {
  if (mimeType.startsWith('image')) return 'photo'
  if (mimeType.startsWith('video')) return 'video'
  if (mimeType.startsWith('audio')) return 'audio'

  throw new Error(`Unsupported mimeType: ${mimeType}`)
}
