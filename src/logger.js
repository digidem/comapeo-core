import createDebug from 'debug'
import { discoveryKey } from 'hypercore-crypto'
import mapObject from 'map-obj'
import util from 'util'

const TRIM = 7

const selectColorOriginal = createDebug.selectColor

/**
 * Selects a color for a debug namespace (warning: overrides private api).
 * Rather than the default behaviour of creating a unique color for each
 * namespace, we only hash the last 7 characters of the namespace, which is the
 * deviceId. This results in debug output where each deviceId has a different
 * colour, which is more useful for debugging.
 * @param {string} namespace The namespace string for the debug instance to be colored
 * @return {number|string} An ANSI color code for the given namespace
 */
createDebug.selectColor = function (namespace) {
  if (!namespace.startsWith('mapeo:')) {
    return selectColorOriginal(namespace)
  }
  let hash = 0

  for (let i = namespace.length - TRIM - 1; i < namespace.length; i++) {
    hash = (hash << 5) - hash + namespace.charCodeAt(i)
    hash |= 0 // Convert to 32bit integer
  }

  // @ts-expect-error - private debug api
  return createDebug.colors[Math.abs(hash) % createDebug.colors.length]
}

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
   * @param {{ prefix?: string }} [opts]
   */
  static create(ns, logger, opts) {
    if (logger) return logger.extend(ns, opts)
    const i = (counts.get(ns) || 0) + 1
    counts.set(ns, i)
    const deviceId = String(i).padStart(TRIM, '0')
    return new Logger({ deviceId, ns, prefix: opts?.prefix })
  }

  /**
   * @param {object} opts
   * @param {string} opts.deviceId
   * @param {createDebug.Debugger} [opts.baseLogger]
   * @param {string} [opts.ns]
   * @param {string} [opts.prefix] optional prefix to add to the start of each log message. Used to add context e.g. the core ID that is syncing. Use this as an alternative to the debug namespace.
   */
  constructor({ deviceId, baseLogger, ns, prefix }) {
    this.deviceId = deviceId
    this.#baseLogger = baseLogger || createDebug('mapeo' + (ns ? `:${ns}` : ''))
    const log = this.#baseLogger.extend(this.deviceId.slice(0, TRIM))
    if (prefix) {
      this.#log = Object.assign(
        /**
         * @param {any} formatter
         * @param  {...any} args
         */
        (formatter, ...args) => {
          return log.apply(null, [`${prefix}${formatter}`, ...args])
        },
        log
      )
    } else {
      this.#log = log
    }
  }
  get log() {
    return this.#log
  }
  /**
   * @param {string} ns
   * @param {{ prefix?: string }} [opts]
   */
  extend(ns, { prefix } = {}) {
    return new Logger({
      deviceId: this.deviceId,
      baseLogger: this.#baseLogger.extend(ns),
      prefix,
    })
  }
}
