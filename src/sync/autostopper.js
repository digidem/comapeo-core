import { ExhaustivenessError, assert } from '../utils.js'

/**
 * @internal
 * @typedef {(
 *   | { type: 'incomplete' }
 *   | {
 *     type: 'done';
 *     doneAt: number;
 *     timeoutId: null | ReturnType<typeof setTimeout>;
 *   }
 *   | { type: 'stopped' }
 * )} AutostopperState
 */

/**
 * `Autostopper` manages auto-stop state for sync.
 *
 * Tell `Autostopper` the current state of sync (is it done?) and your desired
 * `autoStopAfter` and it will manage the rest.
 *
 * Some details:
 *
 * - `autostopAfter` can be `0` if you want to stop sync as soon as it's done.
 *
 * - `autostopAfter` can be `Infinity` if you never want to auto-stop.
 *
 * - Changing `autostopAfter` does not restart the timer. For example, imagine
 *   `autostopAfter` is `100` and sync completes at time `T`. If you change
 *   `autostopAfter` to `200` at time `T < 100`, the timer will fire at time
 *   `T + 200`.
 */
export default class Autostopper {
  /** @type {AutostopperState} */
  #state = { type: 'incomplete' }
  #stop
  #autostopAfter = Infinity

  /**
   * Construct an `Autostopper`. By default, `isDone` is `false` and
   * `autoStopAfter` is `Infinity`; change this by calling {@link update}.
   *
   * @param {() => void} stop The function to call when it's time to auto-stop.
   */
  constructor(stop) {
    this.#stop = stop
  }

  /** @returns {boolean} */
  get #isDone() {
    switch (this.#state.type) {
      case 'incomplete':
        return false
      case 'done':
      case 'stopped':
        return true
      default:
        throw new ExhaustivenessError(this.#state)
    }
  }

  /**
   * Update the state of the autostopper.
   *
   * @param {object} options
   * @param {number} [options.autostopAfter] How long to wait before auto-stopping, in milliseconds.
   * @param {boolean} [options.isDone] Is sync complete?
   */
  update(options) {
    if (typeof options.autostopAfter === 'number') {
      assert(
        options.autostopAfter >= 0,
        'autostopAfter must be a non-negative number'
      )
      this.#autostopAfter = options.autostopAfter
    }
    const isDone = options.isDone ?? this.#isDone

    this.#clearTimeoutIfExists()

    if (!isDone) {
      this.#state = { type: 'incomplete' }
      return
    }

    switch (this.#state.type) {
      case 'incomplete':
        this.#state = this.#doneState(Date.now())
        break
      case 'done':
        this.#state = this.#doneState(this.#state.doneAt)
        break
      case 'stopped':
        break
      default:
        throw new ExhaustivenessError(this.#state)
    }
  }

  /** @returns {void} */
  #clearTimeoutIfExists() {
    if (this.#state.type === 'done' && this.#state.timeoutId !== null) {
      clearTimeout(this.#state.timeoutId)
    }
  }

  /**
   * @param {number} doneAt
   * @returns {AutostopperState}
   */
  #doneState(doneAt) {
    /** @type {AutostopperState} */
    const result = { type: 'done', doneAt, timeoutId: null }

    if (Number.isFinite(this.#autostopAfter)) {
      const timeoutMs = Math.max(doneAt + this.#autostopAfter - Date.now(), 0)
      result.timeoutId = setTimeout(() => {
        this.#state = { type: 'stopped' }
        this.#stop()
      }, timeoutMs).unref()
    }

    return result
  }
}
