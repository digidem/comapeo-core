[**API**](../../README.md) • **Docs**

***

[API](../../README.md) / [\<internal\>](../README.md) / HypercorePeer

# Type Alias: HypercorePeer

> **HypercorePeer**: `object`

A subset of Hypercore's `Peer` class that we use.
TODO: Contribute these types upstream.

## Type declaration

### onbitfield()

> **onbitfield**: (`options`) => `void`

#### Parameters

• **options**

• **options.bitfield**: `Buffer`

• **options.start**: `number`

#### Returns

`void`

### onrange()

> **onrange**: (`options`) => `void`

#### Parameters

• **options**

• **options.drop**: `boolean`

• **options.length**: `number`

• **options.start**: `number`

#### Returns

`void`

### protomux

> **protomux**: [`Protomux`](../classes/Protomux.md)

### remoteBitfield

> **remoteBitfield**: [`HypercoreRemoteBitfield`](HypercoreRemoteBitfield.md)

### remotePublicKey

> **remotePublicKey**: `Buffer`
