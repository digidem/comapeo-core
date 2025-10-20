import { and, sql } from 'drizzle-orm'
import { kCreateWithDocId, kSelect } from './datatype/index.js'
import { deNullify, hashObject } from './utils.js'
import { nullIfNotFound } from './errors.js'
import { omit } from './lib/omit.js'
import { iso6391To6393, iso6393To6391 } from './intl/iso639.js'
/** @import { MapeoDoc, Translation, TranslationValue } from '@comapeo/schema' */
/** @import { SetOptional } from 'type-fest' */

export const ktranslatedLanguageCodeToSchemaNames = Symbol(
  'translatedLanguageCodeToSchemaNames'
)
export default class TranslationApi {
  /** @type {Map<
   * TranslationValue['languageCode'],
   * Set<import('@comapeo/schema/dist/types.js').SchemaName>>} */
  #translatedLanguageCodeToSchemaNames = new Map()
  // A bug in previous versions meant that translations were stored with ISO
  // 639-1 codes, so we need to handle backwards compatibility for that case.
  #hasLegacyIso6391Translations = false
  #dataType
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
   */
  constructor({ dataType }) {
    this.#dataType = dataType
    this.#indexPromise = this.#dataType
      .getMany()
      .then((docs) => {
        docs.map((doc) => this.index(doc))
      })
      .catch((err) => {
        console.error(`error loading Translation cache: ${err}`)
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
    const identifiers = omit(value, ['message'])
    const docId = hashObject(identifiers)
    const doc = await this.#dataType.getByDocId(docId).catch(nullIfNotFound)
    if (doc) {
      return await this.#dataType.update(doc.versionId, value)
    } else {
      return await this.#dataType[kCreateWithDocId](docId, value)
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

    // Allow this API to accept both ISO 639-1 and ISO 639-3 codes for languageCode
    const normalizedLanguageCode =
      value.languageCode.length === 2
        ? iso6391To6393.get(value.languageCode)
        : value.languageCode
    if (!normalizedLanguageCode) return [] // invalid language code

    const languageCodesToQuery = [normalizedLanguageCode]

    // A bug in previous versions meant that translations could be stored with
    // ISO 639-1 codes, so we need to query for both in this case by looking up
    // the ISO 639-1 code for the langauge, and then checking whether there are
    // translations for that language (looking up in our in-memory index saves
    // an extra sqlite query when unnecessary)
    if (this.#hasLegacyIso6391Translations) {
      const iso6391LanguageCode =
        value.languageCode.length === 2
          ? value.languageCode
          : iso6393To6391.get(value.languageCode)
      const isTranslationStoredWithIso6391Code =
        iso6391LanguageCode &&
        this.#isTranslated(
          /** @type {MapeoDoc['schemaName']} */
          (value.docRefType),
          iso6391LanguageCode
        )
      if (isTranslationStoredWithIso6391Code) {
        languageCodesToQuery.push(iso6391LanguageCode)
      }
    }

    const docTypeIsTranslatedToLanguage =
      this.#isTranslated(
        /** @type {MapeoDoc['schemaName']} */
        (value.docRefType),
        normalizedLanguageCode
      ) || languageCodesToQuery.length > 1
    if (!docTypeIsTranslatedToLanguage) return []

    const filters = [
      sql`docRefType = ${value.docRefType}`,
      sql`languageCode IN (${sql.join(languageCodesToQuery, ', ')})`,
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
      // Use COLLATE NOCASE for case-insensitive matching because in previous
      // versions we did not normalize regionCode to uppercase.
      filters.push(sql`regionCode = ${value.regionCode} COLLATE NOCASE`)
    }

    return (await this.#dataType[kSelect]())
      .where(and.apply(null, filters))
      .prepare()
      .all()
      .map(deNullify)
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
    if (doc.languageCode.length === 2) {
      this.#hasLegacyIso6391Translations = true
    }
    translatedSchemas.add(
      /** @type {import('@comapeo/schema/dist/types.js').SchemaName} */ (
        doc.docRefType
      )
    )
  }

  /**
   * @param {MapeoDoc['schemaName']} docType
   * @param {string} languageCode
   * @returns {boolean}
   */
  #isTranslated(docType, languageCode) {
    return (
      this.#translatedLanguageCodeToSchemaNames
        .get(languageCode)
        ?.has(docType) || false
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
