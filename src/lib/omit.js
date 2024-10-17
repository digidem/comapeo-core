/**
 * Returns a new object with the own enumerable keys of `obj` that are not in `keys`.
 *
 * In other words, remove some keys from an object.
 *
 * @template {object} T
 * @template {keyof T} K
 * @param {T} obj
 * @param {ReadonlyArray<K>} keys
 * @returns {Omit<T, K>}
 * @example
 * const obj = { foo: 1, bar: 2, baz: 3 }
 * omit(obj, ['foo', 'bar'])
 * // => { baz: 3 }
 */
export function omit(obj, keys) {
  /** @type {Partial<T>} */ const result = {}

  /** @type {Set<unknown>} */ const toOmit = new Set(keys)

  for (const key in obj) {
    if (!Object.hasOwn(obj, key)) continue
    if (toOmit.has(key)) continue
    result[key] = obj[key]
  }

  return /** @type {Omit<T, K>} */ (result)
}
