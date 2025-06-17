import { context as _context, trace } from '@opentelemetry/api'

/** @import { Context, Span, TracerProvider } from '@opentelemetry/api' */
/** @import { ExtendedSpanOptions, SpanCallback, TracingHelper } from './types.js' */

// https://www.w3.org/TR/trace-context/#examples-of-http-traceparent-headers
// If traceparent ends with -00 this trace will not be sampled
// the query engine needs the `10` for the span and trace id otherwise it does not parse this
const nonSampledTraceParent = `00-10-10-00`

/**
 * @implements {TracingHelper}
 */
export class ActiveTracingHelper {
  #tracerProvider

  /**
   * @param {object} opts
   * @param {TracerProvider} opts.tracerProvider
   */
  constructor({ tracerProvider }) {
    this.#tracerProvider = tracerProvider
  }

  /**
   * @returns {boolean}
   */
  isEnabled() {
    return true
  }

  /**
   * @param {Context} [context]
   * @returns {string}
   */
  getTraceParent(context) {
    const span = trace.getSpanContext(context ?? _context.active())
    if (span) {
      return `00-${span.traceId}-${span.spanId}-0${span.traceFlags}`
    }
    return nonSampledTraceParent
  }

  /**
   * @returns {Context | undefined}
   */
  getActiveContext() {
    return _context.active()
  }

  /**
   * @template R
   * @param {string | ExtendedSpanOptions} options
   * @param {SpanCallback<R>} callback
   * @returns {R}
   */
  runInChildSpan(options, callback) {
    if (typeof options === 'string') {
      options = { name: options }
    }

    const tracer = this.#tracerProvider.getTracer('comapeo')
    const context = options.context ?? this.getActiveContext()
    const name = `comapeo:core:${options.name}`

    // these spans will not be nested by default even in recursive calls
    // it's useful for showing middleware sequentially instead of nested
    if (options.active === false) {
      const span = tracer.startSpan(name, options, context)
      return endSpan(span, callback(span, context))
    }

    // by default spans are "active", which means context is propagated in
    // nested calls, which is useful for representing most of the calls
    return tracer.startActiveSpan(name, options, (span) =>
      endSpan(span, callback(span, context))
    )
  }

  /**
   * @template {object} T
   * @param {T} instance
   * @param {import('./types.js').DecoratorsFor<T>} decorators
   * @returns {T}
   */
  instrument(instance, decorators) {
    const _this = this
    /** @type {ProxyHandler<T>} */
    const handler = {
      get(target, prop) {
        const value = Reflect.get(target, prop)
        if (
          !_this.isEnabled() ||
          typeof value !== 'function' ||
          !(prop in decorators)
        ) {
          return value
        }

        /** @param {any} args */
        return function (...args) {
          const spanOptionsGenerator =
            decorators[/** @type {keyof typeof decorators} */ (prop)]
          if (!spanOptionsGenerator) return value.apply(target, args)
          const spanOptions =
            typeof spanOptionsGenerator === 'function'
              ? spanOptionsGenerator(...args)
              : spanOptionsGenerator
          return _this.runInChildSpan(spanOptions, value.bind(target, ...args))
        }
      },
    }
    return new Proxy(instance, handler)
  }
}

/**
 * @template T
 * @param {Span} span
 * @param {T} result
 * @returns {T}
 */
function endSpan(span, result) {
  if (isPromiseLike(result)) {
    return /** @type {T} */ (
      result.then(
        (value) => {
          span.end()
          return value
        },
        (reason) => {
          span.end()
          throw reason
        }
      )
    )
  }
  span.end()
  return result
}

/**
 * @param {unknown} obj
 * @returns {obj is PromiseLike<unknown>}
 */
function isPromiseLike(obj) {
  return (
    !!obj &&
    (typeof obj === 'object' || typeof obj === 'function') &&
    'then' in obj &&
    typeof obj.then === 'function'
  )
}
