import createDebug from 'debug'
import { discoveryKey } from 'hypercore-crypto'
import mapObject from 'map-obj'
import util from 'util'

const TRIM = 7

createDebug.formatters.h = function (v) {
  if (!Buffer.isBuffer(v)) return '[undefined]'
  return v.toString('hex').slice(0, TRIM)
}

createDebug.formatters.S = function (v) {
  if (typeof v !== 'string') return '[undefined]'
  return v.slice(0, 7)
}

createDebug.formatters.k = function (v) {
  if (!Buffer.isBuffer(v)) return '[undefined]'
  return discoveryKey(v).toString('hex').slice(0, TRIM)
}

/**
 * @param {import('./sync/sync-state.js').State} v
 * @this {any} */
createDebug.formatters.X = function (v) {
  try {
    const mapped = mapObject(v, (k, v) => [
      k,
      // @ts-ignore - type checks here don't get us anything
      mapObject(v, (k, v) => {
        if (k === 'remoteStates') {
          // @ts-ignore - type checks here don't get us anything
          return [k, mapObject(v, (k, v) => [k.slice(0, 7), v])]
        }
        return [k, v]
      }),
    ])
    return util.inspect(mapped, {
      colors: true,
      depth: 10,
      compact: 6,
      breakLength: 90,
    })
  } catch (e) {
    return `[ERROR: $(e.message)]`
  }
}

const counts = new Map()

export class Logger {
  #baseLogger
  #log

  /**
   * @param {string} ns
   * @param {Logger} [logger]
   */
  static create(ns, logger) {
    if (logger) return logger.extend(ns)
    const i = (counts.get(ns) || 0) + 1
    counts.set(ns, i)
    const deviceId = String(i).padStart(TRIM, '0')
    return new Logger({ deviceId, ns })
  }

  /**
   * @param {object} opts
   * @param {string} opts.deviceId
   * @param {createDebug.Debugger} [opts.baseLogger]
   * @param {string} [opts.ns]
   */
  constructor({ deviceId, baseLogger, ns }) {
    this.deviceId = deviceId
    this.#baseLogger = baseLogger || createDebug('mapeo' + (ns ? `:${ns}` : ''))
    this.#log = this.#baseLogger.extend(this.deviceId.slice(0, TRIM))
  }
  get enabled() {
    return this.#log.enabled
  }

  /**
   * @param  {Parameters<createDebug.Debugger>} args
   */
  log = (...args) => {
    this.#log.apply(this, args)
  }
  /**
   *
   * @param {string} ns
   */
  extend(ns) {
    return new Logger({
      deviceId: this.deviceId,
      baseLogger: this.#baseLogger.extend(ns),
    })
  }
}
