/**
 * This is a more generic version of the BlobFilter type that can filter unknown
 * blob types and variants from the blob store.
 *
 * @typedef {{ [type: string]: readonly string[] }} GenericBlobFilter
 */

import { Transform } from 'node:stream'

/**
 * @param {GenericBlobFilter} filter
 * @param {string} filePath
 * @returns {boolean}
 */
export function filePathMatchesFilter(filter, filePath) {
  const pathParts = filePath.split('/', 4)
  const [shouldBeEmpty, type, variant] = pathParts

  if (typeof shouldBeEmpty !== 'string' || shouldBeEmpty) return false

  if (!type) return false
  if (!Object.hasOwn(filter, type)) return false

  const allowedVariants = filter[type] ?? []
  if (allowedVariants.length === 0) {
    return pathParts.length >= 3
  } else {
    return (
      pathParts.length >= 4 &&
      typeof variant === 'string' &&
      allowedVariants.includes(variant)
    )
  }
}

/** @type {import("../types.js").BlobStoreEntriesStream} */
export class FilterEntriesStream extends Transform {
  #isIncludedInFilter
  /** @param {GenericBlobFilter} filter */
  constructor(filter) {
    super({ objectMode: true })
    this.#isIncludedInFilter = filePathMatchesFilter.bind(null, filter)
  }
  /**
   * @param {import("hyperdrive").HyperdriveEntry} entry
   * @param {Parameters<Transform['_transform']>[1]} _
   * @param {Parameters<Transform['_transform']>[2]} callback
   */
  _transform(entry, _, callback) {
    const { key: filePath } = entry
    if (this.#isIncludedInFilter(filePath)) this.push(entry)
    callback()
  }
}
