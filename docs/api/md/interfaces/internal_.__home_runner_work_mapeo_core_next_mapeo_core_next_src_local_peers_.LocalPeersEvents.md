[API](../README.md) / [\<internal\>](../modules/internal_.md) / ["/home/runner/work/mapeo-core-next/mapeo-core-next/src/local-peers"](../modules/internal_.__home_runner_work_mapeo_core_next_mapeo_core_next_src_local_peers_.md) / LocalPeersEvents

# Interface: LocalPeersEvents\<\>

[\<internal\>](../modules/internal_.md).["/home/runner/work/mapeo-core-next/mapeo-core-next/src/local-peers"](../modules/internal_.__home_runner_work_mapeo_core_next_mapeo_core_next_src_local_peers_.md).LocalPeersEvents

## Table of contents

### Properties

- [discovery-key](internal_.__home_runner_work_mapeo_core_next_mapeo_core_next_src_local_peers_.LocalPeersEvents.md#discovery-key)
- [failed-to-handle-message](internal_.__home_runner_work_mapeo_core_next_mapeo_core_next_src_local_peers_.LocalPeersEvents.md#failed-to-handle-message)
- [got-project-details](internal_.__home_runner_work_mapeo_core_next_mapeo_core_next_src_local_peers_.LocalPeersEvents.md#got-project-details)
- [invite](internal_.__home_runner_work_mapeo_core_next_mapeo_core_next_src_local_peers_.LocalPeersEvents.md#invite)
- [invite-cancel](internal_.__home_runner_work_mapeo_core_next_mapeo_core_next_src_local_peers_.LocalPeersEvents.md#invite-cancel)
- [invite-response](internal_.__home_runner_work_mapeo_core_next_mapeo_core_next_src_local_peers_.LocalPeersEvents.md#invite-response)
- [peer-add](internal_.__home_runner_work_mapeo_core_next_mapeo_core_next_src_local_peers_.LocalPeersEvents.md#peer-add)
- [peers](internal_.__home_runner_work_mapeo_core_next_mapeo_core_next_src_local_peers_.LocalPeersEvents.md#peers)

## Properties

### discovery-key

• **discovery-key**: (`discoveryKey`: `Buffer`, `protomux`: [`Protomux`](../classes/internal_.Protomux.md)\<`NoiseSecretStream`\<`Duplex`\<`any`, `any`, `any`, `any`, ``true``, ``true``, `DuplexEvents`\<`any`, `any`\>\>\>\>) => `void`

Emitted when a new hypercore is replicated (by a peer) to a peer protomux instance (passed as the second parameter)

#### Type declaration

▸ (`discoveryKey`, `protomux`): `void`

##### Parameters

| Name | Type |
| :------ | :------ |
| `discoveryKey` | `Buffer` |
| `protomux` | [`Protomux`](../classes/internal_.Protomux.md)\<`NoiseSecretStream`\<`Duplex`\<`any`, `any`, `any`, `any`, ``true``, ``true``, `DuplexEvents`\<`any`, `any`\>\>\>\> |

##### Returns

`void`

___

### failed-to-handle-message

• **failed-to-handle-message**: (`messageType`: `string`, `errorMessage?`: `string`) => `void`

Emitted when we received a message we couldn't handle for some reason. Primarily useful for testing

#### Type declaration

▸ (`messageType`, `errorMessage?`): `void`

##### Parameters

| Name | Type |
| :------ | :------ |
| `messageType` | `string` |
| `errorMessage?` | `string` |

##### Returns

`void`

___

### got-project-details

• **got-project-details**: (`peerId`: `string`, `details`: `ProjectJoinDetails`) => `void`

Emitted when project details are received

#### Type declaration

▸ (`peerId`, `details`): `void`

##### Parameters

| Name | Type |
| :------ | :------ |
| `peerId` | `string` |
| `details` | `ProjectJoinDetails` |

##### Returns

`void`

___

### invite

• **invite**: (`peerId`: `string`, `invite`: `Invite`) => `void`

Emitted when an invite is received

#### Type declaration

▸ (`peerId`, `invite`): `void`

##### Parameters

| Name | Type |
| :------ | :------ |
| `peerId` | `string` |
| `invite` | `Invite` |

##### Returns

`void`

___

### invite-cancel

• **invite-cancel**: (`peerId`: `string`, `invite`: `InviteCancel`) => `void`

Emitted when we receive a cancelation for an invite

#### Type declaration

▸ (`peerId`, `invite`): `void`

##### Parameters

| Name | Type |
| :------ | :------ |
| `peerId` | `string` |
| `invite` | `InviteCancel` |

##### Returns

`void`

___

### invite-response

• **invite-response**: (`peerId`: `string`, `inviteResponse`: `InviteResponse`) => `void`

Emitted when an invite response is received

#### Type declaration

▸ (`peerId`, `inviteResponse`): `void`

##### Parameters

| Name | Type |
| :------ | :------ |
| `peerId` | `string` |
| `inviteResponse` | `InviteResponse` |

##### Returns

`void`

___

### peer-add

• **peer-add**: (`peer`: [`PeerInfoConnected`](../modules/internal_.md#peerinfoconnected)) => `void`

Emitted when a new peer is connected

#### Type declaration

▸ (`peer`): `void`

##### Parameters

| Name | Type |
| :------ | :------ |
| `peer` | [`PeerInfoConnected`](../modules/internal_.md#peerinfoconnected) |

##### Returns

`void`

___

### peers

• **peers**: (`peers`: [`PeerInfo`](../modules/internal_.__home_runner_work_mapeo_core_next_mapeo_core_next_src_local_peers_.md#peerinfo)[]) => `void`

Emitted whenever the connection status of peers changes. An array of peerInfo objects with a peer id and the peer connection status

#### Type declaration

▸ (`peers`): `void`

##### Parameters

| Name | Type |
| :------ | :------ |
| `peers` | [`PeerInfo`](../modules/internal_.__home_runner_work_mapeo_core_next_mapeo_core_next_src_local_peers_.md#peerinfo)[] |

##### Returns

`void`
