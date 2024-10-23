import SubEncoder from 'sub-encoder'
import mergeStreams from '@sindresorhus/merge-streams'
import { Transform } from 'node:stream'

/** @import Hyperdrive from 'hyperdrive' */

/**
 * We treat the return type of `createEntriesStream` as a Readable, because the
 * `add` and `remove` methods should not be used outside this module.
 * @typedef {import('type-fest').Tagged<import('node:stream').Readable, 'entriesStream'>} EntriesStream
 */

const keyEncoding = new SubEncoder('files', 'utf-8')
const kAddDrive = Symbol('add-drive')

/**
 * @param {EntriesStream} entriesStream
 * @param {Hyperdrive} drive
 */
export function addDrive(entriesStream, drive) {
  // @ts-expect-error
  entriesStream[kAddDrive](drive)
}

/**
 *
 * @param {Array<Hyperdrive>} drives
 * @param {object} opts
 * @param {boolean} [opts.live=false]
 * @param {[string, ...string[]]} [opts.folders]
 * @returns {EntriesStream}
 */
export function createEntriesStream(
  drives,
  { live = false, folders = ['/'] } = {}
) {
  folders = normalizeFolders(folders)
  const mergedEntriesStreams = mergeStreams([])
  for (const drive of drives) {
    addDrive(drive)
  }
  Object.defineProperty(mergedEntriesStreams, kAddDrive, {
    get() {
      return addDrive
    },
    writable: false,
    enumerable: false,
    configurable: false,
  })
  // @ts-expect-error
  return mergedEntriesStreams

  /** @param {Hyperdrive} drive */
  function addDrive(drive) {
    const bee = drive.db
    // This will also include old versions of files, but it is the only way to
    // get a live stream from a Hyperbee, however we currently do not support
    // edits of blobs, so this should not be an issue, and the consequence is
    // that old versions are downloaded too, which is acceptable.
    const historyStream = bee.createHistoryStream({
      live,
      // `keyEncoding` is necessary because hyperdrive stores file index data
      // under the `files` sub-encoding key
      keyEncoding,
    })
    const filteredHistoryStream = historyStream.pipe(
      new Transform({
        transform(entry, _, callback) {
          if (matchesFolder(entry.key, folders)) {
            callback(null, entry)
          } else {
            callback()
          }
        },
      })
    )
    mergedEntriesStreams.add(filteredHistoryStream)
  }
}

/**
 * Take an array of folders, remove any folders that are subfolders of another,
 * remove duplicates, and add trailing slashes
 * @param {string[]} folders
 * @returns {[string, ...string[]]}
 */
function normalizeFolders(folders) {
  folders = folders.map(addTrailingSlash)
  /** @type {Set<string>} */
  const normalized = new Set()
  for (let i = 0; i < folders.length; i++) {
    const isSubfolderOfAnotherFolder = !!folders.find((folder, index) => {
      if (index === i) return false
      // Deduping is done by the Set, if we do it here we don't get either
      if (folder === folders[i]) return true
      return folders[i].startsWith(folder)
    })
    if (!isSubfolderOfAnotherFolder) normalized.add(folders[i])
  }
  const normalizedArray = Array.from(normalized)
  // @ts-expect-error - TS should know this, but doesn't
  return normalizedArray.length === 0 ? ['/'] : normalizedArray
}

/** @param {string} path */
function addTrailingSlash(path) {
  return path.endsWith('/') ? path : `${path}/`
}

/**
 * Returns true if the path is within one of the given folders
 *
 * @param {string} path
 * @param {string[]} folders
 * @returns {boolean}
 */
function matchesFolder(path, folders) {
  for (const folder of folders) {
    if (path.startsWith(folder)) return true
  }
  return false
}
