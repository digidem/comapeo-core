// @ts-check
import { validate } from '@mapeo/schema'
import { getTableConfig } from 'drizzle-orm/sqlite-core'
import { eq, placeholder } from 'drizzle-orm'
import { randomBytes } from 'node:crypto'
import { deNullify } from '../utils.js'

/**
 * @typedef {import('@mapeo/schema').MapeoDoc} MapeoDoc
 */
/**
 * @typedef {import('@mapeo/schema').MapeoValue} MapeoValue
 */
/**
 * @typedef {import('../types.js').MapeoDocMap} MapeoDocMap
 */
/**
 * @typedef {import('../types.js').MapeoValueMap} MapeoValueMap
 */
/**
 * @typedef {`${MapeoDoc['schemaName']}Table`} MapeoDocTableName
 */
/**
 * @template T
 * @typedef {T[(keyof T) & MapeoDocTableName]} GetMapeoDocTables
 */
/**
 * Union of Drizzle schema tables that correspond to MapeoDoc types (e.g. excluding backlink tables and other utility tables)
 * @typedef {GetMapeoDocTables<typeof import('../schema/project.js')> | GetMapeoDocTables<typeof import('../schema/client.js')>} MapeoDocTables
 */
/**
 * @typedef {{ [K in MapeoDocTables['_']['name']]: Extract<MapeoDocTables, { _: { name: K }}> }} MapeoDocTablesMap
 */
/**
 * @template T
 * @template {keyof any} K
 * @typedef {T extends any ? Omit<T, K> : never} OmitUnion
 */

function generateId() {
  return randomBytes(32).toString('hex')
}
function generateDate() {
  return new Date().toISOString()
}
export const kCreateWithDocId = Symbol('kCreateWithDocId')
export const kSelect = Symbol('select')
export const kTable = Symbol('table')

/**
 * @template {import('../datastore/index.js').DataStore} TDataStore
 * @template {TDataStore['schemas'][number]} TSchemaName
 * @template {MapeoDocTablesMap[TSchemaName]} TTable
 * @template {Exclude<MapeoDocMap[TSchemaName], { schemaName: 'coreOwnership' }>} TDoc
 * @template {Exclude<MapeoValueMap[TSchemaName], { schemaName: 'coreOwnership' }>} TValue
 */
export class DataType {
  #dataStore
  #table
  #getPermissions
  #schemaName
  #sql
  #db

  /**
   *
   * @param {object} opts
   * @param {TTable} opts.table
   * @param {TDataStore} opts.dataStore
   * @param {import('drizzle-orm/better-sqlite3').BetterSQLite3Database} opts.db
   * @param {() => any} [opts.getPermissions]
   */
  constructor({ dataStore, table, getPermissions, db }) {
    this.#dataStore = dataStore
    this.#table = table
    this.#schemaName = /** @type {TSchemaName} */ (getTableConfig(table).name)
    this.#getPermissions = getPermissions
    this.#db = db
    this.#sql = {
      getByDocId: db
        .select()
        .from(table)
        .where(eq(table.docId, placeholder('docId')))
        .prepare(),
      getMany: db.select().from(table).prepare(),
    }
  }

  get [kTable]() {
    return this.#table
  }

  /**
   * @template {import('type-fest').Exact<TValue, T>} T
   * @param {T} value
   */
  async create(value) {
    const docId = generateId()
    // @ts-expect-error - can't figure this one out, types in index.d.ts override this
    return this[kCreateWithDocId](docId, value)
  }

  /**
   * @param {string} docId
   * @param {TValue | import('../types.js').CoreOwnershipWithSignaturesValue} value
   */
  async [kCreateWithDocId](docId, value) {
    if (!validate(this.#schemaName, value)) {
      // TODO: pass through errors from validate functions
      throw new Error('Invalid value ' + value)
    }
    const nowDateString = generateDate()
    /** @type {OmitUnion<MapeoDoc, 'versionId'>} */
    const doc = {
      ...value,
      docId,
      createdAt: nowDateString,
      updatedAt: nowDateString,
      // createdBy,
      links: [],
    }

    // TS can't track the relationship between TDoc and TValue, so doc above is
    // typed as MapeoDoc (without versionId) rather than as TDoc.
    await this.#dataStore.write(doc)
    return this.getByDocId(doc.docId)
  }

  /**
   * @param {string} docId
   */
  async getByDocId(docId) {
    const result = this.#sql.getByDocId.get({ docId })
    return result ? deNullify(result) : result
  }

  /** @param {string} versionId */
  async getByVersionId(versionId) {
    return this.#dataStore.read(versionId)
  }

  async getMany() {
    return this.#sql.getMany.all().map((doc) => deNullify(doc))
  }

  /**
   *
   * @template {import('type-fest').Exact<TValue, T>} T
   * @param {string | string[]} versionId
   * @param {T} value
   */
  async update(versionId, value) {
    const links = Array.isArray(versionId) ? versionId : [versionId]
    const { docId, createdAt, createdBy } = await this.#validateLinks(links)
    /** @type {any} */
    const doc = {
      ...value,
      docId,
      createdAt,
      updatedAt: new Date().toISOString(),
      createdBy,
      links,
    }
    await this.#dataStore.write(doc)
    return this.getByDocId(docId)
  }

  /**
   * Not yet implemented
   * @param {string | string[]} versionId
   */
  async delete(versionId) {
    const links = Array.isArray(versionId) ? versionId : [versionId]
    const { docId, createdAt, createdBy } = await this.#validateLinks(links)
    /** @type {any} */
    const doc = {
      docId,
      createdAt,
      updatedAt: new Date().toISOString(),
      createdBy,
      links,
      schemaName: this.#schemaName,
      deleted: true,
    }
    await this.#dataStore.write(doc)
    return this.getByDocId(docId)
  }

  /**
   * @param {Parameters<import('drizzle-orm/better-sqlite3').BetterSQLite3Database['select']>[0]} fields
   */
  [kSelect](fields) {
    return this.#db.select(fields).from(this.#table)
  }

  /**
   * Validate that existing docs with the given versionIds (links):
   * - exist
   * - have the same schemaName as this dataType
   * - all share the same docId
   * - all share the same createdAt
   * Throws if any of these conditions fail, otherwise returns the validated
   * docId and createAt datetime
   * @param {string[]} links
   * @returns {Promise<{ docId: MapeoDoc['docId'], createdAt: MapeoDoc['createdAt'], createdBy: MapeoDoc['createdBy'] }>}
   */
  async #validateLinks(links) {
    const prevDocs = await Promise.all(
      links.map((versionId) => this.getByVersionId(versionId))
    )
    const { docId, createdAt, createdBy } = prevDocs[0]
    const areLinksValid = prevDocs.every(
      (doc) =>
        doc.docId === docId &&
        doc.schemaName === this.#schemaName &&
        doc.createdBy === createdBy
    )
    if (!areLinksValid) {
      throw new Error('Updated docs must have the same docId and schemaName')
    }
    return { docId, createdAt, createdBy }
  }
}
