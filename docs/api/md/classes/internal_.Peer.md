[API](../README.md) / [\<internal\>](../modules/internal_.md) / Peer

# Class: Peer

[\<internal\>](../modules/internal_.md).Peer

## Table of contents

### Constructors

- [constructor](internal_.Peer.md#constructor)

### Accessors

- [connected](internal_.Peer.md#connected)
- [info](internal_.Peer.md#info)
- [protomux](internal_.Peer.md#protomux)

### Methods

- [[kTestOnlySendRawInvite]](internal_.Peer.md#[ktestonlysendrawinvite])
- [connect](internal_.Peer.md#connect)
- [disconnect](internal_.Peer.md#disconnect)
- [receiveDeviceInfo](internal_.Peer.md#receivedeviceinfo)
- [sendDeviceInfo](internal_.Peer.md#senddeviceinfo)
- [sendInvite](internal_.Peer.md#sendinvite)
- [sendInviteCancel](internal_.Peer.md#sendinvitecancel)
- [sendInviteResponse](internal_.Peer.md#sendinviteresponse)
- [sendProjectJoinDetails](internal_.Peer.md#sendprojectjoindetails)

## Constructors

### constructor

• **new Peer**(`options`): [`Peer`](internal_.Peer.md)

#### Parameters

| Name | Type |
| :------ | :------ |
| `options` | `Object` |
| `options.channel` | [`Channel`](../interfaces/internal_.Channel.md) |
| `options.logger` | `undefined` \| [`Logger`](internal_.Logger.md) |
| `options.peerId` | `string` |
| `options.protomux` | [`Protomux`](internal_.Protomux.md)\<`any`\> |

#### Returns

[`Peer`](internal_.Peer.md)

#### Defined in

[src/local-peers.js:76](https://github.com/digidem/mapeo-core-next/blob/315dc9781d8d2f74f17b1fd651a3ae81272b7fac/src/local-peers.js#L76)

## Accessors

### connected

• `get` **connected**(): `Promise`\<`any`\>

A promise that resolves when the peer connects, or rejects if it
fails to connect

#### Returns

`Promise`\<`any`\>

#### Defined in

[src/local-peers.js:129](https://github.com/digidem/mapeo-core-next/blob/315dc9781d8d2f74f17b1fd651a3ae81272b7fac/src/local-peers.js#L129)

___

### info

• `get` **info**(): [`PeerInfoInternal`](../modules/internal_.__home_szgy_src_dd_mapeo_core_next_src_local_peers_.md#peerinfointernal)

#### Returns

[`PeerInfoInternal`](../modules/internal_.__home_szgy_src_dd_mapeo_core_next_src_local_peers_.md#peerinfointernal)

#### Defined in

[src/local-peers.js:94](https://github.com/digidem/mapeo-core-next/blob/315dc9781d8d2f74f17b1fd651a3ae81272b7fac/src/local-peers.js#L94)

___

### protomux

• `get` **protomux**(): [`Protomux`](internal_.Protomux.md)\<`any`\>

#### Returns

[`Protomux`](internal_.Protomux.md)\<`any`\>

#### Defined in

[src/local-peers.js:132](https://github.com/digidem/mapeo-core-next/blob/315dc9781d8d2f74f17b1fd651a3ae81272b7fac/src/local-peers.js#L132)

## Methods

### [kTestOnlySendRawInvite]

▸ **[kTestOnlySendRawInvite]**(`buf`): `void`

#### Parameters

| Name | Type |
| :------ | :------ |
| `buf` | `Buffer` |

#### Returns

`void`

#### Defined in

[src/local-peers.js:164](https://github.com/digidem/mapeo-core-next/blob/315dc9781d8d2f74f17b1fd651a3ae81272b7fac/src/local-peers.js#L164)

___

### connect

▸ **connect**(): `void`

#### Returns

`void`

#### Defined in

[src/local-peers.js:136](https://github.com/digidem/mapeo-core-next/blob/315dc9781d8d2f74f17b1fd651a3ae81272b7fac/src/local-peers.js#L136)

___

### disconnect

▸ **disconnect**(): `void`

#### Returns

`void`

#### Defined in

[src/local-peers.js:147](https://github.com/digidem/mapeo-core-next/blob/315dc9781d8d2f74f17b1fd651a3ae81272b7fac/src/local-peers.js#L147)

___

### receiveDeviceInfo

▸ **receiveDeviceInfo**(`deviceInfo`): `void`

#### Parameters

| Name | Type |
| :------ | :------ |
| `deviceInfo` | `DeviceInfo` |

#### Returns

`void`

#### Defined in

[src/local-peers.js:209](https://github.com/digidem/mapeo-core-next/blob/315dc9781d8d2f74f17b1fd651a3ae81272b7fac/src/local-peers.js#L209)

___

### sendDeviceInfo

▸ **sendDeviceInfo**(`deviceInfo`): `void`

#### Parameters

| Name | Type |
| :------ | :------ |
| `deviceInfo` | `DeviceInfo` |

#### Returns

`void`

#### Defined in

[src/local-peers.js:202](https://github.com/digidem/mapeo-core-next/blob/315dc9781d8d2f74f17b1fd651a3ae81272b7fac/src/local-peers.js#L202)

___

### sendInvite

▸ **sendInvite**(`invite`): `void`

#### Parameters

| Name | Type |
| :------ | :------ |
| `invite` | `Invite` |

#### Returns

`void`

#### Defined in

[src/local-peers.js:170](https://github.com/digidem/mapeo-core-next/blob/315dc9781d8d2f74f17b1fd651a3ae81272b7fac/src/local-peers.js#L170)

___

### sendInviteCancel

▸ **sendInviteCancel**(`inviteCancel`): `void`

#### Parameters

| Name | Type |
| :------ | :------ |
| `inviteCancel` | `InviteCancel` |

#### Returns

`void`

#### Defined in

[src/local-peers.js:178](https://github.com/digidem/mapeo-core-next/blob/315dc9781d8d2f74f17b1fd651a3ae81272b7fac/src/local-peers.js#L178)

___

### sendInviteResponse

▸ **sendInviteResponse**(`response`): `void`

#### Parameters

| Name | Type |
| :------ | :------ |
| `response` | `InviteResponse` |

#### Returns

`void`

#### Defined in

[src/local-peers.js:186](https://github.com/digidem/mapeo-core-next/blob/315dc9781d8d2f74f17b1fd651a3ae81272b7fac/src/local-peers.js#L186)

___

### sendProjectJoinDetails

▸ **sendProjectJoinDetails**(`details`): `void`

#### Parameters

| Name | Type |
| :------ | :------ |
| `details` | `ProjectJoinDetails` |

#### Returns

`void`

#### Defined in

[src/local-peers.js:194](https://github.com/digidem/mapeo-core-next/blob/315dc9781d8d2f74f17b1fd651a3ae81272b7fac/src/local-peers.js#L194)
