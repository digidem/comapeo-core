// @ts-check
import { assert, onceSatisfied } from '../../src/utils.js'

/**
 * @internal
 * @template {import('tiny-typed-emitter').ListenerSignature<L>} L
 * @typedef {import('tiny-typed-emitter').TypedEmitter<L>} TypedEmitter
 */

/**
 * @internal
 * @template {TypedEmitter<any>} T
 * @typedef {import('../../src/utils_types.d.ts').TypedEvents<T>} TypedEvents
 */

/**
 * @internal
 * @template {TypedEmitter<any>} T
 * @typedef {import('../../src/utils_types.d.ts').TypedEventsFor<T>} TypedEventsFor
 */

/**
 * @internal
 * @template {TypedEmitter<any>} Emitter
 * @template {TypedEventsFor<Emitter>} Event
 * @typedef {import('../../src/utils_types.d.ts').TypedEventArgs<Emitter, Event>} TypedEventArgs
 */

/**
 * Like `once`, but listens to events up to a certain number of times.
 *
 * @template {TypedEmitter<any>} Emitter
 * @template {TypedEventsFor<Emitter>} Event
 * @param {Emitter} emitter
 * @param {Event} eventName
 * @param {number} count
 * @returns {Promise<TypedEventArgs<Emitter, Event>[]>}
 */
export async function onTimes(emitter, eventName, count) {
  assert(
    Number.isSafeInteger(count) && count >= 0,
    'onTimes called with an invalid count'
  )

  /** @type {TypedEventArgs<Emitter, Event>[]} */
  const result = []

  if (count === 0) return result

  await onceSatisfied(emitter, eventName, (...args) => {
    result.push(args)
    return result.length === count
  })

  return result
}
