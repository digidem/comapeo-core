import { setTimeout as delay } from 'node:timers/promises'

/**
 * Poll until `condition()` returns truthy, or reject after `timeout` ms.
 *
 * @param {() => unknown} condition
 * @param {{ timeout?: number, interval?: number, message?: string }} [opts]
 * @returns {Promise<void>}
 */
export async function waitFor(
  condition,
  { timeout = 10_000, interval = 20, message = 'condition' } = {}
) {
  const deadline = Date.now() + timeout
  while (!condition()) {
    if (Date.now() > deadline) {
      throw new Error(`Timed out after ${timeout}ms waiting for ${message}`)
    }
    await delay(interval)
  }
}
