/**
 * Create an `Error` with a `code` property.
 *
 * @example
 * const err = new ErrorWithCode('INVALID_DATA', 'data was invalid')
 * err.message
 * // => 'data was invalid'
 * err.code
 * // => 'INVALID_DATA'
 */
export class ErrorWithCode extends Error {
  /**
   * @param {string} code
   * @param {string} message
   */
  constructor(code, message) {
    super(message)
    /** @readonly */ this.code = code
  }
}
