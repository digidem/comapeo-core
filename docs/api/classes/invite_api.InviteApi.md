[API](../README.md) / [invite-api](../modules/invite_api.md) / InviteApi

# Class: InviteApi

[invite-api](../modules/invite_api.md).InviteApi

## Hierarchy

- `TypedEmitter`

  ↳ **`InviteApi`**

## Table of contents

### Constructors

- [constructor](invite_api.InviteApi.md#constructor)

### Properties

- [rpc](invite_api.InviteApi.md#rpc)

### Methods

- [accept](invite_api.InviteApi.md#accept)
- [getPending](invite_api.InviteApi.md#getpending)
- [reject](invite_api.InviteApi.md#reject)

## Constructors

### constructor

• **new InviteApi**(`options`): [`InviteApi`](invite_api.InviteApi.md)

#### Parameters

| Name | Type |
| :------ | :------ |
| `options` | `Object` |
| `options.logger` | `undefined` \| [`Logger`](logger.Logger.md) |
| `options.queries` | `Object` |
| `options.queries.addProject` | (`projectDetails`: `Pick`\<[`ProjectJoinDetails`](../interfaces/invite_api.ProjectJoinDetails.md), ``"projectKey"`` \| ``"encryptionKeys"``\> & \{ `projectName`: `string`  }) => `Promise`\<`unknown`\> |
| `options.queries.isMember` | (`projectId`: `string`) => `boolean` |
| `options.rpc` | [`LocalPeers`](local_peers.LocalPeers.md) |

#### Returns

[`InviteApi`](invite_api.InviteApi.md)

#### Overrides

TypedEmitter.constructor

#### Defined in

[src/invite-api.js:175](https://github.com/digidem/mapeo-core-next/blob/53dc843a45bb963f7a880f5f7973107d5b1fb99c/src/invite-api.js#L175)

## Properties

### rpc

• **rpc**: [`LocalPeers`](local_peers.LocalPeers.md)

#### Defined in

[src/invite-api.js:180](https://github.com/digidem/mapeo-core-next/blob/53dc843a45bb963f7a880f5f7973107d5b1fb99c/src/invite-api.js#L180)

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
| `invite` | `Pick`\<[`MapBuffers`](../modules/types.md#mapbuffers)\<[`InviteInternal`](../modules/invite_api.md#inviteinternal)\>, ``"inviteId"``\> |

#### Returns

`Promise`\<`string`\>

#### Defined in

[src/invite-api.js:286](https://github.com/digidem/mapeo-core-next/blob/53dc843a45bb963f7a880f5f7973107d5b1fb99c/src/invite-api.js#L286)

___

### getPending

▸ **getPending**(): [`MapBuffers`](../modules/types.md#mapbuffers)\<[`InviteInternal`](../modules/invite_api.md#inviteinternal)\>[]

#### Returns

[`MapBuffers`](../modules/types.md#mapbuffers)\<[`InviteInternal`](../modules/invite_api.md#inviteinternal)\>[]

#### Defined in

[src/invite-api.js:267](https://github.com/digidem/mapeo-core-next/blob/53dc843a45bb963f7a880f5f7973107d5b1fb99c/src/invite-api.js#L267)

___

### reject

▸ **reject**(`invite`): `void`

#### Parameters

| Name | Type |
| :------ | :------ |
| `invite` | `Pick`\<[`MapBuffers`](../modules/types.md#mapbuffers)\<[`InviteInternal`](../modules/invite_api.md#inviteinternal)\>, ``"inviteId"``\> |

#### Returns

`void`

#### Defined in

[src/invite-api.js:416](https://github.com/digidem/mapeo-core-next/blob/53dc843a45bb963f7a880f5f7973107d5b1fb99c/src/invite-api.js#L416)
