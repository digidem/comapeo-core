import fs from 'node:fs'
// @ts-ignore - pipelinePromise missing from streamx types
import { Transform, pipelinePromise as pipeline } from 'streamx'
import { createHash, randomBytes } from 'node:crypto'

/** @typedef {import('./types.js').BlobId} BlobId */
/** @typedef {import('./types.js').BlobType} BlobType  */

export class BlobApi {
  #blobStore
  #getMediaBaseUrl

  /**
   * @param {object} options
   * @param {import('./blob-store/index.js').BlobStore} options.blobStore
   * @param {() => Promise<string>} options.getMediaBaseUrl
   */
  constructor({ blobStore, getMediaBaseUrl }) {
    this.#blobStore = blobStore
    this.#getMediaBaseUrl = getMediaBaseUrl
  }

  /**
   * Get a url for a blob based on its BlobId
   * @param {import('./types.js').BlobId} blobId
   * @returns {Promise<string>}
   */
  async getUrl(blobId) {
    const { driveId, type, variant, name } = blobId

    let base = await this.#getMediaBaseUrl()

    if (!base.endsWith('/')) {
      base += '/'
    }

    return base + `${driveId}/${type}/${variant}/${name}`
  }

  /**
   * Write blobs for provided variants of a file
   * @param {{ original: string, preview?: string, thumbnail?: string }} filepaths
   * @param {{ mimeType: string }} metadata
   * @returns {Promise<{ driveId: string, name: string, type: 'photo' | 'video' | 'audio', hash: string }>}
   */
  async create(filepaths, metadata) {
    const { original, preview, thumbnail } = filepaths
    const { mimeType } = metadata
    const type = getType(mimeType)
    const name = randomBytes(8).toString('hex')
    const hash = createHash('sha256')

    const ws = this.#blobStore.createWriteStream(
      { type, variant: 'original', name },
      { metadata }
    )
    const writePromises = [
      pipeline(fs.createReadStream(original), hashTransform(hash), ws),
    ]

    if (preview) {
      const ws = this.#blobStore.createWriteStream(
        { type, variant: 'preview', name },
        { metadata }
      )
      writePromises.push(pipeline(fs.createReadStream(preview), ws))
    }

    if (thumbnail) {
      const ws = this.#blobStore.createWriteStream(
        { type, variant: 'thumbnail', name },
        { metadata }
      )
      writePromises.push(pipeline(fs.createReadStream(thumbnail), ws))
    }

    await Promise.all(writePromises)

    return {
      driveId: this.#blobStore.writerDriveId,
      name,
      type,
      hash: hash.digest('hex'),
    }
  }
}

/**
 * @param {import('node:crypto').Hash} hash
 */
function hashTransform(hash) {
  return new Transform({
    transform: (data, cb) => {
      hash.update(data)
      cb(null, data)
    },
  })
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
