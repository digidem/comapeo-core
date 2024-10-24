import SubEncoder from 'sub-encoder'
import mergeStreams from '@sindresorhus/merge-streams'
import { Transform } from 'node:stream'
import unixPathResolve from 'unix-path-resolve'

/** @import Hyperdrive from 'hyperdrive' */
/** @import { BlobStoreEntriesStream } from '../types.js' */

const keyEncoding = new SubEncoder('files', 'utf-8')

/**
 *
 * @param {Array<Hyperdrive>} drives
 * @param {import('./index.js').InternalDriveEmitter} driveEmitter
 * @param {object} opts
 * @param {boolean} [opts.live=false]
 * @param {readonly string[]} [opts.folders]
 * @returns {BlobStoreEntriesStream}
 */
export function createEntriesStream(
  drives,
  driveEmitter,
  { live = false, folders = ['/'] } = {}
) {
  folders = normalizeFolders(folders)
  const mergedEntriesStreams = mergeStreams(
    drives.map((drive) => getFilteredHistoryStream(drive.db, { folders, live }))
  )
  if (live) {
    driveEmitter.on('add-drive', addDrive)
    mergedEntriesStreams.on('close', () => {
      driveEmitter.off('add-drive', addDrive)
    })
  }
  // @ts-expect-error
  return mergedEntriesStreams

  /** @param {Hyperdrive} drive */
  function addDrive(drive) {
    mergedEntriesStreams.add(
      getFilteredHistoryStream(drive.db, { folders, live })
    )
  }
}

/**
 *
 * @param {import('hyperbee')} bee
 * @param {object} opts
 * @param {boolean} opts.live
 * @param {readonly string[]} opts.folders
 */
function getFilteredHistoryStream(bee, { folders, live }) {
  let driveId = bee.core.discoveryKey?.toString('hex')
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
  return historyStream.pipe(
    new Transform({
      objectMode: true,
      /** @param {import('hyperdrive').HyperdriveEntry} entry */
      transform(entry, _, callback) {
        if (matchesFolder(entry.key, folders)) {
          // Unnecessary performance optimization to only call toString() once
          // bee.discoveryKey will always be defined by the time it starts
          // streaming, but could be null when the instance is first created.
          driveId = driveId || bee.core.discoveryKey?.toString('hex')
          callback(null, { ...entry, driveId })
        } else {
          callback()
        }
      },
    })
  )
}

/**
 * Take an array of folders, remove any folders that are subfolders of another,
 * remove duplicates, and add trailing slashes
 * @param {readonly string[]} folders
 * @returns {readonly [string, ...string[]]}
 */
function normalizeFolders(folders) {
  // 1. Add trailing slashes so that path.startsWith(folder) does not match a folder whose name starts with this folder.
  // 2. Standardize path names as done internally in Hyperdrive: https://github.com/holepunchto/hyperdrive/blob/5ee0164fb39eadc0a073f7926800f81117a4c52e/index.js#L685
  folders = folders.map((folder) =>
    addTrailingSlash(unixPathResolve('/', folder))
  )
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
 * @param {readonly string[]} folders
 * @returns {boolean}
 */
function matchesFolder(path, folders) {
  for (const folder of folders) {
    if (path.startsWith(folder)) return true
  }
  return false
}
