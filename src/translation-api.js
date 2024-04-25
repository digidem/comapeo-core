import { and, eq } from 'drizzle-orm'
import { kCreateWithDocId, kSelect } from './datatype/index.js'
import { hashObject } from './utils.js'

export const ktranslatedLanguageCodeToSchemaNames = Symbol(
  'translatedLanguageCodeToSchemaNames'
)
export default class TranslationApi {
  /** @type {Map<
   * import('@mapeo/schema').TranslationValue['languageCode'],
   * Set<import('@mapeo/schema/dist/types.js').SchemaName>>} */
  #translatedLanguageCodeToSchemaNames = new Map()
  #dataType
  #table

  /**
   * @param {Object} opts
   * @param {import('./datatype/index.js').DataType<
   *   import('./datastore/index.js').DataStore<'config'>,
   *   typeof import('./schema/project.js').translationTable,
   *   'translation',
   *   import('@mapeo/schema').Translation,
   *   import('@mapeo/schema').TranslationValue
   * >}  opts.dataType
   * @param {typeof import('./schema/project.js').translationTable} opts.table
   */
  constructor({ dataType, table }) {
    this.#dataType = dataType
    this.#table = table
    this.#dataType
      .getMany()
      .then((docs) => docs.map((doc) => this.index(doc)))
      .catch((err) => {
        throw new Error(`error loading Translation cache: ${err}`)
      })
  }

  /**
   * @param {import('@mapeo/schema').TranslationValue} value
   */
  async put(value) {
    /* eslint-disable no-unused-vars */
    const { message, ...identifiers } = value
    const docId = hashObject(identifiers)
    let doc
    try {
      doc = await this.#dataType.getByDocId(docId)
      if (doc) {
        await this.#dataType.update(doc.versionId, value)
      }
    } catch (e) {
      doc = await this.#dataType[kCreateWithDocId](docId, value)
    }
    return doc
  }

  /**
   * @param {import('type-fest').SetOptional<
   * Omit<import('@mapeo/schema').TranslationValue,'schemaName' | 'message'>,
   * 'fieldRef' | 'regionCode'>} value
   */
  async get(value) {
    const docTypeIsTranslatedToLanguage =
      this.#translatedLanguageCodeToSchemaNames
        .get(value.languageCode)
        ?.has(
          /** @type {import('@mapeo/schema/dist/types.js').SchemaName} */ (
            value.schemaNameRef
          )
        )
    if (!docTypeIsTranslatedToLanguage) return []

    const filters = [
      eq(this.#table.docIdRef, value.docIdRef),
      eq(this.#table.schemaNameRef, value.schemaNameRef),
      eq(this.#table.languageCode, value.languageCode),
    ]
    if (value.fieldRef) {
      filters.push(eq(this.#table.fieldRef, value.fieldRef))
    }

    if (value.regionCode) {
      filters.push(eq(this.#table.regionCode, value.regionCode))
    }

    return (await this.#dataType[kSelect]())
      .where(and.apply(null, filters))
      .prepare()
      .all()
  }

  get cache() {
    return this.#translatedLanguageCodeToSchemaNames
  }

  /**
   * @param {import('@mapeo/schema').TranslationValue} doc
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
      /** @type {import('@mapeo/schema/dist/types.js').SchemaName} */ (
        doc.schemaNameRef
      )
    )
  }
  // This should only be used by tests.
  get [ktranslatedLanguageCodeToSchemaNames]() {
    return this.#translatedLanguageCodeToSchemaNames
  }
}
