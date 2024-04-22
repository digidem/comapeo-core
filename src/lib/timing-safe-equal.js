// @ts-check
import * as crypto from 'node:crypto'

/**
 * @param {string | NodeJS.ArrayBufferView} value
 * @returns {NodeJS.ArrayBufferView}
 */
const bufferify = (value) =>
  // We use UTF-16 because it's the only supported encoding that doesn't
  // touch surrogate pairs. See [this post][0] for more details.
  //
  // [0]: https://evanhahn.com/crypto-timingsafeequal-with-strings/
  typeof value === 'string' ? Buffer.from(value, 'utf16le') : value

/**
 * Compare two values in constant time.
 *
 * Useful when you want to avoid leaking data.
 *
 * Like `crypto.timingSafeEqual`, but works with strings and doesn't throw if
 * lengths differ.
 *
 * @template {string | NodeJS.ArrayBufferView} T
 * @param {T} a
 * @param {T} b
 * @returns {boolean}
 */
export default function timingSafeEqual(a, b) {
  const bufferA = bufferify(a)
  const bufferB = bufferify(b)
  return (
    bufferA.byteLength === bufferB.byteLength &&
    crypto.timingSafeEqual(bufferA, bufferB)
  )
}
