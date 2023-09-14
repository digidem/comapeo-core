declare module 'quickbit-universal' {
  type BitField = TypedArray

  export function get(field: BitField, bit: number): boolean

  export function set(field: BitField, bit: number, value?: boolean): boolean

  export function fill(
    field: BitField,
    value: boolean,
    start?: number,
    end?: number
  ): BitField

  export function clear(
    field: BitField,
    chunk: { field: BitField; offset: number }
  ): void

  export function findFirst(
    field: BitField,
    value: boolean,
    position?: number
  ): number

  export function findLast(
    field: BitField,
    value: boolean,
    position?: number
  ): number

  class DenseIndex extends Index {
    constructor(field: BitField, byteLength: number)
    update(bit: number): boolean
  }

  type Chunk = { field: BitField; offset: number }

  class SparseIndex extends Index {
    constructor(chunks: Chunk[], byteLength: number)
    readonly chunks: Chunk[]
    update(bit: number): boolean
  }

  export class Index {
    static from(field: BitField, byteLength: number): DenseIndex
    static from(chunks: Chunk[], byteLength: number): SparseIndex

    constructor(byteLength: number)

    readonly byteLength: number

    update(bit: number): boolean

    skipFirst(value: boolean, position?: number): number

    skipLast(value: boolean, position?: number): number
  }
}
