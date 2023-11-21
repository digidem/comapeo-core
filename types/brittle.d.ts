// Types generated from brittle readme with chatgpt

declare module 'brittle' {
  interface CoercibleAssertion {
    (actual: any, expected: any, message?: string): void
    coercively(actual: any, expected: any, message?: string): void
  }

  interface ExceptionAssertion {
    <T>(
      fn: T | Promise<T>,
      error?: RegExp | Error,
      message?: string
    ): Promise<void>
    <T>(fn: T | Promise<T>, message?: string): Promise<void>
    all<T>(fn: T | Promise<T>, message?: string): Promise<void>
    all<T>(
      fn: T | Promise<T>,
      error?: RegExp | Error,
      message?: string
    ): Promise<void>
  }

  interface Assertion {
    is: CoercibleAssertion
    not: CoercibleAssertion
    alike: CoercibleAssertion
    unlike: CoercibleAssertion
    ok(value: any, message?: string): void
    absent(value: any, message?: string): void
    pass(message?: string): void
    fail(message?: string): void
    exception: ExceptionAssertion
    execution<T>(fn: T | Promise<T>, message?: string): Promise<number>
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
