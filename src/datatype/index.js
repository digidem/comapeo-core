import { validate } from '@comapeo/schema'
import { getTableConfig } from 'drizzle-orm/sqlite-core'
import { eq, inArray, sql } from 'drizzle-orm'
import { randomBytes } from 'node:crypto'
import { noop, mutatingDeNullify } from '../utils.js'
import { NotFoundError } from '../errors.js'
import { TypedEmitter } from 'tiny-typed-emitter'
import { setProperty, getProperty } from 'dot-prop-extra'
import { parseBcp47 } from '../intl/parse-bcp-47.js'
/** @import { MapeoDoc, MapeoValue } from '@comapeo/schema' */
/** @import { RunResult } from 'better-sqlite3' */
/** @import { SQLiteSelectBase } from 'drizzle-orm/sqlite-core' */
/** @import { Exact } from 'type-fest' */
/** @import { DataStore } from '../datastore/index.js' */
/**
 * @import {
 *   CoreOwnershipWithSignaturesValue,
 *   DefaultEmitterEvents,
 *   MapeoDocMap,
 *   MapeoValueMap,
 * } from '../types.js'
 */

/**
 * @internal
 * @typedef {`${MapeoDoc['schemaName']}Table`} MapeoDocTableName
 */

/**
 * @internal
 * @template T
 * @typedef {T[(keyof T) & MapeoDocTableName]} GetMapeoDocTables
 */

/**
 * Union of Drizzle schema tables that correspond to MapeoDoc types (e.g. excluding backlink tables and other utility tables)
 * @internal
 * @typedef {GetMapeoDocTables<typeof import('../schema/project.js')> | GetMapeoDocTables<typeof import('../schema/client.js')>} MapeoDocTables
 */

/**
 * @internal
 * @typedef {{ [K in MapeoDocTables['_']['name']]: Extract<MapeoDocTables, { _: { name: K }}> }} MapeoDocTablesMap
 */

/**
 * @internal
 * @template T
 * @template {keyof any} K
 * @typedef {T extends any ? Omit<T, K> : never} OmitUnion
 */

/**
 * @internal
 * @template {MapeoValue} T
 * @template {MapeoValue['schemaName']} S
 * @typedef {Exclude<T, { schemaName: S }>} ExcludeSchema
 */

/**
 * @internal
 * @template {MapeoDoc} TDoc
 * @typedef {object} DataTypeEvents
 * @property {(docs: TDoc[]) => void} updated-docs
 */

/**
 * @typedef {object} DerivedDocFields
 * @property {string[]} forks
 * @property {string} createdBy
 * @property {string} updatedBy
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
export const kDataStore = Symbol('dataStore')

/**
 * @template {DataStore} TDataStore
 * @template {MapeoDocTables} TTable
 * @template {TTable['_']['name']} TSchemaName
 * @template {MapeoDocMap[TSchemaName]} TDoc
 * @template {MapeoValueMap[TSchemaName]} TValue
 * @extends {TypedEmitter<DataTypeEvents<TDoc> & DefaultEmitterEvents<DataTypeEvents<TDoc>>>}
 */
export class DataType extends TypedEmitter {
  #dataStore
  #table
  #schemaName
  #sql
  #db
  #getTranslations
  #getDeviceIdForVersionId

