[API](../README.md) / [local-peers](../modules/local_peers.md) / LocalPeersEvents

# Interface: LocalPeersEvents\<\>

[local-peers](../modules/local_peers.md).LocalPeersEvents

## Table of contents

### Properties

- [discovery-key](local_peers.LocalPeersEvents.md#discovery-key)
- [got-project-details](local_peers.LocalPeersEvents.md#got-project-details)
- [invite](local_peers.LocalPeersEvents.md#invite)
- [invite-cancel](local_peers.LocalPeersEvents.md#invite-cancel)
- [invite-response](local_peers.LocalPeersEvents.md#invite-response)
- [peer-add](local_peers.LocalPeersEvents.md#peer-add)
- [peers](local_peers.LocalPeersEvents.md#peers)

## Properties

### discovery-key

• **discovery-key**: (`discoveryKey`: `Buffer`, `protomux`: `Protomux`\<`NoiseSecretStream`\<`Duplex`\<`any`, `any`, `any`, `any`, ``true``, ``true``, `DuplexEvents`\<`any`, `any`\>\>\>\>) => `void`

Emitted when a new hypercore is replicated (by a peer) to a peer protomux instance (passed as the second parameter)

#### Type declaration

▸ (`discoveryKey`, `protomux`): `void`

##### Parameters

| Name | Type |
| :------ | :------ |
| `discoveryKey` | `Buffer` |
| `protomux` | `Protomux`\<`NoiseSecretStream`\<`Duplex`\<`any`, `any`, `any`, `any`, ``true``, ``true``, `DuplexEvents`\<`any`, `any`\>\>\>\> |

##### Returns

`void`

#### Defined in

[src/local-peers.js:215](https://github.com/digidem/mapeo-core-next/blob/53dc843a45bb963f7a880f5f7973107d5b1fb99c/src/local-peers.js#L215)

___

### got-project-details

• **got-project-details**: (`peerId`: `string`, `details`: [`ProjectJoinDetails`](invite_api.ProjectJoinDetails.md)) => `void`

Emitted when project details are received

#### Type declaration

▸ (`peerId`, `details`): `void`

##### Parameters

| Name | Type |
| :------ | :------ |
| `peerId` | `string` |
| `details` | [`ProjectJoinDetails`](invite_api.ProjectJoinDetails.md) |

##### Returns

`void`

#### Defined in

[src/local-peers.js:214](https://github.com/digidem/mapeo-core-next/blob/53dc843a45bb963f7a880f5f7973107d5b1fb99c/src/local-peers.js#L214)

___

### invite

• **invite**: (`peerId`: `string`, `invite`: [`InviteRpcMessage`](invite_api.InviteRpcMessage.md)) => `void`

Emitted when an invite is received

#### Type declaration

▸ (`peerId`, `invite`): `void`

##### Parameters

| Name | Type |
| :------ | :------ |
| `peerId` | `string` |
| `invite` | [`InviteRpcMessage`](invite_api.InviteRpcMessage.md) |

##### Returns

`void`

#### Defined in

[src/local-peers.js:211](https://github.com/digidem/mapeo-core-next/blob/53dc843a45bb963f7a880f5f7973107d5b1fb99c/src/local-peers.js#L211)

___

### invite-cancel

• **invite-cancel**: (`peerId`: `string`, `invite`: [`InviteCancel`](invite_api.InviteCancel.md)) => `void`

Emitted when we receive a cancelation for an invite

#### Type declaration

▸ (`peerId`, `invite`): `void`

##### Parameters

| Name | Type |
| :------ | :------ |
| `peerId` | `string` |
| `invite` | [`InviteCancel`](invite_api.InviteCancel.md) |

##### Returns

`void`

#### Defined in

[src/local-peers.js:212](https://github.com/digidem/mapeo-core-next/blob/53dc843a45bb963f7a880f5f7973107d5b1fb99c/src/local-peers.js#L212)

___

### invite-response

• **invite-response**: (`peerId`: `string`, `inviteResponse`: [`InviteResponse`](member_api.InviteResponse.md)) => `void`

Emitted when an invite response is received

#### Type declaration

▸ (`peerId`, `inviteResponse`): `void`

##### Parameters

| Name | Type |
| :------ | :------ |
| `peerId` | `string` |
| `inviteResponse` | [`InviteResponse`](member_api.InviteResponse.md) |

##### Returns

`void`

#### Defined in

[src/local-peers.js:213](https://github.com/digidem/mapeo-core-next/blob/53dc843a45bb963f7a880f5f7973107d5b1fb99c/src/local-peers.js#L213)

___

### peer-add

• **peer-add**: (`peer`: [`PeerInfoConnected`](../modules/local_peers.md#peerinfoconnected)) => `void`

Emitted when a new peer is connected

#### Type declaration

▸ (`peer`): `void`

##### Parameters

| Name | Type |
| :------ | :------ |
| `peer` | [`PeerInfoConnected`](../modules/local_peers.md#peerinfoconnected) |

##### Returns

`void`

#### Defined in

[src/local-peers.js:210](https://github.com/digidem/mapeo-core-next/blob/53dc843a45bb963f7a880f5f7973107d5b1fb99c/src/local-peers.js#L210)

___

### peers

• **peers**: (`peers`: [`PeerInfo`](../modules/local_peers.md#peerinfo)[]) => `void`

Emitted whenever the connection status of peers changes. An array of peerInfo objects with a peer id and the peer connection status

#### Type declaration

▸ (`peers`): `void`

##### Parameters

| Name | Type |
| :------ | :------ |
| `peers` | [`PeerInfo`](../modules/local_peers.md#peerinfo)[] |

##### Returns

`void`

#### Defined in

[src/local-peers.js:209](https://github.com/digidem/mapeo-core-next/blob/53dc843a45bb963f7a880f5f7973107d5b1fb99c/src/local-peers.js#L209)
