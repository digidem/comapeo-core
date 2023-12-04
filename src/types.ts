import type {
  Simplify,
  TupleToUnion,
  ValueOf,
  RequireAtLeastOne,
  SetOptional,
} from 'type-fest'
import { SUPPORTED_BLOB_VARIANTS } from './blob-store/index.js'
import { MapeoCommon, MapeoDoc, MapeoValue, decode } from '@mapeo/schema'
import type Protomux from 'protomux'
import type NoiseStream from '@hyperswarm/secret-stream'
import { Duplex } from 'streamx'
import { Socket } from 'net'
import MultiCoreIndexer from 'multi-core-indexer'
import Corestore from 'corestore'
import Hypercore from 'hypercore'
import RandomAccessStorage from 'random-access-storage'
import { DefaultListener, ListenerSignature } from 'tiny-typed-emitter'

type SupportedBlobVariants = typeof SUPPORTED_BLOB_VARIANTS
export type BlobType = keyof SupportedBlobVariants
export type BlobVariant<TBlobType extends BlobType> = TupleToUnion<
  SupportedBlobVariants[TBlobType]
>

type BlobIdBase<T extends BlobType> = {
  /** Type of blob */
  type: T
  /** Blob variant (some blob types have smaller previews and thumbnails available) */
  variant: BlobVariant<T>
  /** unique identifier for blob (e.g. hash of content) */
  name: string
  /** discovery key as hex string of hyperdrive where blob is stored */
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

// TODO: Replace this with exports from @mapeo/schema
export type CoreOwnershipWithSignatures = Extract<
  ReturnType<typeof decode>,
  { schemaName: 'coreOwnership' }
>
export type CoreOwnershipWithSignaturesValue = Omit<
  CoreOwnershipWithSignatures,
  Exclude<keyof MapeoCommon, 'schemaName'>
>

type NullToOptional<T> = SetOptional<T, NullKeys<T>>
type RemoveNull<T> = {
  [K in keyof T]: Exclude<T[K], null>
}

type NullKeys<Base> = NonNullable<
  // Wrap in `NonNullable` to strip away the `undefined` type from the produced union.
  {
    // Map through all the keys of the given base type.
    [Key in keyof Base]: null extends Base[Key] // Pick only keys with types extending the given `Condition` type.
      ? // Retain this key since the condition passes.
        Key
      : // Discard this key since the condition fails.
        never

    // Convert the produced object into a union type of the keys which passed the conditional test.
  }[keyof Base]
>

/**
 * Make any properties whose value include `null` optional, and remove `null`
 * from the type. This converts the types returned from SQLite (which have all
 * top-level optional props set to `null`) to the original types in
 * @mapeo/schema
 */
export type NullableToOptional<T> = Simplify<RemoveNull<NullToOptional<T>>>
export type KeyPair = {
  publicKey: PublicKey
  secretKey: SecretKey
}
export type RoleDetails = {
  name: string
  capabilities: string[]
}
export type AvailableRoles = RoleDetails[]

export type Statement = {
  id: string
  type: string
  version: string
  signature: string
  action: string
  authorId: string
  authorIndex: number
  deviceIndex: number
  created: number
  timestamp: number
  links: string[]
  forks: string[]
}

export type CoreOwnershipStatement = Statement & { coreId: string }
export type RoleStatement = Statement & { role: string }
export type DeviceStatement = Statement
/** 32 byte buffer */
export type PublicKey = Buffer
/** 32 byte buffer */
export type SecretKey = Buffer
export type PublicId = string
export type IdentityKeyPair = KeyPair
export type IdentityPublicKey = PublicKey
export type IdentitySecretKey = SecretKey
export type IdentityId = PublicId
export type CoreId = PublicId
export type TopicKey = Buffer
/** hex string representation of `Topic` Buffer */
export type TopicId = string
/** 52 character base32 encoding of `Topic` Buffer */
export type MdnsTopicId = string

// TODO: Figure out where those extra fields come from and find more elegant way to represent this
export type RawDhtConnectionStream = Duplex & {
  remoteAddress: string
  remotePort: number
}
export type RawConnectionStream = Socket | RawDhtConnectionStream
export type DhtNode = { host: string; port: number }

export type DhtOptions = {
  server: boolean
  client: boolean
  /** Array of {host, port} objects provided by https://github.com/hyperswarm/testnet */
  bootstrap?: DhtNode[]
  keyPair?: IdentityKeyPair
}

export type MdnsOptions = {
  identityKeyPair: IdentityKeyPair
  port: number
  name: string
}

export type Entry = MultiCoreIndexer.Entry
export { Corestore }
export type Core = Hypercore
export { Duplex }

export { NoiseStream }
export type ProtocolStream = Omit<NoiseStream, 'userData'> & {
  userData: Protomux
}
export type ReplicationStream = Duplex & { noiseStream: ProtocolStream }

// Unsafe type for Object.entries - you must be sure that the object does not
// have additional properties that are not defined in the type, e.g. when using
// a const value
export type Entries<T> = {
  [K in keyof T]: [K, T[K]]
}[keyof T][]

export type CoreStorage = (name: string) => RandomAccessStorage

export type DefaultEmitterEvents<
  L extends ListenerSignature<L> = DefaultListener
> = {
  newListener: (event: keyof L, listener: L[keyof L]) => void
  removeListener: (event: keyof L, listener: L[keyof L]) => void
}
