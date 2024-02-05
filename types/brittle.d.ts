// Types generated from brittle readme with chatgpt

declare module 'brittle' {
  interface CoercibleAssertion {
    (actual: any, expected: any, message?: string): void
    coercively(actual: any, expected: any, message?: string): void
  }

  type AnyErrorConstructor = new () => Error

  interface ExceptionAssertion {
    (fn: () => unknown, message?: string): void
    (
      fn: () => unknown,
      error?: RegExp | AnyErrorConstructor,
      message?: string
    ): void
    (fn: Promise<unknown>, message?: string): Promise<void>
    (
      fn: Promise<unknown>,
      error?: RegExp | AnyErrorConstructor,
      message?: string
    ): Promise<void>
    all(fn: () => unknown, message?: string): void
    all(
      fn: () => unknown,
      error?: RegExp | AnyErrorConstructor,
      message?: string
    ): void
    all(fn: Promise<unknown>, message?: string): Promise<void>
    all(
      fn: Promise<unknown>,
      error?: RegExp | AnyErrorConstructor,
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
    test: TestFn
  }

  type TestCallback = (t: TestInstance) => void | Promise<void>

  interface TestFn {
    // The brittle docs suggest the return value is `Promise<boolean>` but this is not the case.
    (
      name: string,
      options: TestOptions,
      callback: (t: TestInstance) => void | Promise<void>
    ): Promise<void>
    (
      name: string,
      callback: (t: TestInstance) => void | Promise<void>
    ): Promise<void>
    (callback: (t: TestInstance) => void | Promise<void>): Promise<void>
    (name: string, options: TestOptions): TestInstance
    (name: string): TestInstance
    (): TestInstance
    // The docs suggest the below is possible, but it isn't
    // (options: TestOptions): TestInstance
  }

  interface Test extends TestFn {
    test: Test
    solo: TestFn
    skip: TestFn
  }

  export const solo: TestFn
  export const skip: TestFn
  export const test: Test
  export function configure(options: TestOptions): void

  export default test
}
