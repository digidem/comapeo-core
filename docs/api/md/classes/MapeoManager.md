[API](../README.md) / MapeoManager

# Class: MapeoManager

## Hierarchy

- `TypedEmitter`

  ↳ **`MapeoManager`**

## Table of contents

### Constructors

- [constructor](MapeoManager.md#constructor)

### Accessors

- [[kRPC]](MapeoManager.md#[krpc])
- [deviceId](MapeoManager.md#deviceid)
- [invite](MapeoManager.md#invite)

### Methods

- [[kManagerReplicate]](MapeoManager.md#[kmanagerreplicate])
- [addProject](MapeoManager.md#addproject)
- [connectPeer](MapeoManager.md#connectpeer)
- [createProject](MapeoManager.md#createproject)
- [getDeviceInfo](MapeoManager.md#getdeviceinfo)
- [getMapStyleJsonUrl](MapeoManager.md#getmapstylejsonurl)
- [getProject](MapeoManager.md#getproject)
- [leaveProject](MapeoManager.md#leaveproject)
- [listLocalPeers](MapeoManager.md#listlocalpeers)
- [listProjects](MapeoManager.md#listprojects)
- [setDeviceInfo](MapeoManager.md#setdeviceinfo)
- [startLocalPeerDiscoveryServer](MapeoManager.md#startlocalpeerdiscoveryserver)
- [stopLocalPeerDiscoveryServer](MapeoManager.md#stoplocalpeerdiscoveryserver)

## Constructors

### constructor

• **new MapeoManager**(`opts`): [`MapeoManager`](MapeoManager.md)

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `opts` | `Object` |  |
| `opts.clientMigrationsFolder` | `string` | path for drizzle migrations folder for client database |
| `opts.coreStorage` | `string` \| [`CoreStorage`](../modules/internal_.md#corestorage) | Folder for hypercore storage or a function that returns a RandomAccessStorage instance |
| `opts.dbFolder` | `string` | Folder for sqlite Dbs. Folder must exist. Use ':memory:' to store everything in-memory |
| `opts.defaultConfigPath` | `undefined` \| `string` |  |
| `opts.deviceType` | `undefined` \| `DeviceInfo_DeviceType` | Device type, shared with local peers and project members |
| `opts.fastify` | `FastifyInstance`\<`RawServerDefault`, `IncomingMessage`, `ServerResponse`\<`IncomingMessage`\>, `FastifyBaseLogger`, `FastifyTypeProviderDefault`\> | Fastify server instance |
| `opts.projectMigrationsFolder` | `string` | path for drizzle migrations folder for project database |
| `opts.rootKey` | `Buffer` | 16-bytes of random data that uniquely identify the device, used to derive a 32-byte master key, which is used to derive all the keypairs used for Mapeo |

#### Returns

[`MapeoManager`](MapeoManager.md)

#### Overrides

TypedEmitter.constructor

#### Defined in

[src/mapeo-manager.js:110](https://github.com/digidem/mapeo-core-next/blob/315dc9781d8d2f74f17b1fd651a3ae81272b7fac/src/mapeo-manager.js#L110)

## Accessors

### [kRPC]

• `get` **[kRPC]**(): [`LocalPeers`](internal_.LocalPeers.md)

MapeoRPC instance, used for tests

#### Returns

[`LocalPeers`](internal_.LocalPeers.md)

#### Defined in

[src/mapeo-manager.js:201](https://github.com/digidem/mapeo-core-next/blob/315dc9781d8d2f74f17b1fd651a3ae81272b7fac/src/mapeo-manager.js#L201)

___

### deviceId

• `get` **deviceId**(): `string`

#### Returns

`string`

#### Defined in

[src/mapeo-manager.js:205](https://github.com/digidem/mapeo-core-next/blob/315dc9781d8d2f74f17b1fd651a3ae81272b7fac/src/mapeo-manager.js#L205)

___

### invite

• `get` **invite**(): [`InviteApi`](internal_.InviteApi.md)

#### Returns

[`InviteApi`](internal_.InviteApi.md)

#### Defined in

[src/mapeo-manager.js:731](https://github.com/digidem/mapeo-core-next/blob/315dc9781d8d2f74f17b1fd651a3ae81272b7fac/src/mapeo-manager.js#L731)

## Methods

### [kManagerReplicate]

▸ **[kManagerReplicate]**(`isInitiator`): [`ReplicationStream`](../modules/internal_.md#replicationstream)

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

[`ReplicationStream`](../modules/internal_.md#replicationstream)

#### Defined in

[src/mapeo-manager.js:218](https://github.com/digidem/mapeo-core-next/blob/315dc9781d8d2f74f17b1fd651a3ae81272b7fac/src/mapeo-manager.js#L218)

___

### addProject

▸ **addProject**(`projectJoinDetails`, `opts?`): `Promise`\<`string`\>

Add a project to this device. After adding a project the client should
await `project.$waitForInitialSync()` to ensure that the device has
downloaded their proof of project membership and the project config.

#### Parameters

| Name | Type | Default value | Description |
| :------ | :------ | :------ | :------ |
| `projectJoinDetails` | `Pick`\<`ProjectJoinDetails`, ``"projectKey"`` \| ``"encryptionKeys"``\> & \{ `projectName`: `string`  } | `undefined` |  |
| `opts?` | `Object` | `{}` | For internal use in tests, set opts.waitForSync = false to not wait for sync during addProject() |
| `opts.waitForSync?` | `boolean` | `true` | - |

#### Returns

`Promise`\<`string`\>

#### Defined in

[src/mapeo-manager.js:542](https://github.com/digidem/mapeo-core-next/blob/315dc9781d8d2f74f17b1fd651a3ae81272b7fac/src/mapeo-manager.js#L542)

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

[src/mapeo-manager.js:746](https://github.com/digidem/mapeo-core-next/blob/315dc9781d8d2f74f17b1fd651a3ae81272b7fac/src/mapeo-manager.js#L746)

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

[src/mapeo-manager.js:350](https://github.com/digidem/mapeo-core-next/blob/315dc9781d8d2f74f17b1fd651a3ae81272b7fac/src/mapeo-manager.js#L350)

___

### getDeviceInfo

▸ **getDeviceInfo**(): \{ `deviceId`: `string`  } & `Partial`\<[`DeviceInfoParam`](../modules/internal_.md#deviceinfoparam)\>

#### Returns

\{ `deviceId`: `string`  } & `Partial`\<[`DeviceInfoParam`](../modules/internal_.md#deviceinfoparam)\>

#### Defined in

[src/mapeo-manager.js:719](https://github.com/digidem/mapeo-core-next/blob/315dc9781d8d2f74f17b1fd651a3ae81272b7fac/src/mapeo-manager.js#L719)

___

### getMapStyleJsonUrl

▸ **getMapStyleJsonUrl**(): `Promise`\<`string`\>

#### Returns

`Promise`\<`string`\>

#### Defined in

[src/mapeo-manager.js:806](https://github.com/digidem/mapeo-core-next/blob/315dc9781d8d2f74f17b1fd651a3ae81272b7fac/src/mapeo-manager.js#L806)

___

### getProject

▸ **getProject**(`projectPublicId`): `Promise`\<[`MapeoProject`](internal_.MapeoProject.md)\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `projectPublicId` | `string` |

#### Returns

`Promise`\<[`MapeoProject`](internal_.MapeoProject.md)\>

#### Defined in

[src/mapeo-manager.js:426](https://github.com/digidem/mapeo-core-next/blob/315dc9781d8d2f74f17b1fd651a3ae81272b7fac/src/mapeo-manager.js#L426)

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

[src/mapeo-manager.js:760](https://github.com/digidem/mapeo-core-next/blob/315dc9781d8d2f74f17b1fd651a3ae81272b7fac/src/mapeo-manager.js#L760)

___

### listLocalPeers

▸ **listLocalPeers**(): `Promise`\<[`PublicPeerInfo`](../modules/internal_.md#publicpeerinfo)[]\>

#### Returns

`Promise`\<[`PublicPeerInfo`](../modules/internal_.md#publicpeerinfo)[]\>

#### Defined in

[src/mapeo-manager.js:753](https://github.com/digidem/mapeo-core-next/blob/315dc9781d8d2f74f17b1fd651a3ae81272b7fac/src/mapeo-manager.js#L753)

___

### listProjects

▸ **listProjects**(): `Promise`\<`Pick`\<{}, ``"name"``\> & \{ `createdAt?`: `string` ; `projectId`: `string` ; `updatedAt?`: `string`  }[]\>

#### Returns

`Promise`\<`Pick`\<{}, ``"name"``\> & \{ `createdAt?`: `string` ; `projectId`: `string` ; `updatedAt?`: `string`  }[]\>

#### Defined in

[src/mapeo-manager.js:485](https://github.com/digidem/mapeo-core-next/blob/315dc9781d8d2f74f17b1fd651a3ae81272b7fac/src/mapeo-manager.js#L485)

___

### setDeviceInfo

▸ **setDeviceInfo**\<`T`\>(`deviceInfo`): `Promise`\<`void`\>

#### Type parameters

| Name | Type |
| :------ | :------ |
| `T` | extends [`DeviceInfoParam`](../modules/internal_.md#deviceinfoparam) \| `ExactObject`\<[`DeviceInfoParam`](../modules/internal_.md#deviceinfoparam), `T`\> |

#### Parameters

| Name | Type |
| :------ | :------ |
| `deviceInfo` | `T` |

#### Returns

`Promise`\<`void`\>

#### Defined in

[src/mapeo-manager.js:686](https://github.com/digidem/mapeo-core-next/blob/315dc9781d8d2f74f17b1fd651a3ae81272b7fac/src/mapeo-manager.js#L686)

___

### startLocalPeerDiscoveryServer

▸ **startLocalPeerDiscoveryServer**(): `Promise`\<\{ `name`: `string` ; `port`: `number`  }\>

#### Returns

`Promise`\<\{ `name`: `string` ; `port`: `number`  }\>

#### Defined in

[src/mapeo-manager.js:736](https://github.com/digidem/mapeo-core-next/blob/315dc9781d8d2f74f17b1fd651a3ae81272b7fac/src/mapeo-manager.js#L736)

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

[src/mapeo-manager.js:741](https://github.com/digidem/mapeo-core-next/blob/315dc9781d8d2f74f17b1fd651a3ae81272b7fac/src/mapeo-manager.js#L741)
