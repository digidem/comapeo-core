[**API**](../../README.md) • **Docs**

***

[API](../../README.md) / [\<internal\>](../README.md) / PendingInvites

# Class: PendingInvites

Manage pending invite state.

## Constructors

### new PendingInvites()

> **new PendingInvites**(): [`PendingInvites`](PendingInvites.md)

#### Returns

[`PendingInvites`](PendingInvites.md)

## Methods

### add()

> **add**(`pendingInvite`): `void`

#### Parameters

• **pendingInvite**: [`PendingInvite`](../interfaces/PendingInvite.md)

#### Returns

`void`

#### Throws

if adding a duplicate invite ID

***

### deleteByInviteId()

> **deleteByInviteId**(`inviteId`): `boolean`

#### Parameters

• **inviteId**: `Buffer`

#### Returns

`boolean`

`true` if an invite existed and was deleted, `false` otherwise

***

### deleteByProjectInviteId()

> **deleteByProjectInviteId**(`projectInviteId`): [`PendingInvite`](../interfaces/PendingInvite.md)[]

#### Parameters

• **projectInviteId**: `Readonly`\<`Buffer`\>

#### Returns

[`PendingInvite`](../interfaces/PendingInvite.md)[]

the pending invites that were deleted

***

### getByInviteId()

> **getByInviteId**(`inviteId`): `undefined` \| [`PendingInvite`](../interfaces/PendingInvite.md)

#### Parameters

• **inviteId**: `Buffer`

#### Returns

`undefined` \| [`PendingInvite`](../interfaces/PendingInvite.md)

***

### hasInviteId()

> **hasInviteId**(`inviteId`): `boolean`

#### Parameters

• **inviteId**: `Buffer`

#### Returns

`boolean`

***

### invites()

> **invites**(): `Iterable`\<[`PendingInvite`](../interfaces/PendingInvite.md), `any`, `any`\>

#### Returns

`Iterable`\<[`PendingInvite`](../interfaces/PendingInvite.md), `any`, `any`\>

the pending invites, in insertion order

***

### isAcceptingForProject()

> **isAcceptingForProject**(`projectInviteId`): `boolean`

#### Parameters

• **projectInviteId**: `Readonly`\<`Buffer`\>

#### Returns

`boolean`

***

### markAccepting()

> **markAccepting**(`inviteId`): `void`

#### Parameters

• **inviteId**: `Buffer`

#### Returns

`void`
