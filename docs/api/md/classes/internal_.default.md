[API](../README.md) / [\<internal\>](../modules/internal_.md) / default

# Class: default

[\<internal\>](../modules/internal_.md).default

## Table of contents

### Constructors

- [constructor](internal_.default.md#constructor)

### Accessors

- [[ktranslatedLanguageCodeToSchemaNames]](internal_.default.md#[ktranslatedlanguagecodetoschemanames])

### Methods

- [get](internal_.default.md#get)
- [index](internal_.default.md#index)
- [put](internal_.default.md#put)
- [ready](internal_.default.md#ready)

## Constructors

### constructor

• **new default**(`opts`): [`default`](internal_.default.md)

#### Parameters

| Name | Type |
| :------ | :------ |
| `opts` | `Object` |
| `opts.dataType` | [`DataType`](internal_.DataType.md)\<[`DataStore`](internal_.DataStore.md)\<``"config"``, ``"translation"`` \| ``"projectSettings"`` \| ``"preset"`` \| ``"icon"`` \| ``"field"`` \| ``"deviceInfo"``\>, `SQLiteTableWithColumns`\<{}\>, ``"translation"``, {}, {}\> |
| `opts.table` | `SQLiteTableWithColumns`\<{}\> |

#### Returns

[`default`](internal_.default.md)

#### Defined in

[src/translation-api.js:29](https://github.com/digidem/mapeo-core-next/blob/315dc9781d8d2f74f17b1fd651a3ae81272b7fac/src/translation-api.js#L29)

## Accessors

### [ktranslatedLanguageCodeToSchemaNames]

• `get` **[ktranslatedLanguageCodeToSchemaNames]**(): `Map`\<`string`, `Set`\<`SchemaName`\>\>

#### Returns

`Map`\<`string`, `Set`\<`SchemaName`\>\>

#### Defined in

[src/translation-api.js:126](https://github.com/digidem/mapeo-core-next/blob/315dc9781d8d2f74f17b1fd651a3ae81272b7fac/src/translation-api.js#L126)

## Methods

### get

▸ **get**(`value`): `Promise`\<{}[]\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `value` | `Object` |

#### Returns

`Promise`\<{}[]\>

#### Defined in

[src/translation-api.js:72](https://github.com/digidem/mapeo-core-next/blob/315dc9781d8d2f74f17b1fd651a3ae81272b7fac/src/translation-api.js#L72)

___

### index

▸ **index**(`doc`): `void`

#### Parameters

| Name | Type |
| :------ | :------ |
| `doc` | `Object` |

#### Returns

`void`

#### Defined in

[src/translation-api.js:107](https://github.com/digidem/mapeo-core-next/blob/315dc9781d8d2f74f17b1fd651a3ae81272b7fac/src/translation-api.js#L107)

___

### put

▸ **put**(`value`): `Promise`\<{} & \{ `forks`: `string`[]  }\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `value` | `Object` |

#### Returns

`Promise`\<{} & \{ `forks`: `string`[]  }\>

#### Defined in

[src/translation-api.js:50](https://github.com/digidem/mapeo-core-next/blob/315dc9781d8d2f74f17b1fd651a3ae81272b7fac/src/translation-api.js#L50)

___

### ready

▸ **ready**(): `Promise`\<`void`\>

#### Returns

`Promise`\<`void`\>

#### Defined in

[src/translation-api.js:43](https://github.com/digidem/mapeo-core-next/blob/315dc9781d8d2f74f17b1fd651a3ae81272b7fac/src/translation-api.js#L43)
