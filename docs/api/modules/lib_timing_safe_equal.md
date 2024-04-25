[API](../README.md) / lib/timing-safe-equal

# Module: lib/timing-safe-equal

## Table of contents

### Functions

- [default](lib_timing_safe_equal.md#default)

## Functions

### default

▸ **default**\<`T`\>(`a`, `b`): `boolean`

Compare two values in constant time.

Useful when you want to avoid leaking data.

Like `crypto.timingSafeEqual`, but works with strings and doesn't throw if
lengths differ.

#### Type parameters

| Name | Type |
| :------ | :------ |
| `T` | extends `string` \| `ArrayBufferView` |

#### Parameters

| Name | Type |
| :------ | :------ |
| `a` | `T` |
| `b` | `T` |

#### Returns

`boolean`

#### Defined in

[src/lib/timing-safe-equal.js:28](https://github.com/digidem/mapeo-core-next/blob/53dc843a45bb963f7a880f5f7973107d5b1fb99c/src/lib/timing-safe-equal.js#L28)
