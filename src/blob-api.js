import fs from 'node:fs'
import { basename } from 'node:path'
import sodium from 'sodium-universal'
import b4a from 'b4a'

import { getPort } from './blob-server/index.js'

/** @typedef {import('./types.js').BlobId} BlobId */
/** @typedef {import('./types.js').BlobType} BlobType  */
/** @typedef {import('./types.js').BlobVariant<BlobType>} BlobVariant  */

export class BlobApi {
  /**
   * @param {object} options
   * @param {string} options.projectId
   * @param {import('./blob-store/index.js').BlobStore} options.blobStore
   * @param {import('fastify').FastifyInstance} options.blobServer
   */
  constructor({ projectId, blobStore, blobServer }) {
    this.projectId = projectId
    this.blobStore = blobStore
    this.blobServer = blobServer
  }

  /**
   * Get a url for a blob based on its BlobId
   * @param {import('./types.js').BlobId} blobId
   * @returns {Promise<string>}
   */
  async getUrl(blobId) {
    const { driveId, type, variant, name } = blobId
    const port = await getPort(this.blobServer.server)
    return `http://127.0.0.1:${port}/${this.projectId}/${driveId}/${type}/${variant}/${name}`
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
    const hash = b4a.alloc(8)
    sodium.randombytes_buf(hash)
    const name = hash.toString('hex')

    const originalBlobId = await this.writeFile(
      original,
      {
        name: `${name}_${basename(original)}`,
        variant: 'original',
        type: blobType,
      },
      metadata
    )
    const previewBlobId = preview
      ? await this.writeFile(
          preview,
          {
            name: `${name}_${basename(preview)}`,
            variant: 'preview',
            type: blobType,
          },
          metadata
        )
      : null
    const thumbnailBlobId = thumbnail
      ? await this.writeFile(
          thumbnail,
          {
            name: `${name}_${basename(thumbnail)}`,
            variant: 'thumbnail',
            type: blobType,
          },
          metadata
        )
      : null

    const blobIds =
      /** @type {{ original: Omit<BlobId, 'driveId'>, preview?: Omit<BlobId, 'driveId'>, thumbnail?: Omit<BlobId, 'driveId'> }} */ ({
        original: originalBlobId,
      })

    if (previewBlobId) blobIds.preview = previewBlobId
    if (thumbnailBlobId) blobIds.thumbnail = thumbnailBlobId

    return blobIds
  }

  /**
   * @param {Omit<BlobId, 'driveId'>} options
   * @returns {Promise<Omit<BlobId, 'driveId'>>}
   */
  async writeFile(filepath, { name, variant, type }, metadata) {
    return new Promise((resolve, reject) => {
      fs.createReadStream(filepath)
        .pipe(
          this.blobStore.createWriteStream(
            { type, variant, name },
            { metadata }
          )
        )
        .on('error', reject)
        .on('finish', () => {
          resolve({ type, variant, name })
        })
    })
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
