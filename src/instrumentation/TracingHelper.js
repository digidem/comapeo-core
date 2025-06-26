/** @import { TracingHelper } from './types.js' */

/** @type {TracingHelper} */
export const disabledTracingHelper = {
  isEnabled() {
    return false
  },
  getTraceParent() {
    // https://www.w3.org/TR/trace-context/#examples-of-http-traceparent-headers
    // If traceparent ends with -00 this trace will not be sampled
    // the query engine needs the `10` for the span and trace id otherwise it does not parse this
    return `00-10-10-00`
  },

  getActiveContext() {
    return undefined
  },

  runInChildSpan(_, callback) {
    return callback()
  },
}

/**
 * Tracing helper that can dynamically switch between enabled/disabled states
 * Needed because tracing can be disabled and enabled with the calls to
 * PrismaInstrumentation::disable/enable at any point
 * @implements {TracingHelper}
 */
class DynamicTracingHelper {
  isEnabled() {
    return this.#getGlobalTracingHelper().isEnabled()
  }
  /** @type {TracingHelper['getTraceParent']} */
  getTraceParent(context) {
    return this.#getGlobalTracingHelper().getTraceParent(context)
  }

  getActiveContext() {
    return this.#getGlobalTracingHelper().getActiveContext()
  }

  /** @type {TracingHelper['runInChildSpan']} */
  runInChildSpan(options, callback) {
    return this.#getGlobalTracingHelper().runInChildSpan(options, callback)
  }

  /** @returns {TracingHelper} */
  #getGlobalTracingHelper() {
    const fallbackPrismaInstrumentationGlobal =
      globalThis.COMAPEO_CORE_INSTRUMENTATION

    return fallbackPrismaInstrumentationGlobal?.helper ?? disabledTracingHelper
  }
}

/** @returns {TracingHelper} */
export function getTracingHelper() {
  return new DynamicTracingHelper()
}
