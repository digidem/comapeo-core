declare module 'big-sparse-array' {
  class BigSparseArray<T> {
    constructor()

    readonly maxLength: number

    set(index: number, value: T): T

    get(index: number): T | undefined
  }
  export = BigSparseArray
}
