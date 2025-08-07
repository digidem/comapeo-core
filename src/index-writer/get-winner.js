import { parseVersionId } from '@comapeo/schema'
import { defaultGetWinner } from '@mapeo/sqlite-indexer'

/**
 * For coreOwnership records, we only trust the first record written to the core.
 *
 * @type {typeof import('@mapeo/sqlite-indexer').defaultGetWinner}
 */
export function getWinner(docA, docB) {
  // Written "backwards" to minimize conditional checks if not 'coreOwnership'
  if (
    !('schemaName' in docA && docA.schemaName === 'coreOwnership') ||
    !('schemaName' in docB && docB.schemaName === 'coreOwnership')
  ) {
    return defaultGetWinner(docA, docB)
  } else {
    // Assumes docA and docB have same coreKey, so we choose the first one
    // written to the core
    const docAindex = parseVersionId(docA.versionId).index
    const docBindex = parseVersionId(docB.versionId).index
    if (docAindex < docBindex) return docA
    return docB
  }
}
