import type {
  Simplify,
  TupleToUnion,
  ValueOf,
  RequireAtLeastOne,
} from 'type-fest'
import { SUPPORTED_BLOB_VARIANTS } from './blob-store/index.js'
import { MapeoDoc, MapeoValue } from '@mapeo/schema'

type SupportedBlobVariants = typeof SUPPORTED_BLOB_VARIANTS
type BlobType = keyof SupportedBlobVariants
type BlobVariant<TBlobType extends BlobType> = TupleToUnion<
  SupportedBlobVariants[TBlobType]
>

type BlobIdBase<T extends BlobType> = {
  /** Type of blob */
  type: T
  /** Blob variant (some blob types have smaller previews and thumbnails available) */
  variant: BlobVariant<T>
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
  [KeyType in BlobType]: ArrayAtLeastOne<BlobVariant<KeyType>>
}>

export type OptionalKeysOf<BaseType extends object> = Exclude<
  {
    [Key in keyof BaseType]: BaseType extends Record<Key, BaseType[Key]>
      ? never
      : Key
  }[keyof BaseType],
  undefined
>

export type MapeoDocMap = {
  [K in MapeoDoc['schemaName']]: Extract<MapeoDoc, { schemaName: K }>
}

export type MapeoValueMap = {
  [K in MapeoValue['schemaName']]: Extract<MapeoValue, { schemaName: K }>
}

