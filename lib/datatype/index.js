import Ajv from 'ajv'
import b4a from 'b4a'

/**
 * @callback EncodeDataType
 * @param {Doc} doc
 * @returns {Block}
 */

/**
 * @callback DecodeDataType
 * @param {Block} block
 * @returns {Doc}
 */

/**
 * @callback ValidateDataType
 * @param {Doc} doc
 * @returns {Boolean}
 */

/**
 * The DataType class is used to define the schema and encoding of a document type.
 */
export class DataType {
  /** @type {EncodeDataType} */
  #encode = function defaultEncode(obj) {
    const block = this.blockPrefix + JSON.stringify(obj)
    return b4a.from(block)
  }

  /** @type {DecodeDataType} */
  #decode = function defaultDecode(block) {
    const blockPrefix = b4a.toString(block, 'utf-8', 0, 4)

    if (blockPrefix !== this.blockPrefix) {
      throw new Error(
        `DataType with hex identifier ${blockPrefix} found, expected ${this.blockPrefix}`
      )
    }

    return JSON.parse(b4a.toString(block, 'utf-8', 4))
  }

  #validate

  /**
   * @param {object} options
   * @param {string} options.name
   * @param {string} options.blockPrefix
   * @param {import('json-schema').JSONSchema4 | import('json-schema').JSONSchema6 | import('json-schema').JSONSchema7} options.schema
   * @param {ValidateDataType} [options.validate]
   * @param {EncodeDataType} [options.encode]
   * @param {DecodeDataType} [options.decode]
   */
  constructor({ name, blockPrefix, schema, validate, encode, decode }) {
    this.name = name
    this.blockPrefix = blockPrefix
    this.schema = schema

    if (validate) {
      this.#validate = validate
    } else if (schema) {
      const ajv = new Ajv()
      this.#validate = ajv.compile(this.schema)
    }

    if (encode) {
      this.#encode = encode
    }

    if (decode) {
      this.#decode = decode
    }
  }

  /**
   * @param {Doc} doc
   * @returns {Boolean}
   * @throws {Error}
   */
  validate(doc) {
    const valid = this.#validate(doc)

    if (!valid) {
      throw new Error(
        'Invalid document, see errors:\n' +
          this.#validate.errors.map((e) => `- ${e.message}\n`).join('/n')
      )
    }

    return valid
  }

  /**
   * @param {Doc} doc
   * @returns {Block}
   */
  encode(doc) {
    return this.#encode(doc)
  }

  /**
   * @param {Block} block
   * @returns {Doc}
   */
  decode(block) {
    return this.#decode(block)
  }
}
