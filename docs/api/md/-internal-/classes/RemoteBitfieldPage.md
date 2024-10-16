[**API**](../../README.md) • **Docs**

***

[API](../../README.md) / [\<internal\>](../README.md) / RemoteBitfieldPage

# Class: RemoteBitfieldPage

## Constructors

### new RemoteBitfieldPage()

> **new RemoteBitfieldPage**(`index`, `bitfield`, `segment`): [`RemoteBitfieldPage`](RemoteBitfieldPage.md)

#### Parameters

• **index**: `number`

• **bitfield**: `Uint32Array`

• **segment**: [`RemoteBitfieldSegment`](RemoteBitfieldSegment.md)

#### Returns

[`RemoteBitfieldPage`](RemoteBitfieldPage.md)

## Properties

### bitfield

> **bitfield**: `Uint32Array`

***

### index

> **index**: `number`

***

### offset

> **offset**: `number`

***

### segment

> **segment**: [`RemoteBitfieldSegment`](RemoteBitfieldSegment.md)

## Accessors

### tree

> `get` **tree**(): [`SparseIndex`](SparseIndex.md)

#### Returns

[`SparseIndex`](SparseIndex.md)

## Methods

### findFirst()

> **findFirst**(`val`, `position`): `number`

#### Parameters

• **val**: `boolean`

• **position**: `number`

#### Returns

`number`

***

### findLast()

> **findLast**(`val`, `position`): `number`

#### Parameters

• **val**: `boolean`

• **position**: `number`

#### Returns

`number`

***

### get()

> **get**(`index`): `boolean`

#### Parameters

• **index**: `number`

#### Returns

`boolean`

***

### insert()

> **insert**(`start`, `bitfield`): `void`

#### Parameters

• **start**: `number`

• **bitfield**: `Uint32Array`

#### Returns

`void`

***

### set()

> **set**(`index`, `val`): `void`

#### Parameters

• **index**: `number`

• **val**: `boolean`

#### Returns

`void`

***

### setRange()

> **setRange**(`start`, `length`, `val`): `void`

#### Parameters

• **start**: `number`

• **length**: `number`

• **val**: `boolean`

#### Returns

`void`
