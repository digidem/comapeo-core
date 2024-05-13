[API](../README.md) / [\<internal\>](../modules/internal_.md) / PendingInvites

# Class: PendingInvites

[\<internal\>](../modules/internal_.md).PendingInvites

Manage pending invite state.

## Table of contents

### Constructors

- [constructor](internal_.PendingInvites.md#constructor)

### Methods

- [add](internal_.PendingInvites.md#add)
- [deleteByInviteId](internal_.PendingInvites.md#deletebyinviteid)
- [deleteByProjectPublicId](internal_.PendingInvites.md#deletebyprojectpublicid)
- [getByInviteId](internal_.PendingInvites.md#getbyinviteid)
- [hasInviteId](internal_.PendingInvites.md#hasinviteid)
- [invites](internal_.PendingInvites.md#invites)
- [isAcceptingForProject](internal_.PendingInvites.md#isacceptingforproject)
- [markAccepting](internal_.PendingInvites.md#markaccepting)

## Constructors

### constructor

• **new PendingInvites**(): [`PendingInvites`](internal_.PendingInvites.md)

#### Returns

[`PendingInvites`](internal_.PendingInvites.md)

## Methods

### add

▸ **add**(`pendingInvite`): `void`

#### Parameters

| Name | Type |
| :------ | :------ |
| `pendingInvite` | [`PendingInvite`](../interfaces/internal_.PendingInvite.md) |

#### Returns

`void`

**`Throws`**

if adding a duplicate invite ID

___

### deleteByInviteId

▸ **deleteByInviteId**(`inviteId`): `boolean`

#### Parameters

| Name | Type |
| :------ | :------ |
| `inviteId` | `Buffer` |

#### Returns

`boolean`

`true` if an invite existed and was deleted, `false` otherwise

___

### deleteByProjectPublicId

▸ **deleteByProjectPublicId**(`projectPublicId`): [`PendingInvite`](../interfaces/internal_.PendingInvite.md)[]

#### Parameters

| Name | Type |
| :------ | :------ |
| `projectPublicId` | `string` |

#### Returns

[`PendingInvite`](../interfaces/internal_.PendingInvite.md)[]

the pending invites that were deleted

___

### getByInviteId

▸ **getByInviteId**(`inviteId`): `undefined` \| [`PendingInvite`](../interfaces/internal_.PendingInvite.md)

#### Parameters

| Name | Type |
| :------ | :------ |
| `inviteId` | `Buffer` |

#### Returns

`undefined` \| [`PendingInvite`](../interfaces/internal_.PendingInvite.md)

___

### hasInviteId

▸ **hasInviteId**(`inviteId`): `boolean`

#### Parameters

| Name | Type |
| :------ | :------ |
| `inviteId` | `Buffer` |

#### Returns

`boolean`

___

### invites

▸ **invites**(): `Iterable`\<[`PendingInvite`](../interfaces/internal_.PendingInvite.md)\>

#### Returns

`Iterable`\<[`PendingInvite`](../interfaces/internal_.PendingInvite.md)\>

the pending invites, in insertion order

___

### isAcceptingForProject

▸ **isAcceptingForProject**(`projectPublicId`): `boolean`

#### Parameters

| Name | Type |
| :------ | :------ |
| `projectPublicId` | `string` |

#### Returns

`boolean`

___

### markAccepting

▸ **markAccepting**(`inviteId`): `void`

#### Parameters

| Name | Type |
| :------ | :------ |
| `inviteId` | `Buffer` |

#### Returns

`void`
