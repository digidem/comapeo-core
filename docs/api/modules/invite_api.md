[API](../README.md) / invite-api

# Module: invite-api

## Table of contents

### Classes

- [InviteApi](../classes/invite_api.InviteApi.md)

### Interfaces

- [InviteApiEvents](../interfaces/invite_api.InviteApiEvents.md)
- [InviteCancel](../interfaces/invite_api.InviteCancel.md)
- [InviteRpcMessage](../interfaces/invite_api.InviteRpcMessage.md)
- [ProjectJoinDetails](../interfaces/invite_api.ProjectJoinDetails.md)

### Type Aliases

- [Invite](invite_api.md#invite)
- [InviteInternal](invite_api.md#inviteinternal)
- [InviteRemovalReason](invite_api.md#inviteremovalreason)

### Variables

- [InviteCancel](invite_api.md#invitecancel)
- [InviteRpcMessage](invite_api.md#inviterpcmessage)
- [ProjectJoinDetails](invite_api.md#projectjoindetails)

## Type Aliases

### Invite

Ƭ **Invite**\<\>: [`types`](types.md)

#### Defined in

[src/invite-api.js:26](https://github.com/digidem/mapeo-core-next/blob/53dc843a45bb963f7a880f5f7973107d5b1fb99c/src/invite-api.js#L26)

___

### InviteInternal

Ƭ **InviteInternal**\<\>: [`InviteRpcMessage`](../interfaces/invite_api.InviteRpcMessage.md) & \{ `receivedAt`: `number`  }

#### Defined in

[src/invite-api.js:23](https://github.com/digidem/mapeo-core-next/blob/53dc843a45bb963f7a880f5f7973107d5b1fb99c/src/invite-api.js#L23)

___

### InviteRemovalReason

Ƭ **InviteRemovalReason**\<\>: ``"accepted"`` \| ``"rejected"`` \| ``"canceled"`` \| ``"accepted other"`` \| ``"connection error"`` \| ``"internal error"``

#### Defined in

[src/invite-api.js:36](https://github.com/digidem/mapeo-core-next/blob/53dc843a45bb963f7a880f5f7973107d5b1fb99c/src/invite-api.js#L36)

## Variables

### InviteCancel

• **InviteCancel**: `Object`

#### Type declaration

| Name | Type |
| :------ | :------ |
| `create` | \<I\>(`base?`: `I`) => [`InviteCancel`](../interfaces/invite_api.InviteCancel.md) |
| `decode` | (`input`: `Uint8Array` \| `Reader`, `length?`: `number`) => [`InviteCancel`](../interfaces/invite_api.InviteCancel.md) |
| `encode` | (`message`: [`InviteCancel`](../interfaces/invite_api.InviteCancel.md), `writer`: `Writer`) => `Writer` |
| `fromPartial` | \<I\>(`object`: `I`) => [`InviteCancel`](../interfaces/invite_api.InviteCancel.md) |

#### Defined in

[src/generated/rpc.ts:14](https://github.com/digidem/mapeo-core-next/blob/53dc843a45bb963f7a880f5f7973107d5b1fb99c/src/generated/rpc.ts#L14)

[src/generated/rpc.ts:220](https://github.com/digidem/mapeo-core-next/blob/53dc843a45bb963f7a880f5f7973107d5b1fb99c/src/generated/rpc.ts#L220)

___

### InviteRpcMessage

• **InviteRpcMessage**: `Object`

#### Type declaration

| Name | Type |
| :------ | :------ |
| `create` | \<I\>(`base?`: `I`) => [`InviteRpcMessage`](../interfaces/invite_api.InviteRpcMessage.md) |
| `decode` | (`input`: `Uint8Array` \| `Reader`, `length?`: `number`) => [`InviteRpcMessage`](../interfaces/invite_api.InviteRpcMessage.md) |
| `encode` | (`message`: [`InviteRpcMessage`](../interfaces/invite_api.InviteRpcMessage.md), `writer`: `Writer`) => `Writer` |
| `fromPartial` | \<I\>(`object`: `I`) => [`InviteRpcMessage`](../interfaces/invite_api.InviteRpcMessage.md) |

#### Defined in

[src/generated/rpc.ts:5](https://github.com/digidem/mapeo-core-next/blob/53dc843a45bb963f7a880f5f7973107d5b1fb99c/src/generated/rpc.ts#L5)

[src/generated/rpc.ts:120](https://github.com/digidem/mapeo-core-next/blob/53dc843a45bb963f7a880f5f7973107d5b1fb99c/src/generated/rpc.ts#L120)

___

### ProjectJoinDetails

• **ProjectJoinDetails**: `Object`

#### Type declaration

| Name | Type |
| :------ | :------ |
| `create` | \<I\>(`base?`: `I`) => [`ProjectJoinDetails`](../interfaces/invite_api.ProjectJoinDetails.md) |
| `decode` | (`input`: `Uint8Array` \| `Reader`, `length?`: `number`) => [`ProjectJoinDetails`](../interfaces/invite_api.ProjectJoinDetails.md) |
| `encode` | (`message`: [`ProjectJoinDetails`](../interfaces/invite_api.ProjectJoinDetails.md), `writer`: `Writer`) => `Writer` |
| `fromPartial` | \<I\>(`object`: `I`) => [`ProjectJoinDetails`](../interfaces/invite_api.ProjectJoinDetails.md) |

#### Defined in

[src/generated/rpc.ts:64](https://github.com/digidem/mapeo-core-next/blob/53dc843a45bb963f7a880f5f7973107d5b1fb99c/src/generated/rpc.ts#L64)

[src/generated/rpc.ts:321](https://github.com/digidem/mapeo-core-next/blob/53dc843a45bb963f7a880f5f7973107d5b1fb99c/src/generated/rpc.ts#L321)
