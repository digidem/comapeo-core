import { and, eq } from 'drizzle-orm'
import { kCreateWithDocId, kSelect } from './datatype/index.js'
import { hashObject } from './utils.js'

export default class TranslationApi {
  /** @type {Map<String,Set<import('@mapeo/schema/dist/types.js').SchemaName>>} */
  #translatedLanguageCodeToSchemaNames = new Map()

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
    this.dataType = dataType
    this.table = table
  }

  /**
   * @param {import('@mapeo/schema').TranslationValue} value
   */
  async put(value) {
    /* eslint-disable no-unused-vars */
    const { message, ...identifiers } = value
    const docId = hashObject(identifiers)
    let existing
    try {
      existing = await this.dataType.getByDocId(docId)
      if (existing) {
        await this.dataType.update(existing.versionId, value)
      }
    } catch (e) {
      existing = await this.dataType[kCreateWithDocId](docId, value)
    }
    return existing.docId
  }

  /**
   * @param {Omit<import('@mapeo/schema').TranslationValue,'schemaName'>} value
   */
  async get(value) {
    const filters = [
      eq(this.table.docIdRef, value.docIdRef),
      eq(this.table.schemaNameRef, value.schemaNameRef),
      eq(this.table.languageCode, value.languageCode),
    ]
    if (value.fieldRef) {
      filters.push(eq(this.table.fieldRef, value.fieldRef))
    }

    if (value.regionCode) {
      filters.push(eq(this.table.regionCode, value.regionCode))
    }

    return (await this.dataType[kSelect]())
      .where(and.apply(null, filters))
      .prepare()
      .all()
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
    translatedSchemas?.add(
      /** @type {import('@mapeo/schema/dist/types.js').SchemaName} */ (
        doc.schemaNameRef
      )
    )
  }
}
