[**API**](../../../../README.md) • **Docs**

***

[API](../../../../README.md) / [\<internal\>](../../../README.md) / ["/home/runner/work/comapeo-core/comapeo-core/src/local-peers"](../README.md) / LocalPeersEvents

# Interface: LocalPeersEvents

## Properties

### discovery-key()

> **discovery-key**: (`discoveryKey`, `protomux`) => `void`

Emitted when a new hypercore is replicated (by a peer) to a peer protomux instance (passed as the second parameter)

#### Parameters

• **discoveryKey**: `Buffer`

• **protomux**: [`Protomux`](../../../classes/Protomux.md)\<`NoiseSecretStream`\<`Duplex`\<`any`, `any`, `any`, `any`, `true`, `true`, `DuplexEvents`\<`any`, `any`\>\>\>\>

#### Returns

`void`

***

### failed-to-handle-message()

> **failed-to-handle-message**: (`messageType`, `errorMessage`?) => `void`

Emitted when we received a message we couldn't handle for some reason. Primarily useful for testing

#### Parameters

• **messageType**: `string`

• **errorMessage?**: `string`

#### Returns

`void`

***

### got-project-details()

> **got-project-details**: (`peerId`, `details`) => `void`

Emitted when project details are received

#### Parameters

• **peerId**: `string`

• **details**: `ProjectJoinDetails`

#### Returns

`void`

***

### got-project-details-ack()

> **got-project-details-ack**: (`peerId`, `details`) => `void`

Emitted when project details are acknowledged as received

#### Parameters

• **peerId**: `string`

• **details**: `ProjectJoinDetailsAck`

#### Returns

`void`

***

### invite()

> **invite**: (`peerId`, `invite`) => `void`

Emitted when an invite is received

#### Parameters

• **peerId**: `string`

• **invite**: `Invite`

#### Returns

`void`

***

### invite-ack()

> **invite-ack**: (`peerId`, `invite`) => `void`

Emitted when an invite acknowledgement is received

#### Parameters

• **peerId**: `string`

• **invite**: `InviteAck`

#### Returns

`void`

***

### invite-cancel()

> **invite-cancel**: (`peerId`, `invite`) => `void`

Emitted when we receive a cancelation for an invite

#### Parameters

• **peerId**: `string`

• **invite**: `InviteCancel`

#### Returns

`void`

***

### invite-cancel-ack()

> **invite-cancel-ack**: (`peerId`, `invite`) => `void`

Emitted when we receive a cancelation acknowledgement for an invite

#### Parameters

• **peerId**: `string`

• **invite**: `InviteCancelAck`

#### Returns

`void`

***

### invite-response()

> **invite-response**: (`peerId`, `inviteResponse`) => `void`

Emitted when an invite response is received

#### Parameters

• **peerId**: `string`

• **inviteResponse**: `InviteResponse`

#### Returns

`void`

***

### invite-response-ack()

> **invite-response-ack**: (`peerId`, `inviteResponse`) => `void`

Emitted when an invite response acknowledgement is received

#### Parameters

• **peerId**: `string`

• **inviteResponse**: `InviteResponseAck`

#### Returns

`void`

***

### peer-add()

> **peer-add**: (`peer`) => `void`

Emitted when a new peer is connected

#### Parameters

• **peer**: [`PeerInfoConnected`](../../../type-aliases/PeerInfoConnected.md)

#### Returns

`void`

***

### peers()

> **peers**: (`peers`) => `void`

Emitted whenever the connection status of peers changes. An array of peerInfo objects with a peer id and the peer connection status

#### Parameters

• **peers**: [`PeerInfo`](../type-aliases/PeerInfo.md)[]

#### Returns

`void`
