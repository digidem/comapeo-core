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

test('onceSatisfied()', async (t) => {
  /**
   * @typedef {object} Events
   * @property {(a: string, b: number) => void} foo
   * @property {(x: boolean) => void} bar
   * @property {() => void} baz
   * @property {() => void} qux
   */
  /** @type {TypedEmitter<Events>} */
  const emitter = new TypedEmitter()

  const { signal } = new AbortController()

  /** @type {Promise<null | [string, number]>} */
  const fooPromise = onceSatisfied(
    emitter,
    'foo',
    (a, b) => a.toUpperCase() === 'A' && b > 0,
    { signal }
  )
  emitter.emit('foo', 'x', 3)
  emitter.emit('foo', 'y', 2)
  emitter.emit('foo', 'a', 1)
  emitter.emit('foo', 'z', 0)
  t.alike(await fooPromise, ['a', 1], 'resolves with the right args')

  /** @type {Promise<null | [boolean]>} */
  const barPromise = onceSatisfied(emitter, 'bar', (v) => v, { signal })
  emitter.emit('bar', false)
  emitter.emit('bar', true)
  t.alike(await barPromise, [true], 'resolves with the right args')

  let bazCount = 0
  /** @type {Promise<null | []>} */
  const bazPromise = onceSatisfied(
    emitter,
    'baz',
    function () {
      t.is(arguments.length, 0, 'checker gets no args')
      bazCount++
      return bazCount === 3
    },
    { signal }
  )
  emitter.emit('baz')
  emitter.emit('baz')
  emitter.emit('baz')
  t.is(bazCount, 3)
  t.alike(await bazPromise, [], 'resolves with no args')

  const quxController = new AbortController()
  /** @type {Promise<null | []>} */
  const quxPromise = onceSatisfied(
    emitter,
    'qux',
    () => {
      t.fail('should never be called')
      return false
    },
    {
      signal: quxController.signal,
    }
  )
  quxController.abort()
  t.is(await quxPromise, null, 'resolves with null when aborted')
})
