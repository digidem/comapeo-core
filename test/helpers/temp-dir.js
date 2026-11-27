import fsPromises from 'node:fs/promises'

/**
 * Callers must close whatever has files open in `dir` first: Windows can't
 * delete open files.
 *
 * @param {string} dir
 */
export async function removeTempDir(dir) {
  await fsPromises.rm(dir, { recursive: true, force: true, maxRetries: 2 })
}
