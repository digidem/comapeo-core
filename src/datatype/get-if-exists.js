import { NotFoundError } from '../errors.js'
/** @import { DataStore } from '../datastore/index.js' */
/** @import { MapeoDocMap, MapeoValueMap } from '../types.js' */
/** @import { DataType, MapeoDocTables } from './index.js' */

/**
 * @template T
 * @param {() => PromiseLike<T>} fn
 * @returns {Promise<null | T>}
 */
async function nullIfNotFound(fn) {
  try {
    return await fn()
  } catch (err) {
    if (err instanceof NotFoundError) return null
    throw err
  }
}

/**
 * @template {MapeoDocTables} TTable
 * @template {TTable['_']['name']} TSchemaName
 * @template {MapeoDocMap[TSchemaName]} TDoc
 * @template {MapeoValueMap[TSchemaName]} TValue
 * @param {DataType<DataStore, TTable, TSchemaName, TDoc, TValue>} dataType
 * @param {string} docId
 * @returns {Promise<null | TDoc & { forks: string[] }>}
 */
export const getByDocIdIfExists = (dataType, docId) =>
  nullIfNotFound(() => dataType.getByDocId(docId))

/**
 * @template {MapeoDocTables} TTable
 * @template {TTable['_']['name']} TSchemaName
 * @template {MapeoDocMap[TSchemaName]} TDoc
 * @template {MapeoValueMap[TSchemaName]} TValue
 * @param {DataType<DataStore, TTable, TSchemaName, TDoc, TValue>} dataType
 * @param {string} versionId
 * @returns {Promise<null | TDoc>}
 */
export const getByVersionIdIfExists = (dataType, versionId) =>
  nullIfNotFound(() => dataType.getByVersionId(versionId))
