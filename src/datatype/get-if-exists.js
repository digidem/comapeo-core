import { NotFoundError } from '../errors.js'
/** @import { DataStore } from '../datastore/index.js' */
/** @import { MapeoDocMap, MapeoValueMap } from '../types.js' */
/** @import { DataType, MapeoDocTables } from './index.js' */

/**
 * @template {MapeoDocTables} TTable
 * @template {TTable['_']['name']} TSchemaName
 * @template {MapeoDocMap[TSchemaName]} TDoc
 * @template {MapeoValueMap[TSchemaName]} TValue
 * @param {DataType<DataStore, TTable, TSchemaName, TDoc, TValue>} dataType
 * @param {string} docId
 * @returns {Promise<null | TDoc & { forks: string[] }>}
 */
export async function getByDocIdIfExists(dataType, docId) {
  try {
    return await dataType.getByDocId(docId)
  } catch (err) {
    if (err instanceof NotFoundError) return null
    throw err
  }
}
