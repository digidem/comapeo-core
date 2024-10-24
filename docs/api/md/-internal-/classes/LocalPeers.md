[**API**](../../README.md) • **Docs**

***

[API](../../README.md) / [\<internal\>](../README.md) / LocalPeers

# Class: LocalPeers

## Extends

- `TypedEmitter`

## Constructors

### new LocalPeers()

> **new LocalPeers**(`opts`?): [`LocalPeers`](LocalPeers.md)

#### Parameters

• **opts?** = `{}`

• **opts.logger?**: `undefined` \| [`Logger`](Logger.md)

#### Returns

[`LocalPeers`](LocalPeers.md)

#### Overrides

`TypedEmitter.constructor`

## Accessors

### peers

> `get` **peers**(): ([`PeerInfoBase`](../interfaces/PeerInfoBase.md) & `object` \| [`PeerInfoBase`](../interfaces/PeerInfoBase.md) & `object`)[]

#### Returns

([`PeerInfoBase`](../interfaces/PeerInfoBase.md) & `object` \| [`PeerInfoBase`](../interfaces/PeerInfoBase.md) & `object`)[]

## Methods

### \[kTestOnlySendRawInvite\]()

> **\[kTestOnlySendRawInvite\]**(`deviceId`, `buf`): `Promise`\<`void`\>

#### Parameters

• **deviceId**: `string`

• **buf**: `Buffer`

#### Returns

`Promise`\<`void`\>

***

### connect()

> **connect**(`stream`): [`ReplicationStream`](../type-aliases/ReplicationStream.md)

Connect to a peer over an existing NoiseSecretStream

#### Parameters

• **stream**: `NoiseSecretStream`\<`any`\>

#### Returns

[`ReplicationStream`](../type-aliases/ReplicationStream.md)

***

### sendDeviceInfo()

> **sendDeviceInfo**(`deviceId`, `deviceInfo`): `Promise`\<`void`\>

#### Parameters

• **deviceId**: `string`

id of the peer you want to send to (publicKey of peer as hex string)

• **deviceInfo**: `DeviceInfo`

device info to send

#### Returns

`Promise`\<`void`\>

***

### sendInvite()

> **sendInvite**(`deviceId`, `invite`): `Promise`\<`void`\>

#### Parameters

• **deviceId**: `string`

• **invite**: `Invite`

#### Returns

`Promise`\<`void`\>

***

### sendInviteCancel()

> **sendInviteCancel**(`deviceId`, `inviteCancel`): `Promise`\<`void`\>

#### Parameters

• **deviceId**: `string`

• **inviteCancel**: `InviteCancel`

#### Returns

`Promise`\<`void`\>

***

### sendInviteResponse()

> **sendInviteResponse**(`deviceId`, `inviteResponse`): `Promise`\<`void`\>

Respond to an invite from a peer

#### Parameters

• **deviceId**: `string`

id of the peer you want to respond to (publicKey of peer as hex string)

• **inviteResponse**: `InviteResponse`

#### Returns

`Promise`\<`void`\>

***

### sendProjectJoinDetails()

> **sendProjectJoinDetails**(`deviceId`, `details`): `Promise`\<`void`\>

#### Parameters

• **deviceId**: `string`

• **details**: `ProjectJoinDetails`

#### Returns

`Promise`\<`void`\>
