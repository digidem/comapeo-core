import type { Simplify, TupleToUnion, ValueOf } from 'type-fest'
import { SUPPORTED_BLOB_TYPES } from './blob-store/index.js'

export type UniqueArray<T> = T extends readonly [infer X, ...infer Rest]
  ? InArray<Rest, X> extends true
    ? ['Encountered value with duplicates:', X]
    : readonly [X, ...UniqueArray<Rest>]
  : T

type InArray<T, X> = T extends readonly [X, ...infer _Rest]
  ? true
  : T extends readonly [X]
  ? true
  : T extends readonly [infer _, ...infer Rest]
  ? InArray<Rest, X>
  : false

type SupportedBlobTypes = typeof SUPPORTED_BLOB_TYPES
type BlobType = keyof SupportedBlobTypes
type BlobVariant = TupleToUnion<SupportedBlobTypes[BlobType]>

type BlobIdBase<T extends BlobType> = {
  /** Type of blob */
  type: T
  /** Blob variant (some blob types have smaller previews and thumbnails available) */
  variant: TupleToUnion<SupportedBlobTypes[T]>
  /** unique identifier for blob (e.g. hash of content) */
  name: string
  /** public key as hex string of hyperdrive where blob is stored */
  driveId: string
}

// Ugly, but the only way I could figure out how to get what I wanted
export type BlobId = Simplify<ValueOf<{
  [KeyType in BlobType]: BlobIdBase<KeyType>
}>>

export interface BlobFilter {
}
