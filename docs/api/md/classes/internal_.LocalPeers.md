[API](../README.md) / [\<internal\>](../modules/internal_.md) / LocalPeers

# Class: LocalPeers

[\<internal\>](../modules/internal_.md).LocalPeers

## Hierarchy

- `TypedEmitter`

  ↳ **`LocalPeers`**

## Table of contents

### Constructors

- [constructor](internal_.LocalPeers.md#constructor)

### Accessors

- [peers](internal_.LocalPeers.md#peers)

### Methods

- [[kTestOnlySendRawInvite]](internal_.LocalPeers.md#[ktestonlysendrawinvite])
- [connect](internal_.LocalPeers.md#connect)
- [sendDeviceInfo](internal_.LocalPeers.md#senddeviceinfo)
- [sendInvite](internal_.LocalPeers.md#sendinvite)
- [sendInviteCancel](internal_.LocalPeers.md#sendinvitecancel)
- [sendInviteResponse](internal_.LocalPeers.md#sendinviteresponse)
- [sendProjectJoinDetails](internal_.LocalPeers.md#sendprojectjoindetails)

## Constructors

### constructor

• **new LocalPeers**(`opts?`): [`LocalPeers`](internal_.LocalPeers.md)

#### Parameters

| Name | Type |
| :------ | :------ |
| `opts?` | `Object` |
| `opts.logger` | `undefined` \| [`Logger`](internal_.Logger.md) |

#### Returns

[`LocalPeers`](internal_.LocalPeers.md)

#### Overrides

TypedEmitter.constructor

#### Defined in

[src/local-peers.js:251](https://github.com/digidem/mapeo-core-next/blob/315dc9781d8d2f74f17b1fd651a3ae81272b7fac/src/local-peers.js#L251)

## Accessors

### peers

• `get` **peers**(): ([`PeerInfoBase`](../interfaces/internal_.PeerInfoBase.md) & \{ `connectedAt`: `number` ; `protomux`: [`Protomux`](internal_.Protomux.md)\<`NoiseSecretStream`\<`Duplex`\<`any`, `any`, `any`, `any`, ``true``, ``true``, `DuplexEvents`\<`any`, `any`\>\>\>\> ; `status`: ``"connected"``  } \| [`PeerInfoBase`](../interfaces/internal_.PeerInfoBase.md) & \{ `disconnectedAt`: `number` ; `status`: ``"disconnected"``  })[]

#### Returns

([`PeerInfoBase`](../interfaces/internal_.PeerInfoBase.md) & \{ `connectedAt`: `number` ; `protomux`: [`Protomux`](internal_.Protomux.md)\<`NoiseSecretStream`\<`Duplex`\<`any`, `any`, `any`, `any`, ``true``, ``true``, `DuplexEvents`\<`any`, `any`\>\>\>\> ; `status`: ``"connected"``  } \| [`PeerInfoBase`](../interfaces/internal_.PeerInfoBase.md) & \{ `disconnectedAt`: `number` ; `status`: ``"disconnected"``  })[]

#### Defined in

[src/local-peers.js:256](https://github.com/digidem/mapeo-core-next/blob/315dc9781d8d2f74f17b1fd651a3ae81272b7fac/src/local-peers.js#L256)

## Methods

### [kTestOnlySendRawInvite]

▸ **[kTestOnlySendRawInvite]**(`deviceId`, `buf`): `Promise`\<`void`\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `deviceId` | `string` |
| `buf` | `Buffer` |

#### Returns

`Promise`\<`void`\>

#### Defined in

[src/local-peers.js:323](https://github.com/digidem/mapeo-core-next/blob/315dc9781d8d2f74f17b1fd651a3ae81272b7fac/src/local-peers.js#L323)

___

### connect

▸ **connect**(`stream`): [`ReplicationStream`](../modules/internal_.md#replicationstream)

Connect to a peer over an existing NoiseSecretStream

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `stream` | `NoiseSecretStream`\<`any`\> | a NoiseSecretStream from @hyperswarm/secret-stream |

#### Returns

[`ReplicationStream`](../modules/internal_.md#replicationstream)

#### Defined in

[src/local-peers.js:335](https://github.com/digidem/mapeo-core-next/blob/315dc9781d8d2f74f17b1fd651a3ae81272b7fac/src/local-peers.js#L335)

___

### sendDeviceInfo

▸ **sendDeviceInfo**(`deviceId`, `deviceInfo`): `Promise`\<`void`\>

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `deviceId` | `string` | id of the peer you want to send to (publicKey of peer as hex string) |
| `deviceInfo` | `DeviceInfo` | device info to send |

#### Returns

`Promise`\<`void`\>

#### Defined in

[src/local-peers.js:313](https://github.com/digidem/mapeo-core-next/blob/315dc9781d8d2f74f17b1fd651a3ae81272b7fac/src/local-peers.js#L313)

___

### sendInvite

▸ **sendInvite**(`deviceId`, `invite`): `Promise`\<`void`\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `deviceId` | `string` |
| `invite` | `Invite` |

#### Returns

`Promise`\<`void`\>

#### Defined in

[src/local-peers.js:269](https://github.com/digidem/mapeo-core-next/blob/315dc9781d8d2f74f17b1fd651a3ae81272b7fac/src/local-peers.js#L269)

___

### sendInviteCancel

▸ **sendInviteCancel**(`deviceId`, `inviteCancel`): `Promise`\<`void`\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `deviceId` | `string` |
| `inviteCancel` | `InviteCancel` |

#### Returns

`Promise`\<`void`\>

#### Defined in

[src/local-peers.js:280](https://github.com/digidem/mapeo-core-next/blob/315dc9781d8d2f74f17b1fd651a3ae81272b7fac/src/local-peers.js#L280)

___

### sendInviteResponse

▸ **sendInviteResponse**(`deviceId`, `inviteResponse`): `Promise`\<`void`\>

Respond to an invite from a peer

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `deviceId` | `string` | id of the peer you want to respond to (publicKey of peer as hex string) |
| `inviteResponse` | `InviteResponse` |  |

#### Returns

`Promise`\<`void`\>

#### Defined in

[src/local-peers.js:292](https://github.com/digidem/mapeo-core-next/blob/315dc9781d8d2f74f17b1fd651a3ae81272b7fac/src/local-peers.js#L292)

___

### sendProjectJoinDetails

▸ **sendProjectJoinDetails**(`deviceId`, `details`): `Promise`\<`void`\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `deviceId` | `string` |
| `details` | `ProjectJoinDetails` |

#### Returns

`Promise`\<`void`\>

#### Defined in

[src/local-peers.js:302](https://github.com/digidem/mapeo-core-next/blob/315dc9781d8d2f74f17b1fd651a3ae81272b7fac/src/local-peers.js#L302)
