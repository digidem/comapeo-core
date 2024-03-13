// @ts-check
import test from 'brittle'
import {
  assert,
  ExhaustivenessError,
  setHas,
  onceSatisfied,
} from '../src/utils.js'
import { TypedEmitter } from 'tiny-typed-emitter'

test('assert()', (t) => {
  t.execution(() => assert(true, 'should work'))
  t.exception(() => assert(false, 'uh oh'), /uh oh/)
})

test('ExhaustivenessError', (t) => {
  const bools = [true, false]
  t.execution(() => {
    bools.forEach((bool) => {
      switch (bool) {
        case true:
        case false:
          break
        default:
          throw new ExhaustivenessError(bool)
      }
    })
  })
})

test('setHas()', (t) => {
  const set = new Set([1, 2, 3])
  t.ok(setHas(set)(1))
  t.absent(setHas(set)(9))
})

test('onceSatisfied() resolves when the check matches', async (t) => {
  /** @type {TypedEmitter<{ e: (a: string, b: number) => void }>} */
  const emitter = new TypedEmitter()

  let checkCallCount = 0
  /** @type {Promise<[string, number]>} */
  const promise = onceSatisfied(emitter, 'e', (a, b) => {
    checkCallCount++
    return a.toUpperCase() === 'A' && b > 0
  })
  emitter.emit('e', 'x', 3)
  emitter.emit('e', 'y', 2)
  emitter.emit('e', 'a', 1)
  t.alike(await promise, ['a', 1], 'resolves with the right args')

  emitter.emit('e', 'z', 0)
  emitter.emit('e', 'a', 9)
  t.is(checkCallCount, 3, 'stops listening after resolving')
})

test('onceSatisfied() handles events with no arguments', async (t) => {
  /** @type {TypedEmitter<{ e: () => void }>} */
  const emitter = new TypedEmitter()

  let checkCallCount = 0
  /** @type {Promise<[]>} */
  const promise = onceSatisfied(emitter, 'e', (...args) => {
    t.is(args.length, 0, 'checker gets no args')
    checkCallCount++
    return checkCallCount === 3
  })
  emitter.emit('e')
  emitter.emit('e')
  emitter.emit('e')
  t.alike(await promise, [], 'resolves with no args')
})

test('onceSatisfied() abort', async (t) => {
  /** @type {TypedEmitter<{ e: () => void }>} */
  const emitter = new TypedEmitter()

  const abortController = new AbortController()
  const promise = onceSatisfied(
    emitter,
    'e',
    () => {
      t.fail('should never be called')
      return false
    },
    { signal: abortController.signal }
  )
  abortController.abort()
  await t.exception(promise, 'rejects when aborted')
})

test('onceSatisfied() abort before starting', async (t) => {
  /** @type {TypedEmitter<{ e: () => void }>} */
  const emitter = new TypedEmitter()

  const abortedSignal = AbortSignal.abort()
  await t.exception(
    () =>
      onceSatisfied(
        emitter,
        'e',
        () => {
          t.fail('should never be called')
          return false
        },
        { signal: abortedSignal }
      ),
    'rejects immediately'
  )
})

test('onceSatisfied() rejects if check function rejects', async (t) => {
  /** @type {TypedEmitter<{ e: () => void }>} */
  const emitter = new TypedEmitter()

  const promise = onceSatisfied(emitter, 'e', () => {
    throw new Error('check fails')
  })
  emitter.emit('e')
  await t.exception(promise, 'rejects when check throws')
})
