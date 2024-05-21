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

## Accessors

### [ktranslatedLanguageCodeToSchemaNames]

• `get` **[ktranslatedLanguageCodeToSchemaNames]**(): `Map`\<`string`, `Set`\<`SchemaName`\>\>

#### Returns

`Map`\<`string`, `Set`\<`SchemaName`\>\>

## Methods

### get

▸ **get**(`value`): `Promise`\<{}[]\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `value` | `Object` |

#### Returns

`Promise`\<{}[]\>

___

### index

▸ **index**(`doc`): `void`

#### Parameters

| Name | Type |
| :------ | :------ |
| `doc` | `Object` |

#### Returns

`void`

___

### put

▸ **put**(`value`): `Promise`\<{} & \{ `forks`: `string`[]  }\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `value` | `Object` |

#### Returns

`Promise`\<{} & \{ `forks`: `string`[]  }\>

___

### ready

▸ **ready**(): `Promise`\<`void`\>

#### Returns

`Promise`\<`void`\>
