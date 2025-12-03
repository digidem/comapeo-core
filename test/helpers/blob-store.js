// @ts-nocheck
import { pipelinePromise as pipeline, Writable } from 'streamx'

import { BlobStore } from '../../src/blob-store/index.js'
import { createCoreManager } from './core-manager.js'

/** @import { Metadata } from '../../src/blob-api.js' */

/**
 * @param {import('node:test').TestContext} t
 * @param {Object} [opts]
 * @param {Buffer} [opts.projectKey]
 */
export function createBlobStore(t, opts) {
  const coreManager = createCoreManager(t, opts, false)
  const blobStore = new BlobStore({ coreManager })

  t.after(async () => {
    await blobStore.close()
    await coreManager.close()
  })
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
