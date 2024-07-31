import fs from 'node:fs'
// @ts-expect-error - pipelinePromise missing from streamx types
import { Transform, pipelinePromise as pipeline } from 'streamx'
import { createHash, randomBytes } from 'node:crypto'

/** @typedef {import('./types.js').BlobId} BlobId */
/** @typedef {import('./types.js').BlobType} BlobType  */

/**
 * Location coordinate data. Based on [Expo's `LocationObjectCoords`][0].
 * [0]: https://docs.expo.dev/versions/latest/sdk/location/#locationobjectcoords
 *
 * @typedef {object} LocationObjectCoords
 * @prop {number | null} accuracy
 * @prop {number | null} altitude
 * @prop {number | null} altitudeAccuracy
 * @prop {number | null} heading
 * @prop {number} latitude
 * @prop {number} longitude
 * @prop {number | null} speed
 */

/**
 * Location metadata for a blob. Based on [Expo's `LocationObject`][0].
 * [0]: https://docs.expo.dev/versions/latest/sdk/location/#locationobject
 *
 * @typedef {object} LocationObject
 * @prop {LocationObjectCoords} coords
 * @prop {boolean} [mocked]
 * @prop {number} timestamp
 */

/**
 * @typedef {object} Metadata
 * @prop {string} mimeType
 * @prop {number} timestamp
 * @prop {LocationObject} [location]
 */

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
   * @param {Metadata} metadata
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
