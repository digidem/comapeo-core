import fs from 'node:fs'
import { pipeline } from 'node:stream/promises'
import { createHash } from 'node:crypto'
import sodium from 'sodium-universal'
import b4a from 'b4a'

/** @typedef {import('./types.js').BlobId} BlobId */
/** @typedef {import('./types.js').BlobType} BlobType  */

export class BlobApi {
  #blobStore
  #getMediaBaseUrl
  #projectId

  /**
   * @param {object} options
   * @param {string} options.projectId
   * @param {import('./blob-store/index.js').BlobStore} options.blobStore
   * @param {() => Promise<string>} options.getMediaBaseUrl
   */
  constructor({ projectId, blobStore, getMediaBaseUrl }) {
    this.#blobStore = blobStore
    this.#getMediaBaseUrl = getMediaBaseUrl
    this.#projectId = projectId
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

    return base + `${this.#projectId}/${driveId}/${type}/${variant}/${name}`
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
    const blobType = getType(mimeType)
    const hash = b4a.alloc(8)
    sodium.randombytes_buf(hash)
    const name = hash.toString('hex')

    const contentHash = createHash('sha256')

    await this.writeFile(
      original,
      {
        name: `${name}`,
        variant: 'original',
        type: blobType,
      },
      metadata,
      contentHash
    )

    if (preview) {
      await this.writeFile(
        preview,
        {
          name: `${name}`,
          variant: 'preview',
          type: blobType,
        },
        metadata
      )
    }

    if (thumbnail) {
      await this.writeFile(
        thumbnail,
        {
          name: `${name}`,
          variant: 'thumbnail',
          type: blobType,
        },
        metadata
      )
    }

    return {
      driveId: this.#blobStore.writerDriveId,
      name,
      type: blobType,
      hash: contentHash.digest('hex'),
    }
  }

  /**
   * @param {string} filepath
   * @param {Omit<BlobId, 'driveId'>} options
   * @param {object} metadata
   * @param {string} metadata.mimeType
   * @param {import('node:crypto').Hash} [hash]
   */
  async writeFile(filepath, { name, variant, type }, metadata, hash) {
    if (hash) {
      // @ts-ignore TODO: return value types don't match pipeline's expectations, though they should
      await pipeline(
        fs.createReadStream(filepath),
        hash,

        // @ts-ignore TODO: remove driveId property from createWriteStream
        this.#blobStore.createWriteStream({ type, variant, name }, { metadata })
      )

      return { name, variant, type, hash }
    }

    // @ts-ignore TODO: return value types don't match pipeline's expectations, though they should
    await pipeline(
      fs.createReadStream(filepath),
      this.#blobStore.createWriteStream({ type, variant, name }, { metadata })
    )

    return { name, variant, type }
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
