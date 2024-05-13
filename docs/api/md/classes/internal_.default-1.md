[API](../README.md) / [\<internal\>](../modules/internal_.md) / default

# Class: default\<K, V\>

[\<internal\>](../modules/internal_.md).default

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

- [constructor](internal_.default-1.md#constructor)

### Accessors

- [size](internal_.default-1.md#size)

### Methods

- [delete](internal_.default-1.md#delete)
- [get](internal_.default-1.md#get)
- [has](internal_.default-1.md#has)
- [set](internal_.default-1.md#set)
- [values](internal_.default-1.md#values)

## Constructors

### constructor

• **new default**\<`K`, `V`\>(`hash`, `iterable?`): [`default`](internal_.default-1.md)\<`K`, `V`\>

#### Type parameters

| Name | Type |
| :------ | :------ |
| `K` | `K` |
| `V` | extends `unknown` |

#### Parameters

| Name | Type | Default value |
| :------ | :------ | :------ |
| `hash` | (`key`: `K`) => [`Primitive`](../modules/internal_.md#primitive) | `undefined` |
| `iterable?` | `Iterable`\<[`K`, `V`]\> | `[]` |

#### Returns

[`default`](internal_.default-1.md)\<`K`, `V`\>

## Accessors

### size

• `get` **size**(): `number`

#### Returns

`number`

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

___

### set

▸ **set**(`key`, `value`): [`default`](internal_.default-1.md)\<`K`, `V`\>

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `key` | `K` | The key to update. |
| `value` | `V` | The value to add at `key`. |

#### Returns

[`default`](internal_.default-1.md)\<`K`, `V`\>

The map.

___

### values

▸ **values**(): `IterableIterator`\<`V`\>

#### Returns

`IterableIterator`\<`V`\>
