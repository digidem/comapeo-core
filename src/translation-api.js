import { and, sql } from 'drizzle-orm'
import { kCreateWithDocId, kSelect } from './datatype/index.js'
import { hashObject } from './utils.js'
import { NotFoundError } from './errors.js'
/** @import { Translation, TranslationValue } from '@comapeo/schema' */
/** @import { SetOptional } from 'type-fest' */

export const ktranslatedLanguageCodeToSchemaNames = Symbol(
  'translatedLanguageCodeToSchemaNames'
)
export default class TranslationApi {
  /** @type {Map<
   * TranslationValue['languageCode'],
   * Set<import('@comapeo/schema/dist/types.js').SchemaName>>} */
  #translatedLanguageCodeToSchemaNames = new Map()
  #dataType
  #table
  #indexPromise

  /**
   * @param {Object} opts
   * @param {import('./datatype/index.js').DataType<
   *   import('./datastore/index.js').DataStore<'config'>,
   *   typeof import('./schema/project.js').translationTable,
   *   'translation',
   *   Translation,
   *   TranslationValue
   * >}  opts.dataType
   * @param {typeof import('./schema/project.js').translationTable} opts.table
   */
  constructor({ dataType, table }) {
    this.#dataType = dataType
    this.#table = table
    this.#indexPromise = this.#dataType
      .getMany()
      .then((docs) => {
        docs.map((doc) => this.index(doc))
      })
      .catch((err) => {
        throw new Error(`error loading Translation cache: ${err}`)
      })
  }

  /** @returns {Promise<void>} */
  ready() {
    return this.#indexPromise
  }

  /**
   * @param {TranslationValue} value
   */
  async put(value) {
    /* eslint-disable no-unused-vars */
    const { message, ...identifiers } = value
    const docId = hashObject(identifiers)
    try {
      const doc = await this.#dataType.getByDocId(docId)
      return await this.#dataType.update(doc.versionId, value)
    } catch (e) {
      if (e instanceof NotFoundError) {
        return await this.#dataType[kCreateWithDocId](docId, value)
      } else {
        throw new Error(`Error on translation ${e}`)
      }
    }
  }

  /** @typedef {SetOptional<TranslationValue['docRef'], 'versionId'>} DocRefWithOptionalVersionId */

  /**
   * @param {SetOptional<
   * Omit<TranslationValue,'schemaName' | 'message' | 'docRef'>,
   * 'propertyRef' | 'regionCode'> & {docRef: DocRefWithOptionalVersionId}} value
   * @returns {Promise<import('@comapeo/schema').Translation[]>}
   */
  async get(value) {
    await this.ready()

    const docTypeIsTranslatedToLanguage =
      this.#translatedLanguageCodeToSchemaNames
        .get(value.languageCode)
        ?.has(
          /** @type {import('@comapeo/schema/dist/types.js').SchemaName} */ (
            value.docRefType
          )
        )
    if (!docTypeIsTranslatedToLanguage) return []

    const filters = [
      sql`docRefType = ${value.docRefType}`,
      sql`languageCode = ${value.languageCode}`,
      sql`json_extract(docRef, '$.docId') = ${value.docRef.docId}`,
    ]

    if (value.docRef?.versionId) {
      filters.push(
        sql`json_extract(docRef,'$.versionId') = ${value.docRef.versionId}`
      )
    }
    if (value.propertyRef) {
      filters.push(sql`propertyRef = ${value.propertyRef}`)
    }
    if (value.regionCode) {
      filters.push(sql`regionCode = ${value.regionCode}`)
    }

    return (await this.#dataType[kSelect]())
      .where(and.apply(null, filters))
      .prepare()
      .all()
  }

  /**
   * @param {TranslationValue} doc
   */
  index(doc) {
    let translatedSchemas = this.#translatedLanguageCodeToSchemaNames.get(
      doc.languageCode
    )
    if (!translatedSchemas) {
      translatedSchemas = new Set()
      this.#translatedLanguageCodeToSchemaNames.set(
        doc.languageCode,
        translatedSchemas
      )
    }
    translatedSchemas.add(
      /** @type {import('@comapeo/schema/dist/types.js').SchemaName} */ (
        doc.docRefType
      )
    )
  }

  // This should only be used by tests.
  get [ktranslatedLanguageCodeToSchemaNames]() {
    return this.#translatedLanguageCodeToSchemaNames
  }
  get dataType() {
    return this.#dataType
  }
}
