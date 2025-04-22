[**API**](../README.md) • **Docs**

***

[API](../README.md) / MapeoManager

# Class: MapeoManager

## Extends

- `TypedEmitter`

## Constructors

### new MapeoManager()

> **new MapeoManager**(`opts`): [`MapeoManager`](MapeoManager.md)

#### Parameters

• **opts**

• **opts.clientMigrationsFolder**: `string`

path for drizzle migrations folder for client database

• **opts.coreStorage**: `string` \| [`CoreStorage`](../-internal-/type-aliases/CoreStorage.md)

Folder for hypercore storage or a function that returns a RandomAccessStorage instance

• **opts.customMapPath**: `undefined` \| `string`

File path to a locally stored Styled Map Package (SMP).

• **opts.dbFolder**: `string`

Folder for sqlite Dbs. Folder must exist. Use ':memory:' to store everything in-memory

• **opts.defaultConfigPath**: `undefined` \| `string`

• **opts.defaultOnlineStyleUrl**: `undefined` \| `string` = `DEFAULT_ONLINE_STYLE_URL`

URL for an online-hosted StyleJSON asset.

• **opts.fallbackMapPath**: `undefined` \| `string` = `DEFAULT_FALLBACK_MAP_FILE_PATH`

File path to a locally stored Styled Map Package (SMP)

• **opts.fastify**: `FastifyInstance`\<`RawServerDefault`, `IncomingMessage`, `ServerResponse`\<`IncomingMessage`\>, `FastifyBaseLogger`, `FastifyTypeProviderDefault`\>

Fastify server instance

• **opts.makeWebsocket**: `undefined` \| (`url`) => `WebSocket` = `...`

• **opts.projectMigrationsFolder**: `string`

path for drizzle migrations folder for project database

• **opts.rootKey**: `Buffer`

16-bytes of random data that uniquely identify the device, used to derive a 32-byte master key, which is used to derive all the keypairs used for Mapeo

#### Returns

[`MapeoManager`](MapeoManager.md)

#### Overrides

`TypedEmitter.constructor`

## Accessors

### deviceId

> `get` **deviceId**(): `string`

#### Returns

`string`

***

### invite

> `get` **invite**(): [`InviteApi`](../-internal-/classes/InviteApi.md)

#### Returns

[`InviteApi`](../-internal-/classes/InviteApi.md)

## Methods

### addProject()

> **addProject**(`projectToAddDetails`, `opts`?): `Promise`\<`string`\>

Add a project to this device. After adding a project the client should
await `project.$waitForInitialSync()` to ensure that the device has
downloaded their proof of project membership and the project config.

#### Parameters

• **projectToAddDetails**: [`ProjectToAddDetails`](../-internal-/type-aliases/ProjectToAddDetails.md)

• **opts?** = `{}`

Set opts.waitForSync = false to not wait for sync during addProject()

• **opts.waitForSync?**: `boolean` = `true`

#### Returns

`Promise`\<`string`\>

***

### connectLocalPeer()

> **connectLocalPeer**(`peer`): `void`

#### Parameters

• **peer**

• **peer.address**: `string`

• **peer.name**: `string`

• **peer.port**: `number`

#### Returns

`void`

***

### createProject()

> **createProject**(`options`?): `Promise`\<`string`\>

Create a new project.

#### Parameters

• **options?** = `{}`

• **options.configPath?**: `string` = `...`

• **options.name?**: `string`

• **options.projectColor?**: `string`

• **options.projectDescription?**: `string`

#### Returns

`Promise`\<`string`\>

Project public id

***

### getDeviceInfo()

> **getDeviceInfo**(): `object` & `Partial`\<[`DeviceInfoParam`](../-internal-/type-aliases/DeviceInfoParam.md)\>

#### Returns

`object` & `Partial`\<[`DeviceInfoParam`](../-internal-/type-aliases/DeviceInfoParam.md)\>

***

### getIsArchiveDevice()

> **getIsArchiveDevice**(): `boolean`

Get whether this device is an archive device. Archive devices will download
all media during sync, where-as non-archive devices will not download media
original variants, and only download preview and thumbnail variants.

#### Returns

`boolean`

isArchiveDevice

***

### getMapStyleJsonUrl()

> **getMapStyleJsonUrl**(): `Promise`\<`string`\>

#### Returns

`Promise`\<`string`\>

***

### getProject()

> **getProject**(`projectPublicId`): `Promise`\<[`MapeoProject`](../-internal-/classes/MapeoProject.md)\>

#### Parameters

• **projectPublicId**: `string`

#### Returns

`Promise`\<[`MapeoProject`](../-internal-/classes/MapeoProject.md)\>

***

### leaveProject()

> **leaveProject**(`projectPublicId`): `Promise`\<`void`\>

#### Parameters

• **projectPublicId**: `string`

#### Returns

`Promise`\<`void`\>

***

### listLocalPeers()

> **listLocalPeers**(): `Promise`\<[`PublicPeerInfo`](../-internal-/type-aliases/PublicPeerInfo.md)[]\>

#### Returns

`Promise`\<[`PublicPeerInfo`](../-internal-/type-aliases/PublicPeerInfo.md)[]\>

***

### listProjects()

> **listProjects**(): `Promise`\<[`ListedProject`](../-internal-/type-aliases/ListedProject.md)[]\>

#### Returns

`Promise`\<[`ListedProject`](../-internal-/type-aliases/ListedProject.md)[]\>

***

### onBackgrounded()

> **onBackgrounded**(): `void`

Call this when the app goes into the background.

Will gracefully shut down sync.

#### Returns

`void`

#### See

[onForegrounded](MapeoManager.md#onforegrounded)

***

### onForegrounded()

> **onForegrounded**(): `void`

Call this when the app goes into the foreground.

Will undo the effects of `onBackgrounded`.

#### Returns

`void`

#### See

[onBackgrounded](MapeoManager.md#onbackgrounded)

***

### setDeviceInfo()

> **setDeviceInfo**\<`T`\>(`deviceInfo`): `Promise`\<`void`\>

#### Type Parameters

• **T** *extends* [`DeviceInfoParam`](../-internal-/type-aliases/DeviceInfoParam.md) & `object` \| `ExactObject`\<[`DeviceInfoParam`](../-internal-/type-aliases/DeviceInfoParam.md) & `object`, `T`\>

#### Parameters

• **deviceInfo**: `T`

#### Returns

`Promise`\<`void`\>

***

### setIsArchiveDevice()

> **setIsArchiveDevice**(`isArchiveDevice`): `void`

Set whether this device is an archive device. Archive devices will download
all media during sync, where-as non-archive devices will not download media
original variants, and only download preview and thumbnail variants.

#### Parameters

• **isArchiveDevice**: `boolean`

#### Returns

`void`

***

### startLocalPeerDiscoveryServer()

> **startLocalPeerDiscoveryServer**(): `Promise`\<`object`\>

#### Returns

`Promise`\<`object`\>

##### name

> **name**: `string`

##### port

> **port**: `number`

***

### stopLocalPeerDiscoveryServer()

> **stopLocalPeerDiscoveryServer**(`opts`?): `Promise`\<`void`\>

Close all servers and stop multicast advertising and browsing. Will wait
for open sockets to close unless opts.force=true in which case open sockets
are force-closed after opts.timeout milliseconds

#### Parameters

• **opts?**

• **opts.force?**: `undefined` \| `boolean`

Force-close open sockets after timeout milliseconds

• **opts.timeout?**: `undefined` \| `number`

Optional timeout when calling stop() with force=true

#### Returns

`Promise`\<`void`\>
