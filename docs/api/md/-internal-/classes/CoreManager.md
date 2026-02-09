[**API**](../../README.md) • **Docs**

***

[API](../../README.md) / [\<internal\>](../README.md) / CoreManager

# Class: CoreManager

## Extends

- `TypedEmitter`

## Constructors

### new CoreManager()

> **new CoreManager**(`options`): [`CoreManager`](CoreManager.md)

#### Parameters

• **options**

• **options.autoDownload**: `undefined` \| `boolean` = `true`

Immediately start downloading cores - should only be set to false for tests

• **options.db**: `BetterSQLite3Database`\<`Record`\<`string`, `never`\>, `any`\>

Drizzle better-sqlite3 database instance

• **options.encryptionKeys**: `undefined` \| `Partial`\<`Record`\<`"auth"` \| `"config"` \| `"data"` \| `"blobIndex"` \| `"blob"`, `Buffer`\>\> = `{}`

Encryption keys for each namespace

• **options.keyManager**: `KeyManager`

mapeo/crypto KeyManager instance

• **options.logger**: `undefined` \| [`Logger`](Logger.md)

• **options.projectKey**: `Buffer`

32-byte public key of the project creator core

• **options.projectSecretKey**: `undefined` \| `Buffer`

32-byte secret key of the project creator core

• **options.storage**: `HypercoreStorage`

Folder to store all hypercore data

#### Returns

[`CoreManager`](CoreManager.md)

#### Overrides

`TypedEmitter.constructor`

## Accessors

### creatorCore

> `get` **creatorCore**(): [`Core`](../type-aliases/Core.md)

#### Returns

[`Core`](../type-aliases/Core.md)

***

### creatorCoreRecord

> `get` **creatorCoreRecord**(): [`CoreRecord`](../type-aliases/CoreRecord.md)

#### Returns

[`CoreRecord`](../type-aliases/CoreRecord.md)

***

### deviceId

> `get` **deviceId**(): `string`

#### Returns

`string`

***

### namespaces

> `get` `static` **namespaces**(): readonly [`"auth"`, `"config"`, `"data"`, `"blobIndex"`, `"blob"`]

#### Returns

readonly [`"auth"`, `"config"`, `"data"`, `"blobIndex"`, `"blob"`]

## Methods

### \[kCoreManagerReplicate\]()

> **\[kCoreManagerReplicate\]**(`stream`): `ReplicationStream`

ONLY FOR TESTING
Replicate all cores in core manager

NB: Remote peers need to be manually added when unit testing core manager
without the Sync API

#### Parameters

• **stream**: `any`

#### Returns

`ReplicationStream`

***

### addCore()

> **addCore**(`key`, `namespace`): [`CoreRecord`](../type-aliases/CoreRecord.md)

Add a core to the manager (will be persisted across restarts)

#### Parameters

• **key**: `Buffer`

32-byte public key of core to add

• **namespace**: `"auth"` \| `"config"` \| `"data"` \| `"blobIndex"` \| `"blob"`

#### Returns

[`CoreRecord`](../type-aliases/CoreRecord.md)

***

### close()

> **close**(): `Promise`\<`void`\>

Close all open cores and end any replication streams
TODO: gracefully close replication streams

#### Returns

`Promise`\<`void`\>

***

### deleteOthersData()

> **deleteOthersData**(`namespace`): `Promise`\<`void`\>

#### Parameters

• **namespace**: `"config"` \| `"data"` \| `"blobIndex"` \| `"blob"`

#### Returns

`Promise`\<`void`\>

***

### getCoreByDiscoveryKey()

> **getCoreByDiscoveryKey**(`discoveryKey`): `undefined` \| [`CoreRecord`](../type-aliases/CoreRecord.md)

Get a core by its discovery key

#### Parameters

• **discoveryKey**: `Buffer`

#### Returns

`undefined` \| [`CoreRecord`](../type-aliases/CoreRecord.md)

***

### getCoreByKey()

> **getCoreByKey**(`key`): `undefined` \| [`Core`](../type-aliases/Core.md)

Get a core by its public key

#### Parameters

• **key**: `Buffer`

#### Returns

`undefined` \| [`Core`](../type-aliases/Core.md)

***

### getCores()

> **getCores**(`namespace`): [`CoreRecord`](../type-aliases/CoreRecord.md)[]

Get an array of all cores in the given namespace

#### Parameters

• **namespace**: `"auth"` \| `"config"` \| `"data"` \| `"blobIndex"` \| `"blob"`

#### Returns

[`CoreRecord`](../type-aliases/CoreRecord.md)[]

***

### getWriterCore()

> **getWriterCore**(`namespace`): [`CoreRecord`](../type-aliases/CoreRecord.md)

Get the writer core for the given namespace

#### Parameters

• **namespace**: `"auth"` \| `"config"` \| `"data"` \| `"blobIndex"` \| `"blob"`

#### Returns

[`CoreRecord`](../type-aliases/CoreRecord.md)

***

### ready()

> **ready**(): `Promise`\<`void`\>

Resolves when all cores have finished loading

#### Returns

`Promise`\<`void`\>

***

### sendDownloadIntents()

> **sendDownloadIntents**(`blobFilter`, `peer`): `void`

#### Parameters

• **blobFilter**: `null` \| `_RequireAtLeastOne`\<`object`, `"photo"` \| `"video"` \| `"audio"`\>

• **peer**: [`HypercorePeer`](../type-aliases/HypercorePeer.md)

#### Returns

`void`

***

### sendMapShare()

> **sendMapShare**(`mapShare`, `peerId`): `Promise`\<`void`\>

Send a map share to a peer

#### Parameters

• **mapShare**: `MapShareExtension`

• **peerId**: `Buffer`

#### Returns

`Promise`\<`void`\>