  /**
   *
   * @param {object} opts
   * @param {TTable} opts.table
   * @param {TDataStore} opts.dataStore
   * @param {import('drizzle-orm/better-sqlite3').BetterSQLite3Database} opts.db
   * @param {import('../translation-api.js').default['get']} [opts.getTranslations]
   * @param {(versionId: string) => Promise<string>} opts.getDeviceIdForVersionId
   */
  constructor({
    dataStore,
    table,
    db,
    getTranslations,
    getDeviceIdForVersionId,
  }) {
    super()
    this.#dataStore = dataStore
    this.#table = table
    this.#schemaName = /** @type {TSchemaName} */ (getTableConfig(table).name)
    this.#db = db
    this.#getTranslations = getTranslations
    this.#getDeviceIdForVersionId = getDeviceIdForVersionId
    this.#sql = {
      getByDocId: db
        .select()
        .from(table)
        .where(eq(table.docId, sql.placeholder('docId')))
        .prepare(),
      getMany: db
        .select()
        .from(table)
        .where(eq(table.deleted, false))
        .prepare(),
      getManyWithDeleted: db.select().from(table).prepare(),
    }
    this.on('newListener', (eventName) => {
      if (eventName !== 'updated-docs') return
      if (this.listenerCount('updated-docs') > 1) return
      if (this.#schemaName === 'projectSettings') return
      // Avoid adding a listener to the dataStore unless we need to (e.g. this has a listener attached), for performance reasons.
      this.#dataStore.on(this.#schemaName, this.#handleDataStoreUpdate)
    })
    this.on('removeListener', (eventName) => {
      if (eventName !== 'updated-docs') return
      if (this.listenerCount('updated-docs') > 0) return
      if (this.#schemaName === 'projectSettings') return
      this.#dataStore.off(this.#schemaName, this.#handleDataStoreUpdate)
    })
  }

  /** @returns {TTable} */
  get [kTable]() {
    return this.#table
  }

  /** @returns {TSchemaName} */
  get schemaName() {
    return this.#schemaName
  }

  /** @returns {TDataStore['namespace']} */
  get namespace() {
    return this.#dataStore.namespace
  }

  /** @returns {TDataStore} */
  get [kDataStore]() {
    return this.#dataStore
  }

  /**
   * @template {Exact<ExcludeSchema<TValue, 'coreOwnership'>, T>} T
   * @param {T} value
   * @returns {Promise<TDoc & DerivedDocFields>}
   */
  async create(value) {
    const docId = generateId()
    // @ts-expect-error - can't figure this one out
    return this[kCreateWithDocId](docId, value, { checkExisting: false })
  }

  /**
   * @param {string} docId
   * @param {ExcludeSchema<TValue, 'coreOwnership'> | CoreOwnershipWithSignaturesValue} value
   * @param {{ checkExisting?: boolean }} [opts] - only used internally to skip the checkExisting check when creating a document with a random ID (collisions should be too small probability to be worth checking for)
   * @returns {Promise<TDoc & DerivedDocFields>}
   */
  async [kCreateWithDocId](docId, value, { checkExisting = true } = {}) {
    if (!validate(this.#schemaName, value)) {
      // TODO: pass through errors from validate functions
      throw new Error('Invalid value ' + value)
    }
    if (checkExisting) {
      const existing = await this.getByDocId(docId).catch(noop)
      if (existing) {
        throw new Error('Doc with docId ' + docId + ' already exists')
      }
    }
    const nowDateString = generateDate()

    /** @type {Parameters<typeof DataStore.prototype.write>[0]} */
    const doc = {
      ...value,
      docId,
      createdAt: nowDateString,
      updatedAt: nowDateString,
      deleted: false,
      links: [],
    }
    await this.#dataStore.write(doc)
    return this.getByDocId(doc.docId)
  }

  /**
   * @overload
   * @param {string} docId
   * @param {object} [options]
   * @param {true} [options.mustBeFound]
   * @param {string} [options.lang]
   * @returns {Promise<TDoc & DerivedDocFields>}
   */
  /**
   * @param {string} docId
   * @param {object} [options]
   * @param {boolean} [options.mustBeFound]
   * @param {string} [options.lang]
   * @returns {Promise<null | (TDoc & DerivedDocFields)>}
   */
  async getByDocId(docId, { mustBeFound = true, lang } = {}) {
    await this.#dataStore.indexer.idle()
    const result = this.#sql.getByDocId.get({ docId })
    if (result) {
      return this.#mutatingAddDerivedFields(result, { lang })
    } else if (mustBeFound) {
      throw new NotFoundError()
    } else {
      return null
    }
  }

  /**
   * @param {string} versionId
   * @param {{ lang?: string }} [opts]
   * @returns {Promise<TDoc & DerivedDocFields>}
   */
  async getByVersionId(versionId, { lang } = {}) {
    const result = await this.#dataStore.read(versionId)
    if (result.schemaName !== this.#schemaName) throw new NotFoundError()
    return this.#mutatingAddDerivedFields(result, { lang })
  }

  /**
   * @param {any} doc - not typesafe - this should be a MapeoDoc with nullable fields in place of optional fields, read from SQLite
   * @param {{ lang?: string }} [opts]
   * @returns {Promise<TDoc & DerivedDocFields>}
   */
  async #mutatingAddDerivedFields(doc, { lang } = {}) {
    mutatingDeNullify(doc)
    const createdByPromise = this.#getDeviceIdForVersionId(
      doc.originalVersionId
    )
    const updatedByPromise =
      doc.originalVersionId === doc.versionId
        ? createdByPromise
        : this.#getDeviceIdForVersionId(doc.versionId)
    if (lang) {
      await this.#mutatingAddTranslations(doc, { lang })
    }
    const [createdBy, updatedBy] = await Promise.all([
      createdByPromise,
      updatedByPromise,
    ])
    doc.createdBy = createdBy
    doc.updatedBy = updatedBy
    return doc
  }

  /**
   * @param {any} doc
   * @param {{ lang: string }} opts
   * @returns {Promise<any>}
   */
  async #mutatingAddTranslations(doc, { lang }) {
    if (!this.#getTranslations) return doc

    const { language, region } = parseBcp47(lang)
    if (!language) return doc

    const translations = await this.#getTranslations({
      languageCode: language,
      docRef: {
        docId: doc.docId,
        versionId: doc.versionId,
      },
      docRefType: doc.schemaName,
    })

