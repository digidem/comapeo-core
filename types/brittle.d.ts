// Types generated from brittle readme with chatgpt

declare module 'brittle' {
  interface Assertion {
    is(actual: any, expected: any, message?: string): void
    not(actual: any, expected: any, message?: string): void
    alike(actual: any, expected: any, message?: string): void
    unlike(actual: any, expected: any, message?: string): void
    ok(value: any, message?: string): void
    absent(value: any, message?: string): void
    pass(message?: string): void
    fail(message?: string): void
    exception<T>(
      fn: T | Promise<T>,
      error?: RegExp | Error,
      message?: string
    ): Promise<void>
    exception<T>(fn: T | Promise<T>, message?: string): Promise<void>
    'exception.all'<T>(
      fn: T | Promise<T>,
      error?: RegExp | Error,
      message?: string
    ): Promise<void>
    'exception.all'<T>(fn: T | Promise<T>, message?: string): Promise<void>
    execution<T>(fn: T | Promise<T>, message?: string): Promise<number>
    'is.coercively'(actual: any, expected: any, message?: string): void
    'not.coercively'(actual: any, expected: any, message?: string): void
    'alike.coercively'(actual: any, expected: any, message?: string): void
    'unlike.coercively'(actual: any, expected: any, message?: string): void
  }

  interface TestOptions {
    timeout?: number
    solo?: boolean
    skip?: boolean
    todo?: boolean
  }

  export interface TestInstance extends Assertion {
    plan(n: number): void
    teardown(fn: () => void | Promise<void>, options?: { order?: number }): void
    timeout(ms: number): void
    comment(message: string): void
    end(): void
    test(
      name: string,
      options: TestOptions,
      callback: (t: TestInstance) => void | Promise<void>
    ): Promise<boolean>
    test(
      name: string,
      callback: (t: TestInstance) => void | Promise<void>
    ): Promise<boolean>
    test(name: string, options: TestOptions): TestInstance
    test(options: TestOptions): TestInstance
  }

  type TestCallback = (t: TestInstance) => void | Promise<void>

  function test(
    name: string,
    options: TestOptions,
    callback: TestCallback
  ): Promise<boolean>
  function test(name: string, callback: TestCallback): Promise<boolean>
  function test(name: string, options: TestOptions): TestInstance
  function test(options: TestOptions): TestInstance
  function solo(
    name: string,
    options: TestOptions,
    callback: TestCallback
  ): Promise<boolean>
  function solo(name: string, callback: TestCallback): Promise<boolean>
  function solo(options: TestOptions): TestInstance
  function skip(
    name: string,
    options: TestOptions,
    callback: TestCallback
  ): Promise<boolean>
  function skip(name: string, callback: TestCallback): void
  function configure(options: TestOptions): void

  export { test, solo, skip, configure }
}
