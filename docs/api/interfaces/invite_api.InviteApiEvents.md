[API](../README.md) / [invite-api](../modules/invite_api.md) / InviteApiEvents

# Interface: InviteApiEvents\<\>

[invite-api](../modules/invite_api.md).InviteApiEvents

## Table of contents

### Properties

- [invite-received](invite_api.InviteApiEvents.md#invite-received)
- [invite-removed](invite_api.InviteApiEvents.md#invite-removed)

## Properties

### invite-received

• **invite-received**: (`invite`: [`MapBuffers`](../modules/types.md#mapbuffers)\<[`InviteInternal`](../modules/invite_api.md#inviteinternal)\>) => `void`

#### Type declaration

▸ (`invite`): `void`

##### Parameters

| Name | Type |
| :------ | :------ |
| `invite` | [`MapBuffers`](../modules/types.md#mapbuffers)\<[`InviteInternal`](../modules/invite_api.md#inviteinternal)\> |

##### Returns

`void`

#### Defined in

[src/invite-api.js:154](https://github.com/digidem/mapeo-core-next/blob/53dc843a45bb963f7a880f5f7973107d5b1fb99c/src/invite-api.js#L154)

___

### invite-removed

• **invite-removed**: (`invite`: [`MapBuffers`](../modules/types.md#mapbuffers)\<[`InviteInternal`](../modules/invite_api.md#inviteinternal)\>, `removalReason`: [`InviteRemovalReason`](../modules/invite_api.md#inviteremovalreason)) => `void`

#### Type declaration

▸ (`invite`, `removalReason`): `void`

##### Parameters

| Name | Type |
| :------ | :------ |
| `invite` | [`MapBuffers`](../modules/types.md#mapbuffers)\<[`InviteInternal`](../modules/invite_api.md#inviteinternal)\> |
| `removalReason` | [`InviteRemovalReason`](../modules/invite_api.md#inviteremovalreason) |

##### Returns

`void`

#### Defined in

[src/invite-api.js:155](https://github.com/digidem/mapeo-core-next/blob/53dc843a45bb963f7a880f5f7973107d5b1fb99c/src/invite-api.js#L155)
