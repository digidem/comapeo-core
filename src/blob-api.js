import fs from 'node:fs'
// @ts-expect-error - pipelinePromise missing from streamx types
import { Transform, pipelinePromise as pipeline } from 'streamx'
import { createHash, randomBytes } from 'node:crypto'
import { Type as T } from '@sinclair/typebox'
import { Value } from '@sinclair/typebox/value'
/** @import { BlobId, BlobType } from './types.js' */

const LocationObjectCoordsSchema = T.Object({
  accuracy: T.Union([T.Number(), T.Null()]),
  altitude: T.Union([T.Number(), T.Null()]),
  altitudeAccuracy: T.Union([T.Number(), T.Null()]),
  heading: T.Union([T.Number(), T.Null()]),
  latitude: T.Number(),
  longitude: T.Number(),
  speed: T.Union([T.Number(), T.Null()]),
})

const LocationObjectSchema = T.Object({
  coords: LocationObjectCoordsSchema,
  mocked: T.Optional(T.Boolean()),
  timestamp: T.Number(),
})

const MetadataSchema = T.Object({
  mimeType: T.String(),
  timestamp: T.Number(),
  location: T.Optional(LocationObjectSchema),
})

/**
 * @import {Static} from '@sinclair/typebox'
 *
 * @typedef {Static<typeof LocationObjectCoordsSchema>} LocationObjectCoords
 * @typedef {Static<typeof LocationObjectSchema>} LocationObject
 * @typedef {Static<typeof MetadataSchema>} Metadata
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
   * @param {BlobId} blobId
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
   * Get metadata for a blob based on its BlobId
   * @param {BlobId} blobId
   * @returns {Promise<Metadata|null>}
   */
  async getMetadata(blobId) {
    const entry = await this.#blobStore.entry(blobId)

    if (entry === null) {
      return null
    }

    const metadata = entry.value.metadata

    if (metadata === null) {
      return null
    }

    if (!Value.Check(MetadataSchema, metadata)) {
      return null
    }

    return metadata
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
