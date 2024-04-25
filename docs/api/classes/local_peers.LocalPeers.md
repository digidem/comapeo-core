[API](../README.md) / [local-peers](../modules/local_peers.md) / LocalPeers

# Class: LocalPeers

[local-peers](../modules/local_peers.md).LocalPeers

## Hierarchy

- `TypedEmitter`

  ↳ **`LocalPeers`**

## Table of contents

### Constructors

- [constructor](local_peers.LocalPeers.md#constructor)

### Accessors

- [peers](local_peers.LocalPeers.md#peers)

### Methods

- [connect](local_peers.LocalPeers.md#connect)
- [sendDeviceInfo](local_peers.LocalPeers.md#senddeviceinfo)
- [sendInvite](local_peers.LocalPeers.md#sendinvite)
- [sendInviteCancel](local_peers.LocalPeers.md#sendinvitecancel)
- [sendInviteResponse](local_peers.LocalPeers.md#sendinviteresponse)
- [sendProjectJoinDetails](local_peers.LocalPeers.md#sendprojectjoindetails)

## Constructors

### constructor

• **new LocalPeers**(`opts?`): [`LocalPeers`](local_peers.LocalPeers.md)

#### Parameters

| Name | Type |
| :------ | :------ |
| `opts?` | `Object` |
| `opts.logger` | `undefined` \| [`Logger`](logger.Logger.md) |

#### Returns

[`LocalPeers`](local_peers.LocalPeers.md)

#### Overrides

TypedEmitter.constructor

#### Defined in

[src/local-peers.js:236](https://github.com/digidem/mapeo-core-next/blob/53dc843a45bb963f7a880f5f7973107d5b1fb99c/src/local-peers.js#L236)

## Accessors

### peers

• `get` **peers**(): ([`PeerInfoBase`](../interfaces/local_peers.PeerInfoBase.md) & \{ `connectedAt`: `number` ; `protomux`: `Protomux`\<`NoiseSecretStream`\<`Duplex`\<`any`, `any`, `any`, `any`, ``true``, ``true``, `DuplexEvents`\<`any`, `any`\>\>\>\> ; `status`: ``"connected"``  } \| [`PeerInfoBase`](../interfaces/local_peers.PeerInfoBase.md) & \{ `disconnectedAt`: `number` ; `status`: ``"disconnected"``  })[]

#### Returns

([`PeerInfoBase`](../interfaces/local_peers.PeerInfoBase.md) & \{ `connectedAt`: `number` ; `protomux`: `Protomux`\<`NoiseSecretStream`\<`Duplex`\<`any`, `any`, `any`, `any`, ``true``, ``true``, `DuplexEvents`\<`any`, `any`\>\>\>\> ; `status`: ``"connected"``  } \| [`PeerInfoBase`](../interfaces/local_peers.PeerInfoBase.md) & \{ `disconnectedAt`: `number` ; `status`: ``"disconnected"``  })[]

#### Defined in

[src/local-peers.js:241](https://github.com/digidem/mapeo-core-next/blob/53dc843a45bb963f7a880f5f7973107d5b1fb99c/src/local-peers.js#L241)

## Methods

### connect

▸ **connect**(`stream`): [`ReplicationStream`](../modules/types.md#replicationstream)

Connect to a peer over an existing NoiseSecretStream

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `stream` | `NoiseSecretStream`\<`any`\> | a NoiseSecretStream from @hyperswarm/secret-stream |

#### Returns

[`ReplicationStream`](../modules/types.md#replicationstream)

#### Defined in

[src/local-peers.js:310](https://github.com/digidem/mapeo-core-next/blob/53dc843a45bb963f7a880f5f7973107d5b1fb99c/src/local-peers.js#L310)

___

### sendDeviceInfo

▸ **sendDeviceInfo**(`deviceId`, `deviceInfo`): `Promise`\<`void`\>

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `deviceId` | `string` | id of the peer you want to send to (publicKey of peer as hex string) |
| `deviceInfo` | [`DeviceInfo`](../interfaces/generated_rpc.DeviceInfo.md) | device info to send |

#### Returns

`Promise`\<`void`\>

#### Defined in

[src/local-peers.js:298](https://github.com/digidem/mapeo-core-next/blob/53dc843a45bb963f7a880f5f7973107d5b1fb99c/src/local-peers.js#L298)

___

### sendInvite

▸ **sendInvite**(`deviceId`, `invite`): `Promise`\<`void`\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `deviceId` | `string` |
| `invite` | [`InviteRpcMessage`](../interfaces/invite_api.InviteRpcMessage.md) |

#### Returns

`Promise`\<`void`\>

#### Defined in

[src/local-peers.js:254](https://github.com/digidem/mapeo-core-next/blob/53dc843a45bb963f7a880f5f7973107d5b1fb99c/src/local-peers.js#L254)

___

### sendInviteCancel

▸ **sendInviteCancel**(`deviceId`, `inviteCancel`): `Promise`\<`void`\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `deviceId` | `string` |
| `inviteCancel` | [`InviteCancel`](../interfaces/invite_api.InviteCancel.md) |

#### Returns

`Promise`\<`void`\>

#### Defined in

[src/local-peers.js:265](https://github.com/digidem/mapeo-core-next/blob/53dc843a45bb963f7a880f5f7973107d5b1fb99c/src/local-peers.js#L265)

___

### sendInviteResponse

▸ **sendInviteResponse**(`deviceId`, `inviteResponse`): `Promise`\<`void`\>

Respond to an invite from a peer

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `deviceId` | `string` | id of the peer you want to respond to (publicKey of peer as hex string) |
| `inviteResponse` | [`InviteResponse`](../interfaces/member_api.InviteResponse.md) |  |

#### Returns

`Promise`\<`void`\>

#### Defined in

[src/local-peers.js:277](https://github.com/digidem/mapeo-core-next/blob/53dc843a45bb963f7a880f5f7973107d5b1fb99c/src/local-peers.js#L277)

___

### sendProjectJoinDetails

▸ **sendProjectJoinDetails**(`deviceId`, `details`): `Promise`\<`void`\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `deviceId` | `string` |
| `details` | [`ProjectJoinDetails`](../interfaces/invite_api.ProjectJoinDetails.md) |

#### Returns

`Promise`\<`void`\>

#### Defined in

[src/local-peers.js:287](https://github.com/digidem/mapeo-core-next/blob/53dc843a45bb963f7a880f5f7973107d5b1fb99c/src/local-peers.js#L287)
