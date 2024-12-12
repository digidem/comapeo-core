[**API**](../../README.md) • **Docs**

***

[API](../../README.md) / [\<internal\>](../README.md) / default

# Class: default

## Constructors

### new default()

> **new default**(): [`default`](default.md)

#### Returns

[`default`](default.md)

## Properties

### \_maxSegments

> **\_maxSegments**: `number`

***

### \_pages

> **\_pages**: [`BigSparseArray`](BigSparseArray.md)\<[`RemoteBitfieldPage`](RemoteBitfieldPage.md)\>

***

### \_segments

> **\_segments**: [`BigSparseArray`](BigSparseArray.md)\<[`RemoteBitfieldSegment`](RemoteBitfieldSegment.md)\>

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

### firstSet()

> **firstSet**(`position`): `number`

#### Parameters

• **position**: `number`

#### Returns

`number`

***

### firstUnset()

> **firstUnset**(`position`): `number`

#### Parameters

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

### getBitfield()

> **getBitfield**(`index`): `null` \| [`RemoteBitfieldPage`](RemoteBitfieldPage.md)

#### Parameters

• **index**: `number`

#### Returns

`null` \| [`RemoteBitfieldPage`](RemoteBitfieldPage.md)

***

### insert()

> **insert**(`start`, `bitfield`): `boolean`

#### Parameters

• **start**: `number`

• **bitfield**: `Uint32Array`

#### Returns

`boolean`

***

### lastSet()

> **lastSet**(`position`): `number`

#### Parameters

• **position**: `number`

#### Returns

`number`

***

### lastUnset()

> **lastUnset**(`position`): `number`

#### Parameters

• **position**: `number`

#### Returns

`number`

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
