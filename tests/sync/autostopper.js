// @ts-check
import { mock, test } from 'node:test'
import assert from 'node:assert/strict'
import fakeTimers from '@sinonjs/fake-timers'
import Autostopper from '../../src/sync/autostopper.js'

test('Autostopper', async (t) => {
  /** @type {ReturnType<fakeTimers.install>} */ let clock

  t.beforeEach(() => {
    clock = fakeTimers.install()
  })

  t.afterEach(() => {
    clock.uninstall()
  })

  await t.test('stop is not called when Autostopper is instantiated', () => {
    const stop = mock.fn()

    new Autostopper(stop)

    clock.runAll()
    assert.strictEqual(stop.mock.callCount(), 0, 'no timers are started')
  })

  await t.test('autostop timeout is infinite to start', () => {
    const stop = mock.fn()
    const autostopper = new Autostopper(stop)

    autostopper.update({ isDone: true })
    clock.runAll()
    assert.strictEqual(stop.mock.callCount(), 0, 'no timers are started')
  })

  await t.test('autostop timeout can be set', () => {
    const stop = mock.fn()
    const autostopper = new Autostopper(stop)

    autostopper.update({ isDone: true, autostopAfter: 100 })

    assert.strictEqual(stop.mock.callCount(), 0)

    clock.tick(99)
    assert.strictEqual(stop.mock.callCount(), 0)

    clock.tick(1)
    assert.strictEqual(stop.mock.callCount(), 1)
  })

  await t.test(
    'autostop timeout can be updated from ∞ to a finite time, and the some of the time is "used up"',
    () => {
      const stop = mock.fn()
      const autostopper = new Autostopper(stop)
      autostopper.update({ isDone: true, autostopAfter: Infinity })
      clock.tick(100)

      autostopper.update({ autostopAfter: 150 })

      clock.tick(49)
      assert.strictEqual(stop.mock.callCount(), 0)

      clock.tick(1)
      assert.strictEqual(stop.mock.callCount(), 1)
    }
  )

  await t.test(
    'autostop timeout can be updated from ∞ to a finite time, and stop runs immediately if enough time has passed',
    () => {
      const stop = mock.fn()
      const autostopper = new Autostopper(stop)
      autostopper.update({ isDone: true, autostopAfter: Infinity })

      clock.tick(100)

      autostopper.update({ autostopAfter: 50 })

      clock.next()
      assert.strictEqual(stop.mock.callCount(), 1)
    }
  )

  await t.test(
    'autostop timeout can go from a finite time to an infinite time, canceling the timeout',
    () => {
      const stop = mock.fn()
      const autostopper = new Autostopper(stop)
      autostopper.update({ isDone: true, autostopAfter: 100 })
      autostopper.update({ autostopAfter: Infinity })

      clock.runAll()

      assert.strictEqual(stop.mock.callCount(), 0)
    }
  )

  await t.test('timeout is canceled if isDone goes back to `false`', () => {
    const stop = mock.fn()
    const autostopper = new Autostopper(stop)
    autostopper.update({ isDone: true, autostopAfter: 100 })
    autostopper.update({ isDone: false })

    clock.runAll()

    assert.strictEqual(stop.mock.callCount(), 0)
  })

  await t.test('stop is only one once per "cycle"', () => {
    const stop = mock.fn()
    const autostopper = new Autostopper(stop)
    autostopper.update({ isDone: true, autostopAfter: 100 })

    clock.tick(100)
    assert.strictEqual(stop.mock.callCount(), 1)

    autostopper.update({ isDone: true, autostopAfter: 999 })
    clock.runAll()
    autostopper.update({ isDone: true, autostopAfter: Infinity })
    clock.runAll()
    autostopper.update({ isDone: true, autostopAfter: 999 })
    clock.runAll()
    assert.strictEqual(stop.mock.callCount(), 1)

    autostopper.update({ isDone: false })
    autostopper.update({ isDone: true, autostopAfter: 123 })
    clock.tick(123)
    assert.strictEqual(stop.mock.callCount(), 2)
  })

  await t.test('update throws if passed an invalid autostop time', () => {
    const autostopper = new Autostopper(() => {})

    assert.throws(() => autostopper.update({ autostopAfter: -1 }))
    assert.throws(() => autostopper.update({ autostopAfter: -Infinity }))
    assert.throws(() => autostopper.update({ autostopAfter: NaN }))
  })
})
