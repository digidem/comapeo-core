import AJV from 'ajv'
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

export class DataType {
  /** @type {EncodeDataType} */
  #encode = function defaultEncode (obj) {
    const block = this.blockPrefix + JSON.stringify(obj)
    return b4a.from(block)
  }

  /** @type {DecodeDataType} */
  #decode = function defaultDecode (block) {
    const blockPrefix = b4a.toString(block, 'utf-8', 0, 4)

    if (blockPrefix !== this.blockPrefix) {
      throw new Error(`DataType with hex identifier ${blockPrefix} found, expected ${this.blockPrefix}`)
    }

    return JSON.parse(b4a.toString(block, 'utf-8', 4))
  }

  #validate

  /**
   * @param {object} options
   * @param {string} options.name
   * @param {string} options.blockPrefix
   * @param {import('json-schema').JSONSchema4 | import('json-schema').JSONSchema6 | import('json-schema').JSONSchema7} options.schema
   * @param {EncodeDataType} [options.encode]
   * @param {DecodeDataType} [options.decode]
   */
  constructor ({ name, blockPrefix, schema, encode, decode }) {
    this.name = name
    this.blockPrefix = blockPrefix
    this.schema = schema
    this.ajv = new AJV()
    this.#validate = this.ajv.compile(this.schema)

    if (encode) {
      this.#encode = encode
    }

    if (decode) {
      this.#decode = decode
    }
  }

  /**
   * @param {Doc} doc
   */
  validate (doc) {
    return this.#validate(doc)
  }

  /**
   * @param {Doc} doc
   */
  encode (doc) {
    return this.#encode(doc)
  }

  /**
   * @param {Block} block
   */
  decode (block) {
    return this.#decode(block)
  }
}
