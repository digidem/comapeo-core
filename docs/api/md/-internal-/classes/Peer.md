[**API**](../../README.md) • **Docs**

***

[API](../../README.md) / [\<internal\>](../README.md) / Peer

# Class: Peer

## Constructors

### new Peer()

> **new Peer**(`options`): [`Peer`](Peer.md)

#### Parameters

• **options**

• **options.channel**: [`Channel`](../interfaces/Channel.md)

• **options.logger**: `undefined` \| [`Logger`](Logger.md)

• **options.peerId**: `string`

• **options.protomux**: [`Protomux`](Protomux.md)\<`any`\>

#### Returns

[`Peer`](Peer.md)

## Accessors

### connected

> `get` **connected**(): `Promise`\<`any`\>

A promise that resolves when the peer connects, or rejects if it
fails to connect

#### Returns

`Promise`\<`any`\>

***

### info

> `get` **info**(): [`PeerInfoInternal`](../namespaces/home_runner_work_comapeo-core_comapeo-core_src_local-peers/type-aliases/PeerInfoInternal.md)

#### Returns

[`PeerInfoInternal`](../namespaces/home_runner_work_comapeo-core_comapeo-core_src_local-peers/type-aliases/PeerInfoInternal.md)

***

### protomux

> `get` **protomux**(): [`Protomux`](Protomux.md)\<`any`\>

#### Returns

[`Protomux`](Protomux.md)\<`any`\>

## Methods

### \[kTestOnlySendRawInvite\]()

> **\[kTestOnlySendRawInvite\]**(`buf`): `void`

#### Parameters

• **buf**: `Buffer`

#### Returns

`void`

***

### connect()

> **connect**(): `void`

#### Returns

`void`

***

### disconnect()

> **disconnect**(): `void`

#### Returns

`void`

***

### receiveDeviceInfo()

> **receiveDeviceInfo**(`deviceInfo`): `void`

#### Parameters

• **deviceInfo**: `DeviceInfo`

#### Returns

`void`

***

### sendDeviceInfo()

> **sendDeviceInfo**(`deviceInfo`): `void`

#### Parameters

• **deviceInfo**: `DeviceInfo`

#### Returns

`void`

***

### sendInvite()

> **sendInvite**(`invite`): `void`

#### Parameters

• **invite**: `Invite`

#### Returns

`void`

***

### sendInviteCancel()

> **sendInviteCancel**(`inviteCancel`): `void`

#### Parameters

• **inviteCancel**: `InviteCancel`

#### Returns

`void`

***

### sendInviteResponse()

> **sendInviteResponse**(`response`): `void`

#### Parameters

• **response**: `InviteResponse`

#### Returns

`void`

***

### sendProjectJoinDetails()

> **sendProjectJoinDetails**(`details`): `void`

#### Parameters

• **details**: `ProjectJoinDetails`

#### Returns

`void`
