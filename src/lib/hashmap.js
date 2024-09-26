/** @import { Primitive } from 'type-fest' */

/**
 * `Map` uses same-value-zero equality for keys, which makes it more difficult
 * to use reference types like buffers.
 *
 * `HashMap` is very similar to `Map`, but accepts a hash function for keys.
 * This function should return a primitive, such as a number or string, which
 * will be used as the key.
 *
 * It doesn't contain all the functionality of `Map` because we don't need it,
 * but it should be fairly easy to update as needed.
 *
 * @template K
 * @template {unknown} V
 * @example
 * const join = (arr) => arr.join(' ')
 *
 * const map = new HashMap(join)
 *
 * map.set([1, 2], 3)
 * map.get([1, 2])
 * // => 3
 */
export default class HashMap {
  #hash

  /** @type {Map<Primitive, V>} */
  #realMap = new Map()

  /**
   * @param {(key: K) => Primitive} hash
   * @param {Iterable<[K, V]>} [iterable=[]]
   */
  constructor(hash, iterable = []) {
    this.#hash = hash
    for (const [key, value] of iterable) this.set(key, value)
  }

  /**
   * @returns {number}
   */
  get size() {
    return this.#realMap.size
  }

  /**
   * @param {K} key The key to remove.
   * @returns {boolean} `true` if the key was present and removed, `false` otherwise.
   */
  delete(key) {
    const realKey = this.#hash(key)
    return this.#realMap.delete(realKey)
  }

  /**
   * @param {K} key The key to look up.
   * @returns {undefined | V} The element associated with `key`, or `undefined` if it's not present.
   */
  get(key) {
    const realKey = this.#hash(key)
    return this.#realMap.get(realKey)
  }

  /**
   * @param {K} key The key to look up.
   * @returns {boolean} `true` if `key` is present in the map, `false` otherwise.
   */
  has(key) {
    const realKey = this.#hash(key)
    return this.#realMap.has(realKey)
  }

  /**
   * @param {K} key The key to update.
   * @param {V} value The value to add at `key`.
   * @returns {this} The map.
   */
  set(key, value) {
    const realKey = this.#hash(key)
    this.#realMap.set(realKey, value)
    return this
  }

  /**
   * @returns {IterableIterator<V>}
   */
  values() {
    return this.#realMap.values()
  }
}
