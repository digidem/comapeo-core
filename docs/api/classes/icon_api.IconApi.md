[API](../README.md) / [icon-api](../modules/icon_api.md) / IconApi

# Class: IconApi

[icon-api](../modules/icon_api.md).IconApi

## Table of contents

### Constructors

- [constructor](icon_api.IconApi.md#constructor)

### Methods

- [[kGetIconBlob]](icon_api.IconApi.md#[kgeticonblob])
- [create](icon_api.IconApi.md#create)
- [getIconUrl](icon_api.IconApi.md#geticonurl)

## Constructors

### constructor

• **new IconApi**(`opts`): [`IconApi`](icon_api.IconApi.md)

#### Parameters

| Name | Type |
| :------ | :------ |
| `opts` | `Object` |
| `opts.getMediaBaseUrl` | () => `Promise`\<`string`\> |
| `opts.iconDataStore` | [`DataStore`](datastore.DataStore.md)\<``"config"``, ``"translation"`` \| ``"projectSettings"`` \| ``"preset"`` \| ``"icon"`` \| ``"field"`` \| ``"deviceInfo"``\> |
| `opts.iconDataType` | [`DataType`](datatype-1.DataType.md)\<[`DataStore`](datastore.DataStore.md)\<``"config"``, ``"translation"`` \| ``"projectSettings"`` \| ``"preset"`` \| ``"icon"`` \| ``"field"`` \| ``"deviceInfo"``\>, `SQLiteTableWithColumns`\<{}\>, ``"icon"``, {}, {}\> |

#### Returns

[`IconApi`](icon_api.IconApi.md)

#### Defined in

[src/icon-api.js:40](https://github.com/digidem/mapeo-core-next/blob/53dc843a45bb963f7a880f5f7973107d5b1fb99c/src/icon-api.js#L40)

## Methods

### [kGetIconBlob]

▸ **[kGetIconBlob]**(`iconId`, `opts`): `Promise`\<`Buffer`\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `iconId` | `string` |
| `opts` | [`BitmapOpts`](../interfaces/icon_api.BitmapOpts.md) \| [`SvgOpts`](../interfaces/icon_api.SvgOpts.md) |

#### Returns

`Promise`\<`Buffer`\>

#### Defined in

[src/icon-api.js:80](https://github.com/digidem/mapeo-core-next/blob/53dc843a45bb963f7a880f5f7973107d5b1fb99c/src/icon-api.js#L80)

___

### create

▸ **create**(`icon`): `Promise`\<`string`\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `icon` | `Object` |
| `icon.name` | `string` |
| `icon.variants` | [`BitmapOpts`](../interfaces/icon_api.BitmapOpts.md) \| [`SvgOpts`](../interfaces/icon_api.SvgOpts.md) & \{ `blob`: `Buffer`  }[] |

#### Returns

`Promise`\<`string`\>

#### Defined in

[src/icon-api.js:53](https://github.com/digidem/mapeo-core-next/blob/53dc843a45bb963f7a880f5f7973107d5b1fb99c/src/icon-api.js#L53)

___

### getIconUrl

▸ **getIconUrl**(`iconId`, `opts`): `Promise`\<`string`\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `iconId` | `string` |
| `opts` | [`BitmapOpts`](../interfaces/icon_api.BitmapOpts.md) \| [`SvgOpts`](../interfaces/icon_api.SvgOpts.md) |

#### Returns

`Promise`\<`string`\>

#### Defined in

[src/icon-api.js:93](https://github.com/digidem/mapeo-core-next/blob/53dc843a45bb963f7a880f5f7973107d5b1fb99c/src/icon-api.js#L93)
