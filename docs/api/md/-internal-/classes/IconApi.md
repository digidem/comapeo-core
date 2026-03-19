[**API**](../../README.md) • **Docs**

***

[API](../../README.md) / [\<internal\>](../README.md) / IconApi

# Class: IconApi

## Constructors

### new IconApi()

> **new IconApi**(`opts`): [`IconApi`](IconApi.md)

#### Parameters

• **opts**

• **opts.getMediaBaseUrl**

• **opts.iconDataStore**: [`DataStore`](DataStore.md)\<`"config"`, `"translation"` \| `"projectSettings"` \| `"preset"` \| `"icon"` \| `"field"` \| `"deviceInfo"`\>

• **opts.iconDataType**: [`DataType`](DataType.md)\<[`DataStore`](DataStore.md)\<`"config"`, `"translation"` \| `"projectSettings"` \| `"preset"` \| `"icon"` \| `"field"` \| `"deviceInfo"`\>, [`JsonSchemaToDrizzleSqliteTable`](../type-aliases/JsonSchemaToDrizzleSqliteTable.md)\<`object`, `object`, `"icon"`, [`AdditionalColumns`](../type-aliases/AdditionalColumns.md), `"docId"`\>, `"icon"`, `object`, `object`\>

#### Returns

[`IconApi`](IconApi.md)

## Methods

### \[kGetIconBlob\]()

> **\[kGetIconBlob\]**(`iconId`, `opts`): `Promise`\<`Buffer`\>

#### Parameters

• **iconId**: `string`

• **opts**: [`BitmapOpts`](../../namespaces/IconApi/interfaces/BitmapOpts.md) \| [`SvgOpts`](../../namespaces/IconApi/interfaces/SvgOpts.md)

#### Returns

`Promise`\<`Buffer`\>

***

### create()

> **create**(`icon`): `Promise`\<`object`\>

#### Parameters

• **icon**

• **icon.name**: `string`

• **icon.variants**: [`BitmapOpts`](../../namespaces/IconApi/interfaces/BitmapOpts.md) \| [`SvgOpts`](../../namespaces/IconApi/interfaces/SvgOpts.md) & `object`[]

#### Returns

`Promise`\<`object`\>

***

### getIconUrl()

> **getIconUrl**(`iconId`, `opts`): `Promise`\<`string`\>

#### Parameters

• **iconId**: `string`

• **opts**: [`BitmapOpts`](../../namespaces/IconApi/interfaces/BitmapOpts.md) \| [`SvgOpts`](../../namespaces/IconApi/interfaces/SvgOpts.md)

#### Returns

`Promise`\<`string`\>
