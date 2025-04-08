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

> **\[kTestOnlySendRawInvite\]**(`buf`): `Promise`\<`void`\>

#### Parameters

• **buf**: `Buffer`

#### Returns

`Promise`\<`void`\>

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

### drained()

> **drained**(): `void`

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

> **sendDeviceInfo**(`deviceInfo`): `Promise`\<`void`\>

#### Parameters

• **deviceInfo**: `DeviceInfo`

#### Returns

`Promise`\<`void`\>

***

### sendInvite()

> **sendInvite**(`invite`): `Promise`\<`void`\>

#### Parameters

• **invite**: `Invite`

#### Returns

`Promise`\<`void`\>

***

### sendInviteCancel()

> **sendInviteCancel**(`inviteCancel`): `Promise`\<`void`\>

#### Parameters

• **inviteCancel**: `InviteCancel`

#### Returns

`Promise`\<`void`\>

***

### sendInviteResponse()

> **sendInviteResponse**(`response`): `Promise`\<`void`\>

#### Parameters

• **response**: `InviteResponse`

#### Returns

`Promise`\<`void`\>

***

### sendProjectJoinDetails()

> **sendProjectJoinDetails**(`details`): `Promise`\<`void`\>

#### Parameters

• **details**: `ProjectJoinDetails`

#### Returns

`Promise`\<`void`\>
