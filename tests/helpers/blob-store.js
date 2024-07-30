// @ts-nocheck
import { pipelinePromise as pipeline, Writable } from 'streamx'

import { BlobStore } from '../../src/blob-store/index.js'
import { createCoreManager } from './core-manager.js'
/** @typedef {import('../../src/blob-api.js').Metadata} Metadata */

/**
 * @param {Object} [opts]
 * @param {Buffer} [opts.projectKey]
 */
export function createBlobStore(opts) {
  const coreManager = createCoreManager(opts)
  const blobStore = new BlobStore({ coreManager })
  return { blobStore, coreManager }
}

/**
 * @param {*} rs
 * @returns {Promise<Buffer>}
 */
export async function concat(rs) {
  let buf = null
  await pipeline(
    rs,
    new Writable({
      write(data, cb) {
        if (buf) buf = data.concat(buf)
        else buf = data
        return cb(null)
      },
    })
  )
  return buf
}

/**
 * @param {Partial<Metadata>} overrides
 * @returns {Metadata}
 */
export const blobMetadata = (overrides) => ({
  mimeType: 'image/png',
  timestamp: Date.now(),
  location: {
    coords: {
      accuracy: 3,
      altitude: 8848,
      altitudeAccuracy: 3,
      heading: 180,
      latitude: 27.988333,
      longitude: 86.925278,
      speed: 0,
    },
    timestamp: Date.now(),
  },
  ...overrides,
})
