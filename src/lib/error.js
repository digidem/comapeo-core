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
   * @param {object} [options]
   * @param {unknown} [options.cause]
   */
  constructor(code, message, options) {
    super(message, options)
    /** @readonly */ this.code = code
  }
}

/**
 * Get the error message from an object if possible.
 * Otherwise, stringify the argument.
 *
 * @param {unknown} maybeError
 * @returns {string}
 * @example
 * try {
 *   // do something
 * } catch (err) {
 *   console.error(getErrorMessage(err))
 * }
 */
export function getErrorMessage(maybeError) {
  if (maybeError && typeof maybeError === 'object' && 'message' in maybeError) {
    try {
      const { message } = maybeError
      if (typeof message === 'string') return message
    } catch (_err) {
      // Ignored
    }
  }
  return 'unknown error'
}
