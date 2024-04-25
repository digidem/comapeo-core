[API](../README.md) / config-import

# Module: config-import

## Table of contents

### Type Aliases

- [Entry](config_import.md#entry)
- [IconData](config_import.md#icondata)
- [PresetsFile](config_import.md#presetsfile)

### Functions

- [readConfig](config_import.md#readconfig)

## Type Aliases

### Entry

Ƭ **Entry**\<\>: `yauzl.Entry`

#### Defined in

[src/config-import.js:12](https://github.com/digidem/mapeo-core-next/blob/53dc843a45bb963f7a880f5f7973107d5b1fb99c/src/config-import.js#L12)

___

### IconData

Ƭ **IconData**\<\>: `Parameters`\<[`icon-api`](icon_api.md)[``"create"``]\>[``0``]

#### Defined in

[src/config-import.js:21](https://github.com/digidem/mapeo-core-next/blob/53dc843a45bb963f7a880f5f7973107d5b1fb99c/src/config-import.js#L21)

___

### PresetsFile

Ƭ **PresetsFile**\<\>: `Object`

#### Type declaration

| Name | Type |
| :------ | :------ |
| `fields` | \{ `[id: string]`: `unknown`;  } |
| `presets` | \{ `[id: string]`: `unknown`;  } |

#### Defined in

[src/config-import.js:18](https://github.com/digidem/mapeo-core-next/blob/53dc843a45bb963f7a880f5f7973107d5b1fb99c/src/config-import.js#L18)

## Functions

### readConfig

▸ **readConfig**(`configPath`): `Promise`\<\{ `warnings`:  ; `close`: () => `Promise`\<`void`\> ; `fields`: () => `Iterable`\<\{ `name`: `string` ; `value`: {}  }\> ; `icons`: () => `AsyncIterable`\<\{ `name`: `string` ; `variants`: [`BitmapOpts`](../interfaces/icon_api.BitmapOpts.md) \| [`SvgOpts`](../interfaces/icon_api.SvgOpts.md) & \{ `blob`: `Buffer`  }[]  }\> ; `presets`: () => `Iterable`\<\{ `fieldNames`: `string`[] ; `iconName`: `undefined` \| `string` ; `value`: {}  }\>  }\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `configPath` | `string` |

#### Returns

`Promise`\<\{ `warnings`:  ; `close`: () => `Promise`\<`void`\> ; `fields`: () => `Iterable`\<\{ `name`: `string` ; `value`: {}  }\> ; `icons`: () => `AsyncIterable`\<\{ `name`: `string` ; `variants`: [`BitmapOpts`](../interfaces/icon_api.BitmapOpts.md) \| [`SvgOpts`](../interfaces/icon_api.SvgOpts.md) & \{ `blob`: `Buffer`  }[]  }\> ; `presets`: () => `Iterable`\<\{ `fieldNames`: `string`[] ; `iconName`: `undefined` \| `string` ; `value`: {}  }\>  }\>

#### Defined in

[src/config-import.js:27](https://github.com/digidem/mapeo-core-next/blob/53dc843a45bb963f7a880f5f7973107d5b1fb99c/src/config-import.js#L27)
