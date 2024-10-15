[**API**](../../README.md) • **Docs**

***

[API](../../README.md) / [\<internal\>](../README.md) / InviteApi

# Class: InviteApi

## Extends

- `TypedEmitter`

## Constructors

### new InviteApi()

> **new InviteApi**(`options`): [`InviteApi`](InviteApi.md)

#### Parameters

• **options**

• **options.logger**: `undefined` \| [`Logger`](Logger.md)

• **options.queries**

• **options.queries.addProject**

• **options.queries.getProjectByInviteId**

• **options.rpc**: [`LocalPeers`](LocalPeers.md)

#### Returns

[`InviteApi`](InviteApi.md)

#### Overrides

`TypedEmitter.constructor`

## Properties

### rpc

> **rpc**: [`LocalPeers`](LocalPeers.md)

## Methods

### accept()

> **accept**(`invite`): `Promise`\<`string`\>

Attempt to accept the invite.

This can fail if the invitor has canceled the invite or if you cannot
connect to the invitor's device.

If the invite is accepted and you had other invites to the same project,
those invites are removed, and the invitors are told that you're already
part of this project.

#### Parameters

• **invite**: `Pick`\<[`MapBuffers`](../type-aliases/MapBuffers.md)\<[`InviteInternal`](../type-aliases/InviteInternal.md)\>, `"inviteId"`\>

#### Returns

`Promise`\<`string`\>

***

### getPending()

> **getPending**(): [`MapBuffers`](../type-aliases/MapBuffers.md)\<[`InviteInternal`](../type-aliases/InviteInternal.md)\>[]

#### Returns

[`MapBuffers`](../type-aliases/MapBuffers.md)\<[`InviteInternal`](../type-aliases/InviteInternal.md)\>[]

***

### reject()

> **reject**(`invite`): `void`

#### Parameters

• **invite**: `Pick`\<[`MapBuffers`](../type-aliases/MapBuffers.md)\<[`InviteInternal`](../type-aliases/InviteInternal.md)\>, `"inviteId"`\>

#### Returns

`void`
