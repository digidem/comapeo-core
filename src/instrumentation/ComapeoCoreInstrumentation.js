import { trace } from '@opentelemetry/api'
import {
  InstrumentationBase,
  InstrumentationNodeModuleDefinition,
} from '@opentelemetry/instrumentation'

import { ActiveTracingHelper } from './ActiveTracingHelper.js'
import {
  GLOBAL_INSTRUMENTATION_ACCESSOR_KEY,
  MODULE_NAME,
  NAME,
  VERSION,
} from './constants.js'

/** @import {TracerProvider} from '@opentelemetry/api' */
/** @import {InstrumentationConfig} from '@opentelemetry/instrumentation' */
/** @import {ComapeoCoreInstrumentationGlobalValue} from './types.js' */

export class ComapeoCoreInstrumentation extends InstrumentationBase {
  /**
   * @type {TracerProvider | undefined}
   * @private
   */
  tracerProvider

  /**
   * @param {InstrumentationConfig} [config={}]
   */
  constructor(config = {}) {
    super(NAME, VERSION, config)
  }

  /**
   * @param {TracerProvider} tracerProvider
   * @returns {void}
   */
  setTracerProvider(tracerProvider) {
    this.tracerProvider = tracerProvider
  }

  /**
   * @returns {InstrumentationNodeModuleDefinition[]}
   */
  init() {
    const module = new InstrumentationNodeModuleDefinition(MODULE_NAME, [
      VERSION,
    ])

    return [module]
  }

  enable() {
    /** @type {ComapeoCoreInstrumentationGlobalValue} */
    const globalValue = {
      helper: new ActiveTracingHelper({
        tracerProvider: this.tracerProvider ?? trace.getTracerProvider(),
      }),
    }

    global[GLOBAL_INSTRUMENTATION_ACCESSOR_KEY] = globalValue
  }

  disable() {
    delete global[GLOBAL_INSTRUMENTATION_ACCESSOR_KEY]
  }

  /**
   * @returns {boolean}
   */
  isEnabled() {
    return Boolean(global[GLOBAL_INSTRUMENTATION_ACCESSOR_KEY])
  }
}
