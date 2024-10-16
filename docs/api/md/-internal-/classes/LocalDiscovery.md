[**API**](../../README.md) • **Docs**

***

[API](../../README.md) / [\<internal\>](../README.md) / LocalDiscovery

# Class: LocalDiscovery

## Extends

- `TypedEmitter`

## Constructors

### new LocalDiscovery()

> **new LocalDiscovery**(`opts`): [`LocalDiscovery`](LocalDiscovery.md)

#### Parameters

• **opts**

• **opts.identityKeypair**: [`Keypair`](../type-aliases/Keypair.md)

• **opts.logger**: `undefined` \| [`Logger`](Logger.md)

#### Returns

[`LocalDiscovery`](LocalDiscovery.md)

#### Overrides

`TypedEmitter.constructor`

## Methods

### connectPeer()

> **connectPeer**(`peer`): `void`

#### Parameters

• **peer**

• **peer.address**: `string`

• **peer.name**: `string`

• **peer.port**: `number`

#### Returns

`void`

***

### start()

> **start**(): `Promise`\<`object`\>

#### Returns

`Promise`\<`object`\>

##### name

> **name**: `string`

##### port

> **port**: `number`

***

### stop()

> **stop**(`opts`?): `Promise`\<`void`\>

Close all servers and stop multicast advertising and browsing. Will wait
for open sockets to close unless opts.force=true in which case open sockets
are force-closed after opts.timeout milliseconds

#### Parameters

• **opts?**

• **opts.force?**: `undefined` \| `boolean`

Force-close open sockets after timeout milliseconds

• **opts.timeout?**: `undefined` \| `number`

Optional timeout when calling stop() with force=true

#### Returns

`Promise`\<`void`\>
