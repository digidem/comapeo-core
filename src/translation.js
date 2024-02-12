import { eq, and } from 'drizzle-orm'
import { kTable } from './datatype/index.js'

// TODO: Update to use mapeo-schema definition here before merging

/**
 * @typedef {object} TranslationRecord
 * @property {string} languageCode
 * @property {string} [regionCode]
 * @property {Exclude<import('@mapeo/schema').MapeoDoc['schemaName'], 'translation'>} schemaNameRef
 * @property {string} docIdRef
 * @property {string} docId
 * @property {string} fieldRef
 * @property {string} message
 */

/** @satisfies {Array<keyof TranslationRecord} */
const QUERIABLE_PROPS = [
  'docIdRef',
  'schemaNameRef',
  'languageCode',
  'fieldRef',
  'regionCode',
]

export default class Translation {
  #dataType

  constructor({ dataType }) {
    this.#dataType = dataType
  }

  /**
   * @param {import('type-fest').SetOptional<Pick<TranslationRecord, typeof QUERIABLE_PROPS[number]>, 'fieldRef' | 'languageCode'>} opts
   */
  async get(opts) {
    /** @type {ReturnType<import('drizzle-orm').BinaryOperator>[]} */
    const conditions = []
    for (const prop of QUERIABLE_PROPS) {
      if (opts[prop]) {
        conditions.push(eq(this.#dataType[kTable][prop], opts[prop]))
      }
    }
    const query = and.apply(null, conditions)
    return (await this.#dataType[kTable].select()).where(query)
  }
}
