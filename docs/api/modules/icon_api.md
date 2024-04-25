[API](../README.md) / icon-api

# Module: icon-api

## Table of contents

### Classes

- [IconApi](../classes/icon_api.IconApi.md)

### Interfaces

- [BitmapOpts](../interfaces/icon_api.BitmapOpts.md)
- [SvgOpts](../interfaces/icon_api.SvgOpts.md)

### Type Aliases

- [IconVariant](icon_api.md#iconvariant)
- [IconVariants](icon_api.md#iconvariants)

### Variables

- [kGetIconBlob](icon_api.md#kgeticonblob)

### Functions

- [constructIconPath](icon_api.md#constructiconpath)
- [getBestVariant](icon_api.md#getbestvariant)

## Type Aliases

### IconVariant

Ƭ **IconVariant**\<\>: `any`[][`number`]

#### Defined in

[src/icon-api.js:4](https://github.com/digidem/mapeo-core-next/blob/53dc843a45bb963f7a880f5f7973107d5b1fb99c/src/icon-api.js#L4)

___

### IconVariants

Ƭ **IconVariants**\<\>: `IconValue`[``"variants"``]

#### Defined in

[src/icon-api.js:3](https://github.com/digidem/mapeo-core-next/blob/53dc843a45bb963f7a880f5f7973107d5b1fb99c/src/icon-api.js#L3)

## Variables

### kGetIconBlob

• `Const` **kGetIconBlob**: typeof [`kGetIconBlob`](icon_api.md#kgeticonblob)

#### Defined in

[src/icon-api.js:1](https://github.com/digidem/mapeo-core-next/blob/53dc843a45bb963f7a880f5f7973107d5b1fb99c/src/icon-api.js#L1)

## Functions

### constructIconPath

▸ **constructIconPath**(`opts`): `string`

General purpose path builder for an icon

#### Parameters

| Name | Type |
| :------ | :------ |
| `opts` | `Object` |
| `opts.extension` | `string` |
| `opts.iconId` | `string` |
| `opts.pixelDensity` | `undefined` \| `number` |
| `opts.size` | `string` |

#### Returns

`string`

#### Defined in

[src/icon-api.js:258](https://github.com/digidem/mapeo-core-next/blob/53dc843a45bb963f7a880f5f7973107d5b1fb99c/src/icon-api.js#L258)

___

### getBestVariant

▸ **getBestVariant**(`variants`, `opts`): {} \| {}

Given a list of icon variants returns the variant that most closely matches the desired parameters.
Rules, in order of precedence:

1. Matching mime type (throw if no matches)
2. Matching size. If no exact match:
    1. If smaller ones exist, prefer closest smaller size.
    2. Otherwise prefer closest larger size.
3. Matching pixel density (when asking for PNGs). If no exact match:
    1. If smaller ones exist, prefer closest smaller density.
    2. Otherwise prefer closest larger density.

#### Parameters

| Name | Type |
| :------ | :------ |
| `variants` | ({} \| {})[] |
| `opts` | [`BitmapOpts`](../interfaces/icon_api.BitmapOpts.md) \| [`SvgOpts`](../interfaces/icon_api.SvgOpts.md) |

#### Returns

{} \| {}

#### Defined in

[src/icon-api.js:146](https://github.com/digidem/mapeo-core-next/blob/53dc843a45bb963f7a880f5f7973107d5b1fb99c/src/icon-api.js#L146)
