import type {
  Simplify,
  TupleToUnion,
  ValueOf,
  RequireAtLeastOne,
} from 'type-fest'
import { SUPPORTED_BLOB_TYPES } from './blob-store/index.js'

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
export type BlobId = Simplify<
  ValueOf<{
    [KeyType in BlobType]: BlobIdBase<KeyType>
  }>
>

type ArrayAtLeastOne<T> = [T, ...T[]]

export type BlobFilter = RequireAtLeastOne<{
  [KeyType in BlobType]: ArrayAtLeastOne<
    TupleToUnion<SupportedBlobTypes[KeyType]>
  >
}>
