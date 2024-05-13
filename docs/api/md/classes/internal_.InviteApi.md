[API](../README.md) / [\<internal\>](../modules/internal_.md) / InviteApi

# Class: InviteApi

[\<internal\>](../modules/internal_.md).InviteApi

## Hierarchy

- `TypedEmitter`

  ↳ **`InviteApi`**

## Table of contents

### Constructors

- [constructor](internal_.InviteApi.md#constructor)

### Properties

- [rpc](internal_.InviteApi.md#rpc)

### Methods

- [accept](internal_.InviteApi.md#accept)
- [getPending](internal_.InviteApi.md#getpending)
- [reject](internal_.InviteApi.md#reject)

## Constructors

### constructor

• **new InviteApi**(`options`): [`InviteApi`](internal_.InviteApi.md)

#### Parameters

| Name | Type |
| :------ | :------ |
| `options` | `Object` |
| `options.logger` | `undefined` \| [`Logger`](internal_.Logger.md) |
| `options.queries` | `Object` |
| `options.queries.addProject` | (`projectDetails`: `Pick`\<`ProjectJoinDetails`, ``"projectKey"`` \| ``"encryptionKeys"``\> & \{ `projectName`: `string`  }) => `Promise`\<`unknown`\> |
| `options.queries.isMember` | (`projectId`: `string`) => `boolean` |
| `options.rpc` | [`LocalPeers`](internal_.LocalPeers.md) |

#### Returns

[`InviteApi`](internal_.InviteApi.md)

#### Overrides

TypedEmitter.constructor

## Properties

### rpc

• **rpc**: [`LocalPeers`](internal_.LocalPeers.md)

## Methods

### accept

▸ **accept**(`invite`): `Promise`\<`string`\>

Attempt to accept the invite.

This can fail if the invitor has canceled the invite or if you cannot
connect to the invitor's device.

If the invite is accepted and you had other invites to the same project,
those invites are removed, and the invitors are told that you're already
part of this project.

#### Parameters

| Name | Type |
| :------ | :------ |
| `invite` | `Pick`\<[`MapBuffers`](../modules/internal_.md#mapbuffers)\<[`InviteInternal`](../modules/internal_.md#inviteinternal)\>, ``"inviteId"``\> |

#### Returns

`Promise`\<`string`\>

___

### getPending

▸ **getPending**(): [`MapBuffers`](../modules/internal_.md#mapbuffers)\<[`InviteInternal`](../modules/internal_.md#inviteinternal)\>[]

#### Returns

[`MapBuffers`](../modules/internal_.md#mapbuffers)\<[`InviteInternal`](../modules/internal_.md#inviteinternal)\>[]

___

### reject

▸ **reject**(`invite`): `void`

#### Parameters

| Name | Type |
| :------ | :------ |
| `invite` | `Pick`\<[`MapBuffers`](../modules/internal_.md#mapbuffers)\<[`InviteInternal`](../modules/internal_.md#inviteinternal)\>, ``"inviteId"``\> |

#### Returns

`void`
