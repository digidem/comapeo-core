import type { Context, Span, SpanOptions } from '@opentelemetry/api'

export type SpanCallback<R> = (span?: Span, context?: Context) => R

export type ExtendedSpanOptions = SpanOptions & {
  /** The name of the span */
  name: string
  /** Whether it propagates context (?=true) */
  active?: boolean
  /** The context to append the span to */
  context?: Context
}

export type HrTime = [number, number]

export type LogLevel = 'trace' | 'debug' | 'info' | 'warn' | 'error' | 'query'

export type DecoratorsFor<T extends object> = {
  [K in keyof T as T[K] extends (...args: any) => any
    ? K
    : never]?: T[K] extends (...args: infer P) => any
    ? ((...args: P) => ExtendedSpanOptions) | ExtendedSpanOptions
    : never
}

export interface TracingHelper {
  isEnabled(): boolean
  getTraceParent(context?: Context): string

  getActiveContext(): Context | undefined

  runInChildSpan<R>(
    nameOrOptions: string | ExtendedSpanOptions,
    callback: SpanCallback<R>
  ): R

  instrument<T extends object>(instance: T, decorators: DecoratorsFor<T>): T
}

export type ComapeoCoreInstrumentationGlobalValue = {
  helper?: TracingHelper
}

declare global {
  // eslint-disable-next-line no-var
  var COMAPEO_CORE_INSTRUMENTATION:
    | ComapeoCoreInstrumentationGlobalValue
    | undefined
}
