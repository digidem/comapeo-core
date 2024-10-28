/**
 * This is a more generic version of the BlobFilter type that can filter unknown
 * blob types and variants from the blob store.
 *
 * @typedef {{ [type: string]: readonly string[] }} GenericBlobFilter
 */

import { Transform } from 'node:stream'

/**
 * Convert a filter to an array of path prefixes that match the filter. These
 * path prefixes can be used to filter entries by
 * `entry.key.startsWith(pathPrefix)`.
 *
 * @param {GenericBlobFilter} filter
 * @returns {readonly string[]} array of folders that match the filter
 */
export function pathPrefixesFromFilter(filter) {
  const pathPrefixes = []
  for (const [type, variants] of Object.entries(filter)) {
    const dedupedVariants = new Set(variants)
    for (const variant of dedupedVariants) {
      pathPrefixes.push(`/${type}/${variant}/`)
    }
  }
  return filterSubfoldersAndDuplicates(pathPrefixes)
}

/** @type {import("../types.js").BlobStoreEntriesStream} */
export class FilterEntriesStream extends Transform {
  #pathPrefixes
  /** @param {GenericBlobFilter} filter */
  constructor(filter) {
    super({ objectMode: true })
    this.#pathPrefixes = pathPrefixesFromFilter(filter)
  }
  /**
   * @param {import("hyperdrive").HyperdriveEntry} entry
   * @param {Parameters<Transform['_transform']>[1]} _
   * @param {Parameters<Transform['_transform']>[2]} callback
   */
  _transform(entry, _, callback) {
    const { key: filePath } = entry
    const isIncludedInFilter = this.#pathPrefixes.some((pathPrefix) =>
      filePath.startsWith(pathPrefix)
    )
    if (isIncludedInFilter) this.push(entry)
    callback()
  }
}

/**
 * Take an array of folders, remove any folders that are duplicates or subfolders of another
 *
 * @param {readonly string[]} folders
 * @returns {readonly string[]}
 */
function filterSubfoldersAndDuplicates(folders) {
  /** @type {Set<string>} */
  const filtered = new Set()
  for (let i = 0; i < folders.length; i++) {
    const isSubfolderOfAnotherFolder = !!folders.find((folder, index) => {
      if (index === i) return false
      // Deduping is done by the Set, if we do it here we don't get either
      if (folder === folders[i]) return true
      return folders[i].startsWith(folder)
    })
    if (!isSubfolderOfAnotherFolder) filtered.add(folders[i])
  }
  return Array.from(filtered)
}
