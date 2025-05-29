// @ts-nocheck
import { pipelinePromise as pipeline, Writable } from 'streamx'

import { BlobStore } from '../../src/blob-store/index.js'
import { createCoreManager } from './core-manager.js'

/** @import { Metadata } from '../../src/blob-api.js' */

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
