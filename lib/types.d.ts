import type { Simplify, RequireAtLeastOne } from 'type-fest'

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

type BlobTypes = 'photo' | 'audio' | 'video'
type BlobSizes = 'original' | 'preview' | 'thumbnail'

type BlobIdBase = {
  /** Type of blob */
  type: BlobTypes
  /** Blob size (some blob types have smaller previews and thumbnails available) */
  size: BlobSizes
  /** unique identifier for blob (e.g. hash of content) */
  name: string
  /** public key as hex string of hyperdrive where blob is stored */
  driveId: string
}

type PhotoId = BlobIdBase & { type: 'photo' }
type AudioId = BlobIdBase & { type: 'audio'; size: 'original' }
type VideoId = BlobIdBase & { type: 'video'; size: 'original' }

// `Simpify` is used just to improve IDE type hints in the editor
export type BlobId = Simplify<PhotoId | AudioId | VideoId>

export type BlobDownloadSelection = RequireAtLeastOne<
  {
    /** media types to download */
    types: UniqueArray<Array<BlobTypes>>
    /** media sizes to download */
    sizes: UniqueArray<Array<BlobSizes>>
  },
  'sizes' | 'types'
>
