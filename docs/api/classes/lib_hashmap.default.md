[API](../README.md) / [lib/hashmap](../modules/lib_hashmap.md) / default

# Class: default\<K, V\>

[lib/hashmap](../modules/lib_hashmap.md).default

`Map` uses same-value-zero equality for keys, which makes it more difficult
to use reference types like buffers.

`HashMap` is very similar to `Map`, but accepts a hash function for keys.
This function should return a primitive, such as a number or string, which
will be used as the key.

It doesn't contain all the functionality of `Map` because we don't need it,
but it should be fairly easy to update as needed.

**`Example`**

```ts
const join = (arr) => arr.join(' ')

const map = new HashMap(join)

map.set([1, 2], 3)
map.get([1, 2])
// => 3
```

## Type parameters

| Name |
| :------ |
| `K` |
| `V` |

## Table of contents

### Constructors

- [constructor](lib_hashmap.default.md#constructor)

### Accessors

- [size](lib_hashmap.default.md#size)

### Methods

- [delete](lib_hashmap.default.md#delete)
- [get](lib_hashmap.default.md#get)
- [has](lib_hashmap.default.md#has)
- [set](lib_hashmap.default.md#set)
- [values](lib_hashmap.default.md#values)

## Constructors

### constructor

• **new default**\<`K`, `V`\>(`hash`, `iterable?`): [`default`](lib_hashmap.default.md)\<`K`, `V`\>

#### Type parameters

| Name | Type |
| :------ | :------ |
| `K` | `K` |
| `V` | extends `unknown` |

#### Parameters

| Name | Type | Default value |
| :------ | :------ | :------ |
| `hash` | (`key`: `K`) => [`Primitive`](../modules/lib_hashmap.md#primitive) | `undefined` |
| `iterable?` | `Iterable`\<[`K`, `V`]\> | `[]` |

#### Returns

[`default`](lib_hashmap.default.md)\<`K`, `V`\>

#### Defined in

[src/lib/hashmap.js:37](https://github.com/digidem/mapeo-core-next/blob/53dc843a45bb963f7a880f5f7973107d5b1fb99c/src/lib/hashmap.js#L37)

## Accessors

### size

• `get` **size**(): `number`

#### Returns

`number`

#### Defined in

[src/lib/hashmap.js:45](https://github.com/digidem/mapeo-core-next/blob/53dc843a45bb963f7a880f5f7973107d5b1fb99c/src/lib/hashmap.js#L45)

## Methods

### delete

▸ **delete**(`key`): `boolean`

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `key` | `K` | The key to remove. |

#### Returns

`boolean`

`true` if the key was present and removed, `false` otherwise.

#### Defined in

[src/lib/hashmap.js:53](https://github.com/digidem/mapeo-core-next/blob/53dc843a45bb963f7a880f5f7973107d5b1fb99c/src/lib/hashmap.js#L53)

___

### get

▸ **get**(`key`): `undefined` \| `V`

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `key` | `K` | The key to look up. |

#### Returns

`undefined` \| `V`

The element associated with `key`, or `undefined` if it's not present.

#### Defined in

[src/lib/hashmap.js:62](https://github.com/digidem/mapeo-core-next/blob/53dc843a45bb963f7a880f5f7973107d5b1fb99c/src/lib/hashmap.js#L62)

___

### has

▸ **has**(`key`): `boolean`

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `key` | `K` | The key to look up. |

#### Returns

`boolean`

`true` if `key` is present in the map, `false` otherwise.

#### Defined in

[src/lib/hashmap.js:71](https://github.com/digidem/mapeo-core-next/blob/53dc843a45bb963f7a880f5f7973107d5b1fb99c/src/lib/hashmap.js#L71)

___

### set

▸ **set**(`key`, `value`): [`default`](lib_hashmap.default.md)\<`K`, `V`\>

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `key` | `K` | The key to update. |
| `value` | `V` | The value to add at `key`. |

#### Returns

[`default`](lib_hashmap.default.md)\<`K`, `V`\>

The map.

#### Defined in

[src/lib/hashmap.js:81](https://github.com/digidem/mapeo-core-next/blob/53dc843a45bb963f7a880f5f7973107d5b1fb99c/src/lib/hashmap.js#L81)

___

### values

▸ **values**(): `IterableIterator`\<`V`\>

#### Returns

`IterableIterator`\<`V`\>

#### Defined in

[src/lib/hashmap.js:90](https://github.com/digidem/mapeo-core-next/blob/53dc843a45bb963f7a880f5f7973107d5b1fb99c/src/lib/hashmap.js#L90)
