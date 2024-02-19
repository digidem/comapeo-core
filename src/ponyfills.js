// @ts-check

/**
 * @template T
 * @typedef {object} PromiseWithResolvers
 * @prop {Promise<T>} promise
 * @prop {(value: T | PromiseLike<T>) => void} resolve
 * @prop {(reason?: unknown) => void} reject
 */

/**
 * Ponyfill of [`Promise.withResolvers()`][0].
 *
 * Doesn't support being called on non-Promise constructors like the real thing.
 *
 * [0]: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Promise/withResolvers
 *
 * @template [T=void]
 * @returns {PromiseWithResolvers<T>}
 */
export function promiseWithResolvers() {
  /** @type {any} */ let resolve
  /** @type {any} */ let reject

  /** @type {Promise<T>} */
  const promise = new Promise((res, rej) => {
    resolve = res
    reject = rej
  })

  return { promise, resolve, reject }
}
