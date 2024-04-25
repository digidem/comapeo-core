[API](../README.md) / [mapeo-manager](../modules/mapeo_manager.md) / MapeoManager

# Class: MapeoManager

[mapeo-manager](../modules/mapeo_manager.md).MapeoManager

## Hierarchy

- `TypedEmitter`

  ↳ **`MapeoManager`**

## Table of contents

### Constructors

- [constructor](mapeo_manager.MapeoManager.md#constructor)

### Accessors

- [[kRPC]](mapeo_manager.MapeoManager.md#[krpc])
- [deviceId](mapeo_manager.MapeoManager.md#deviceid)
- [invite](mapeo_manager.MapeoManager.md#invite)

### Methods

- [[kManagerReplicate]](mapeo_manager.MapeoManager.md#[kmanagerreplicate])
- [addProject](mapeo_manager.MapeoManager.md#addproject)
- [connectPeer](mapeo_manager.MapeoManager.md#connectpeer)
- [createProject](mapeo_manager.MapeoManager.md#createproject)
- [getDeviceInfo](mapeo_manager.MapeoManager.md#getdeviceinfo)
- [getMapStyleJsonUrl](mapeo_manager.MapeoManager.md#getmapstylejsonurl)
- [getProject](mapeo_manager.MapeoManager.md#getproject)
- [leaveProject](mapeo_manager.MapeoManager.md#leaveproject)
- [listLocalPeers](mapeo_manager.MapeoManager.md#listlocalpeers)
- [listProjects](mapeo_manager.MapeoManager.md#listprojects)
- [setDeviceInfo](mapeo_manager.MapeoManager.md#setdeviceinfo)
- [startLocalPeerDiscoveryServer](mapeo_manager.MapeoManager.md#startlocalpeerdiscoveryserver)
- [stopLocalPeerDiscoveryServer](mapeo_manager.MapeoManager.md#stoplocalpeerdiscoveryserver)

## Constructors

### constructor

• **new MapeoManager**(`opts`): [`MapeoManager`](mapeo_manager.MapeoManager.md)

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `opts` | `Object` |  |
| `opts.clientMigrationsFolder` | `string` | path for drizzle migrations folder for client database |
| `opts.coreStorage` | `string` \| [`CoreStorage`](../modules/types.md#corestorage) | Folder for hypercore storage or a function that returns a RandomAccessStorage instance |
| `opts.dbFolder` | `string` | Folder for sqlite Dbs. Folder must exist. Use ':memory:' to store everything in-memory |
| `opts.defaultConfigPath` | `undefined` \| `string` |  |
| `opts.deviceType` | `undefined` \| [`DeviceInfo_DeviceType`](../modules/generated_rpc.md#deviceinfo_devicetype) | Device type, shared with local peers and project members |
| `opts.fastify` | `FastifyInstance`\<`RawServerDefault`, `IncomingMessage`, `ServerResponse`\<`IncomingMessage`\>, `FastifyBaseLogger`, `FastifyTypeProviderDefault`\> | Fastify server instance |
| `opts.projectMigrationsFolder` | `string` | path for drizzle migrations folder for project database |
| `opts.rootKey` | `Buffer` | 16-bytes of random data that uniquely identify the device, used to derive a 32-byte master key, which is used to derive all the keypairs used for Mapeo |

#### Returns

[`MapeoManager`](mapeo_manager.MapeoManager.md)

#### Overrides

TypedEmitter.constructor

#### Defined in

[src/mapeo-manager.js:110](https://github.com/digidem/mapeo-core-next/blob/53dc843a45bb963f7a880f5f7973107d5b1fb99c/src/mapeo-manager.js#L110)

## Accessors

### [kRPC]

• `get` **[kRPC]**(): [`LocalPeers`](local_peers.LocalPeers.md)

MapeoRPC instance, used for tests

#### Returns

[`LocalPeers`](local_peers.LocalPeers.md)

#### Defined in

[src/mapeo-manager.js:201](https://github.com/digidem/mapeo-core-next/blob/53dc843a45bb963f7a880f5f7973107d5b1fb99c/src/mapeo-manager.js#L201)

___

### deviceId

• `get` **deviceId**(): `string`

#### Returns

`string`

#### Defined in

[src/mapeo-manager.js:205](https://github.com/digidem/mapeo-core-next/blob/53dc843a45bb963f7a880f5f7973107d5b1fb99c/src/mapeo-manager.js#L205)

___

### invite

• `get` **invite**(): [`InviteApi`](invite_api.InviteApi.md)

#### Returns

[`InviteApi`](invite_api.InviteApi.md)

#### Defined in

[src/mapeo-manager.js:731](https://github.com/digidem/mapeo-core-next/blob/53dc843a45bb963f7a880f5f7973107d5b1fb99c/src/mapeo-manager.js#L731)

## Methods

### [kManagerReplicate]

▸ **[kManagerReplicate]**(`isInitiator`): [`ReplicationStream`](../modules/types.md#replicationstream)

Create a Mapeo replication stream. This replication connects the Mapeo RPC
channel and allows invites. All active projects will sync automatically to
this replication stream. Only use for local (trusted) connections, because
the RPC channel key is public. To sync a specific project without
connecting RPC, use project[kProjectReplication].

#### Parameters

| Name | Type |
| :------ | :------ |
| `isInitiator` | `boolean` |

#### Returns

[`ReplicationStream`](../modules/types.md#replicationstream)

#### Defined in

[src/mapeo-manager.js:218](https://github.com/digidem/mapeo-core-next/blob/53dc843a45bb963f7a880f5f7973107d5b1fb99c/src/mapeo-manager.js#L218)

___

### addProject

▸ **addProject**(`projectJoinDetails`, `opts?`): `Promise`\<`string`\>

Add a project to this device. After adding a project the client should
await `project.$waitForInitialSync()` to ensure that the device has
downloaded their proof of project membership and the project config.

#### Parameters

| Name | Type | Default value | Description |
| :------ | :------ | :------ | :------ |
| `projectJoinDetails` | `Pick`\<[`ProjectJoinDetails`](../interfaces/invite_api.ProjectJoinDetails.md), ``"projectKey"`` \| ``"encryptionKeys"``\> & \{ `projectName`: `string`  } | `undefined` |  |
| `opts?` | `Object` | `{}` | For internal use in tests, set opts.waitForSync = false to not wait for sync during addProject() |
| `opts.waitForSync?` | `boolean` | `true` | - |

#### Returns

`Promise`\<`string`\>

#### Defined in

[src/mapeo-manager.js:542](https://github.com/digidem/mapeo-core-next/blob/53dc843a45bb963f7a880f5f7973107d5b1fb99c/src/mapeo-manager.js#L542)

___

### connectPeer

▸ **connectPeer**(`peer`): `void`

#### Parameters

| Name | Type |
| :------ | :------ |
| `peer` | `Object` |
| `peer.address` | `string` |
| `peer.name` | `string` |
| `peer.port` | `number` |

#### Returns

`void`

#### Defined in

[src/mapeo-manager.js:746](https://github.com/digidem/mapeo-core-next/blob/53dc843a45bb963f7a880f5f7973107d5b1fb99c/src/mapeo-manager.js#L746)

___

### createProject

▸ **createProject**(`options?`): `Promise`\<`string`\>

Create a new project.

#### Parameters

| Name | Type |
| :------ | :------ |
| `options?` | `Object` |
| `options.configPath?` | `string` |

#### Returns

`Promise`\<`string`\>

Project public id

#### Defined in

[src/mapeo-manager.js:350](https://github.com/digidem/mapeo-core-next/blob/53dc843a45bb963f7a880f5f7973107d5b1fb99c/src/mapeo-manager.js#L350)

___

### getDeviceInfo

▸ **getDeviceInfo**(): \{ `deviceId`: `string`  } & `Partial`\<[`DeviceInfoParam`](../modules/schema_client.md#deviceinfoparam)\>

#### Returns

\{ `deviceId`: `string`  } & `Partial`\<[`DeviceInfoParam`](../modules/schema_client.md#deviceinfoparam)\>

#### Defined in

[src/mapeo-manager.js:719](https://github.com/digidem/mapeo-core-next/blob/53dc843a45bb963f7a880f5f7973107d5b1fb99c/src/mapeo-manager.js#L719)

___

### getMapStyleJsonUrl

▸ **getMapStyleJsonUrl**(): `Promise`\<`string`\>

#### Returns

`Promise`\<`string`\>

#### Defined in

[src/mapeo-manager.js:806](https://github.com/digidem/mapeo-core-next/blob/53dc843a45bb963f7a880f5f7973107d5b1fb99c/src/mapeo-manager.js#L806)

___

### getProject

▸ **getProject**(`projectPublicId`): `Promise`\<[`MapeoProject`](mapeo_project.MapeoProject.md)\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `projectPublicId` | `string` |

#### Returns

`Promise`\<[`MapeoProject`](mapeo_project.MapeoProject.md)\>

#### Defined in

[src/mapeo-manager.js:426](https://github.com/digidem/mapeo-core-next/blob/53dc843a45bb963f7a880f5f7973107d5b1fb99c/src/mapeo-manager.js#L426)

___

### leaveProject

▸ **leaveProject**(`projectPublicId`): `Promise`\<`void`\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `projectPublicId` | `string` |

#### Returns

`Promise`\<`void`\>

#### Defined in

[src/mapeo-manager.js:760](https://github.com/digidem/mapeo-core-next/blob/53dc843a45bb963f7a880f5f7973107d5b1fb99c/src/mapeo-manager.js#L760)

___

### listLocalPeers

▸ **listLocalPeers**(): `Promise`\<[`PublicPeerInfo`](../modules/mapeo_manager.md#publicpeerinfo)[]\>

#### Returns

`Promise`\<[`PublicPeerInfo`](../modules/mapeo_manager.md#publicpeerinfo)[]\>

#### Defined in

[src/mapeo-manager.js:753](https://github.com/digidem/mapeo-core-next/blob/53dc843a45bb963f7a880f5f7973107d5b1fb99c/src/mapeo-manager.js#L753)

___

### listProjects

▸ **listProjects**(): `Promise`\<`Pick`\<{}, ``"name"``\> & \{ `createdAt?`: `string` ; `projectId`: `string` ; `updatedAt?`: `string`  }[]\>

#### Returns

`Promise`\<`Pick`\<{}, ``"name"``\> & \{ `createdAt?`: `string` ; `projectId`: `string` ; `updatedAt?`: `string`  }[]\>

#### Defined in

[src/mapeo-manager.js:485](https://github.com/digidem/mapeo-core-next/blob/53dc843a45bb963f7a880f5f7973107d5b1fb99c/src/mapeo-manager.js#L485)

___

### setDeviceInfo

▸ **setDeviceInfo**\<`T`\>(`deviceInfo`): `Promise`\<`void`\>

#### Type parameters

| Name | Type |
| :------ | :------ |
| `T` | extends [`DeviceInfoParam`](../modules/schema_client.md#deviceinfoparam) \| `ExactObject`\<[`DeviceInfoParam`](../modules/schema_client.md#deviceinfoparam), `T`\> |

#### Parameters

| Name | Type |
| :------ | :------ |
| `deviceInfo` | `T` |

#### Returns

`Promise`\<`void`\>

#### Defined in

[src/mapeo-manager.js:686](https://github.com/digidem/mapeo-core-next/blob/53dc843a45bb963f7a880f5f7973107d5b1fb99c/src/mapeo-manager.js#L686)

___

### startLocalPeerDiscoveryServer

▸ **startLocalPeerDiscoveryServer**(): `Promise`\<\{ `name`: `string` ; `port`: `number`  }\>

#### Returns

`Promise`\<\{ `name`: `string` ; `port`: `number`  }\>

#### Defined in

[src/mapeo-manager.js:736](https://github.com/digidem/mapeo-core-next/blob/53dc843a45bb963f7a880f5f7973107d5b1fb99c/src/mapeo-manager.js#L736)

___

### stopLocalPeerDiscoveryServer

▸ **stopLocalPeerDiscoveryServer**(`opts?`): `Promise`\<`void`\>

Close all servers and stop multicast advertising and browsing. Will wait
for open sockets to close unless opts.force=true in which case open sockets
are force-closed after opts.timeout milliseconds

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `opts?` | `Object` |  |
| `opts.force` | `undefined` \| `boolean` | Force-close open sockets after timeout milliseconds |
| `opts.timeout` | `undefined` \| `number` | Optional timeout when calling stop() with force=true |

#### Returns

`Promise`\<`void`\>

#### Defined in

[src/mapeo-manager.js:741](https://github.com/digidem/mapeo-core-next/blob/53dc843a45bb963f7a880f5f7973107d5b1fb99c/src/mapeo-manager.js#L741)
