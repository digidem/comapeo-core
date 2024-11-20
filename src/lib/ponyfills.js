/**
 * Ponyfill of `AbortSignal.any()`.
 *
 * [0]: https://developer.mozilla.org/en-US/docs/Web/API/AbortSignal/any_static
 *
 * @param {Iterable<AbortSignal>} iterable
 * @returns {AbortSignal}
 */
export function abortSignalAny(iterable) {
  for (const signal of iterable) {
    if (signal.aborted) return AbortSignal.abort(signal.reason)
  }

  /** @type {Array<() => unknown>} */
  const listeners = []
  const controller = new AbortController()

  for (const signal of iterable) {
    const listener = () => controller.abort(signal.reason)
    signal.addEventListener('abort', listener)
    listeners.push(listener)
  }

  return controller.signal
}

/**
 * Ponyfill of `Set.prototype.isSubsetOf()`.
 *
 * [1]: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Set/isSubsetOf
 *
 * @param {ReadonlySet<unknown>} me
 * @param {ReadonlySet<unknown>} other
 * @returns {boolean}
 */
export function setIsSubsetOf(me, other) {
  for (const value of me) {
    if (!other.has(value)) return false
  }
  return true
}
