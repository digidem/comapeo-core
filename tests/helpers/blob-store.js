import { replicate } from './core-manager.js'
import { pipelinePromise as pipeline, Writable } from 'streamx'

/**
 *
 * @param {import('../../src/core-manager/index.js').CoreManager} cm1
 * @param {import('../../src/core-manager/index.js').CoreManager} cm2
 */
export function replicateBlobs(cm1, cm2) {
  cm1.addCore(cm2.getWriterCore('blobIndex').key, 'blobIndex')
  cm2.addCore(cm1.getWriterCore('blobIndex').key, 'blobIndex')
  const {
    rsm: [rsm1, rsm2],
    destroy,
  } = replicate(cm1, cm2)
  rsm1.enableNamespace('blobIndex')
  rsm1.enableNamespace('blob')
  rsm2.enableNamespace('blobIndex')
  rsm2.enableNamespace('blob')
  return {
    rsm: /** @type {const} */ ([rsm1, rsm2]),
    destroy,
  }
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
