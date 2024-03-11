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
    // const { message, ...identifiers } = value
    const docId = hashObject(value)
    const existing = await this.dataType.getByDocId(docId)
    if (!existing) {
      await this.dataType[kCreateWithDocId](docId, value)
    } else {
      await this.dataType.update(existing.versionId, value)
    }
  }

  /**
   * @param {Object} value
   * @param {String} value.docIdRef
   * @param {String} value.fieldRef
   * @param {String} value.schemaNameRef
   * @param {String} value.languageCode
   * @param {String} value.regionCode
   */
  get(value) {
    return this.dataType[kSelect]()
      .where(
        and(
          eq(this.table.docIdRef, value.docIdRef),
          eq(this.table.fieldRef, value.fieldRef),
          eq(this.table.schemaNameRef, value.schemaNameRef),
          eq(this.table.languageCode, value.languageCode),
          // TODO: should we fallback to the first matching languageCode if regionCode doesn't match?
          eq(this.table.regionCode, value.regionCode)
        )
      )
      .run()
  }

  /**
   * @param {import('@mapeo/schema').TranslationValue} doc
   */
  index(doc) {
    let translatedSchemas = this.#translatedLanguageCodeToSchemaNames.get(
      doc.languageCode
    )
    translatedSchemas?.add(
      /** @type {import('@mapeo/schema/dist/types.js').SchemaName} */ (
        doc.schemaNameRef
      )
    )
  }
}
