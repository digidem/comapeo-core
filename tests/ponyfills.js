// @ts-check
import test from 'brittle'
import { promiseWithResolvers } from '../src/ponyfills.js'

test('promiseWithResolvers() returns a promise, resolve fn, and reject fn', async (t) => {
  {
    const { promise, resolve } = promiseWithResolvers()
    resolve()
    t.is(await promise, undefined, 'resolves properly with no type argument')
  }

  {
    const { promise, resolve } =
      /** @type {typeof promiseWithResolvers<string>} */
      (promiseWithResolvers)()
    resolve('foo')
    t.is(await promise, 'foo', 'resolves properly')
  }

  {
    const { promise, reject } = promiseWithResolvers()
    reject(new Error('bar'))
    await t.exception(promise, /bar/, 'rejects properly')
  }
})
