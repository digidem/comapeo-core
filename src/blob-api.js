import fs from 'node:fs'
import { pipeline } from 'node:stream/promises'
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
   * @param {{ mimeType: string, driveId: string }} metadata
   * @returns {Promise<{ driveId: string, name: string, type: 'photo' | 'video' | 'audio' }>}
   */
  async create(filepaths, metadata) {
    const { original, preview, thumbnail } = filepaths
    const { mimeType } = metadata
    const blobType = getType(mimeType)
    const hash = b4a.alloc(8)
    sodium.randombytes_buf(hash)
    const name = hash.toString('hex')

    await this.writeFile(
      original,
      {
        name: `${name}`,
        variant: 'original',
        type: blobType,
      },
      metadata
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
      driveId: metadata.driveId,
      name,
      type: blobType,
    }
  }

  /**
   * @param {string} filepath
   * @param {Omit<BlobId, 'driveId'>} options
   * @param {object} metadata
   * @param {string} metadata.mimeType
   */
  async writeFile(filepath, { name, variant, type }, metadata) {
    // @ts-ignore TODO: address blobStore.createWriteStream return type
    await pipeline(
      fs.createReadStream(filepath),
      this.blobStore.createWriteStream({ type, variant, name }, { metadata })
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