    /** @type {Set<string>} */
    const translationsWithMatchingRegion = new Set()
    for (const translation of translations) {
      if (typeof getProperty(doc, translation.propertyRef) === 'string') {
        const isMatchingRegion = region
          ? // Previous versions did not normalize region codes stored in the
            // translations db to uppercase, so we need to transform the case
            // here (the parsed `region` is always uppercase).
            translation.regionCode?.toUpperCase() === region
          : !translation.regionCode // No region code means it's a match for any region
        // Prefer translations with a matching region code, but fall back to
        // translations without a region code if no matching region code has
        // been found yet for this propertyRef
        if (
          isMatchingRegion ||
          !translationsWithMatchingRegion.has(translation.propertyRef)
        ) {
          setProperty(doc, translation.propertyRef, translation.message)
        }
        if (isMatchingRegion) {
          translationsWithMatchingRegion.add(translation.propertyRef)
        }
      }
    }

    return doc
  }

  /**
   * @param {object} opts
   * @param {boolean} [opts.includeDeleted]
   * @param {string} [opts.lang]
   * @returns {Promise<Array<TDoc & DerivedDocFields>>}
   */
  async getMany({ includeDeleted = false, lang } = {}) {
    await this.#dataStore.indexer.idle()
    const rows = includeDeleted
      ? this.#sql.getManyWithDeleted.all()
      : this.#sql.getMany.all()
    return await Promise.all(
      rows.map((doc) => this.#mutatingAddDerivedFields(doc, { lang }))
    )
  }

  /**
   * @template {Exact<ExcludeSchema<TValue, 'coreOwnership'>, T>} T
   * @param {string | string[]} versionId
   * @param {T} value
   * @returns {Promise<TDoc & DerivedDocFields>}
   */
  async update(versionId, value) {
    await this.#dataStore.indexer.idle()
    const links = Array.isArray(versionId) ? versionId : [versionId]
    const { docId, createdAt, originalVersionId } = await this.#validateLinks(
      links
    )
    /** @type {any} */
    const doc = {
      // @ts-expect-error Can't figure out why TypeScript doesn't think `value` is spreadable.
      ...value,
      docId,
      createdAt,
      updatedAt: new Date().toISOString(),
      originalVersionId,
      links,
    }
    await this.#dataStore.write(doc)
    return this.getByDocId(docId)
  }

  /**
   * @param {string} docId
   * @returns {Promise<TDoc & DerivedDocFields>}
   */
  async delete(docId) {
    await this.#dataStore.indexer.idle()
    const existingDoc = await this.getByDocId(docId)

    if ('deleted' in existingDoc && existingDoc.deleted) {
      throw new Error('Doc already deleted')
    }

    /** @type {any} */
    const doc = {
      ...existingDoc,
      updatedAt: new Date().toISOString(),
      links: [existingDoc.versionId, ...existingDoc.forks],
      deleted: true,
    }
    await this.#dataStore.write(doc)
    return this.getByDocId(docId)
  }

  async [kSelect]() {
    await this.#dataStore.indexer.idle()
    const result = this.#db.select().from(this.#table)
    // [The result of `from()` is awaitable.][0] We don't want this because we
    // want to be able to await the result of this method and then call
    // `.where()` on the result.
    //
    // As a workaround, we remove promise methods from the result.
    //
    // [0]: https://github.com/drizzle-team/drizzle-orm/commit/c063144dc08726cc15323582fe377210329e579e
    return removePromiseMethods(result)
  }

  /**
   * Validate that existing docs with the given versionIds (links):
   * - exist
   * - have the same schemaName as this dataType
   * - all share the same docId
   * - all share the same originalVersionId
   * Throws if any of these conditions fail, otherwise returns the validated
   * docId and createAt datetime
   * @param {string[]} links
   * @returns {Promise<{ docId: MapeoDoc['docId'], createdAt: MapeoDoc['createdAt'], originalVersionId: MapeoDoc['originalVersionId'] }>}
   */
  async #validateLinks(links) {
    const prevDocs = await Promise.all(
      links.map((versionId) => this.getByVersionId(versionId))
    )
    const { docId, createdAt, originalVersionId } = prevDocs[0]
    const areLinksValid = prevDocs.every(
      (doc) => doc.docId === docId && doc.schemaName === this.#schemaName
    )
    if (!areLinksValid) {
      throw new Error('Updated docs must have the same docId and schemaName')
    }
    return { docId, createdAt, originalVersionId }
  }

  /**
   * @param {Set<string>} docIds
   */
  #handleDataStoreUpdate = (docIds) => {
    if (this.listenerCount('updated-docs') === 0) return
    const updatedDocs = /** @type {Promise<TDoc[]>} */ Promise.all(
      this.#db
        .select()
        .from(this.#table)
        .where(inArray(this.#table.docId, [...docIds]))
        .all()
        .map((doc) => this.#mutatingAddDerivedFields(doc))
    )
    updatedDocs.then((docs) => this.emit('updated-docs', docs))
  }
}

/**
 * @template {object} T
 * @param {T} value
 * @returns {Omit<T, 'then' | 'catch' | 'finally'> & { then?: undefined, catch?: undefined, finally?: undefined }}
 */
function removePromiseMethods(value) {
  return Object.create(value, {
    then: { value: undefined },
    catch: { value: undefined },
    finally: { value: undefined },
  })
}
