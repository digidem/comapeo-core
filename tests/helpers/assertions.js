// @ts-check

/**
 * @overload
 * @param {import('tape').Test} t
 * @param {(() => unknown | PromiseLike<unknown>)} fnOrPromise
 * @param {string | RegExp | (new () => Error)} [expectedOrMessage]
 * @returns {Promise<void>}
 */
/**
 * @param {import('tape').Test} t
 * @param {(() => unknown | PromiseLike<unknown>)} fnOrPromise
 * @param {RegExp | (new () => Error)} expected
 * @param {string} [message]
 * @returns {Promise<void>}
 */
export async function rejects(t, fnOrPromise, expected, message) {
  /** @type {null | RegExp | (new () => Error)} */
  let actualExpected
  /** @type {string} */
  let actualMessage

  switch (arguments.length) {
    case 2:
      actualExpected = null
      actualMessage = 'should reject'
      break
    case 3:
      if (typeof expected === 'string') {
        actualExpected = null
        actualMessage = expected
      } else {
        actualExpected = expected
        actualMessage = 'should reject'
      }
      break
    case 4:
      actualExpected = expected
      actualMessage = message || 'should reject'
      break
    default:
      throw new Error(`reject() received the wrong number of arguments`)
  }

  try {
    await ('then' in fnOrPromise ? fnOrPromise : fnOrPromise())
    t.fail(actualMessage)
  } catch (err) {
    if (actualExpected === null) {
      t.pass(actualMessage)
    } else if (actualExpected instanceof RegExp) {
      t.ok(actualExpected.test(String(err)), actualMessage)
    } else {
      t.ok(err instanceof actualExpected, actualMessage)
    }
  }
}
