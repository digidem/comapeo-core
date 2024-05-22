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

## Accessors

### connected

• `get` **connected**(): `Promise`\<`any`\>

A promise that resolves when the peer connects, or rejects if it
fails to connect

#### Returns

`Promise`\<`any`\>

___

### info

• `get` **info**(): [`PeerInfoInternal`](../modules/internal_.__home_runner_work_mapeo_core_next_mapeo_core_next_src_local_peers_.md#peerinfointernal)

#### Returns

[`PeerInfoInternal`](../modules/internal_.__home_runner_work_mapeo_core_next_mapeo_core_next_src_local_peers_.md#peerinfointernal)

___

### protomux

• `get` **protomux**(): [`Protomux`](internal_.Protomux.md)\<`any`\>

#### Returns

[`Protomux`](internal_.Protomux.md)\<`any`\>

## Methods

### [kTestOnlySendRawInvite]

▸ **[kTestOnlySendRawInvite]**(`buf`): `void`

#### Parameters

| Name | Type |
| :------ | :------ |
| `buf` | `Buffer` |

#### Returns

`void`

___

### connect

▸ **connect**(): `void`

#### Returns

`void`

___

### disconnect

▸ **disconnect**(): `void`

#### Returns

`void`

___

### receiveDeviceInfo

▸ **receiveDeviceInfo**(`deviceInfo`): `void`

#### Parameters

| Name | Type |
| :------ | :------ |
| `deviceInfo` | `DeviceInfo` |

#### Returns

`void`

___

### sendDeviceInfo

▸ **sendDeviceInfo**(`deviceInfo`): `void`

#### Parameters

| Name | Type |
| :------ | :------ |
| `deviceInfo` | `DeviceInfo` |

#### Returns

`void`

___

### sendInvite

▸ **sendInvite**(`invite`): `void`

#### Parameters

| Name | Type |
| :------ | :------ |
| `invite` | `Invite` |

#### Returns

`void`

___

### sendInviteCancel

▸ **sendInviteCancel**(`inviteCancel`): `void`

#### Parameters

| Name | Type |
| :------ | :------ |
| `inviteCancel` | `InviteCancel` |

#### Returns

`void`

___

### sendInviteResponse

▸ **sendInviteResponse**(`response`): `void`

#### Parameters

| Name | Type |
| :------ | :------ |
| `response` | `InviteResponse` |

#### Returns

`void`

___

### sendProjectJoinDetails

▸ **sendProjectJoinDetails**(`details`): `void`

#### Parameters

| Name | Type |
| :------ | :------ |
| `details` | `ProjectJoinDetails` |

#### Returns

`void`
