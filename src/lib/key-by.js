import { DuplicateKeyError } from '../errors.js'

/**
 * Like [`Map.groupBy`][0], but the result's values aren't arrays.
 *
 * If multiple values resolve to the same key, an error is thrown.
 *
 * [0]: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Map/groupBy
 *
 * @template T
 * @template K
 * @param {Iterable<T>} items
 * @param {(item: T) => K} callbackFn
 * @returns {Map<K, T>}
 */
export function keyBy(items, callbackFn) {
  /** @type {Map<K, T>} */ const result = new Map()
  for (const item of items) {
    const key = callbackFn(item)
    if (result.has(key)) {
      throw new DuplicateKeyError(key)
    }
    result.set(key, item)
  }
  return result
}
