// @ts-check
import { promiseWithResolvers } from '../../src/ponyfills.js'
import { assert } from '../../src/utils.js'

/**
 * @internal
 * @typedef {import('node:events').EventEmitter} EventEmitter
 */

/**
 * Like `once`, but listens to events up to a certain number of times.
 *
 * @param {EventEmitter} emitter
 * @param {string | symbol} eventName
 * @param {number} count
 * @returns {Promise<any[][]>}
 */
export async function onTimes(emitter, eventName, count) {
  assert(
    Number.isSafeInteger(count) && count >= 0,
    'onTimes called with an invalid count'
  )

  /** @type {any[][]} */
  const result = []

  if (count === 0) return result

  const { promise, resolve } = promiseWithResolvers()

  let remaining = count

  /** @param {any[]} args */
  const listener = (...args) => {
    result.push(args)

    remaining--
    if (!remaining) {
      emitter.off(eventName, listener)
      resolve()
    }
  }
  emitter.on(eventName, listener)

  await promise
  return result
}
