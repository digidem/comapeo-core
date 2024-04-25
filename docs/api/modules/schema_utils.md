[API](../README.md) / schema/utils

# Module: schema/utils

## Table of contents

### Type Aliases

- [SqliteTable](schema_utils.md#sqlitetable)

### Variables

- [BACKLINK\_TABLE\_POSTFIX](schema_utils.md#backlink_table_postfix)

### Functions

- [backlinkTable](schema_utils.md#backlinktable)
- [customJson](schema_utils.md#customjson)
- [getBacklinkTableName](schema_utils.md#getbacklinktablename)

## Type Aliases

### SqliteTable

Ƭ **SqliteTable**\<`TName`\>: `SQLiteTableWithColumns`

#### Type parameters

| Name | Type |
| :------ | :------ |
| `TName` | extends `string` = `string` |

#### Defined in

[src/schema/utils.js:15](https://github.com/digidem/mapeo-core-next/blob/53dc843a45bb963f7a880f5f7973107d5b1fb99c/src/schema/utils.js#L15)

## Variables

### BACKLINK\_TABLE\_POSTFIX

• `Const` **BACKLINK\_TABLE\_POSTFIX**: ``"_backlink"``

**`Template`**

#### Defined in

[src/schema/utils.js:18](https://github.com/digidem/mapeo-core-next/blob/53dc843a45bb963f7a880f5f7973107d5b1fb99c/src/schema/utils.js#L18)

## Functions

### backlinkTable

▸ **backlinkTable**(`tableSchema`): `SQLiteTableWithColumns`\<{}\>

Table for storing backlinks, used for indexing. There needs to be one for
each indexed document type

#### Parameters

| Name | Type |
| :------ | :------ |
| `tableSchema` | [`SqliteTable`](schema_utils.md#sqlitetable)\<`string`\> |

#### Returns

`SQLiteTableWithColumns`\<{}\>

#### Defined in

[src/schema/utils.js:25](https://github.com/digidem/mapeo-core-next/blob/53dc843a45bb963f7a880f5f7973107d5b1fb99c/src/schema/utils.js#L25)

___

### customJson

▸ **customJson**\<`TName`\>(`dbName`, `fieldConfig?`): `SQLiteCustomColumnBuilder`\<{}\>

#### Type parameters

| Name | Type |
| :------ | :------ |
| `TName` | extends `string` |

#### Parameters

| Name | Type |
| :------ | :------ |
| `dbName` | `TName` |
| `fieldConfig?` | `unknown` |

#### Returns

`SQLiteCustomColumnBuilder`\<{}\>

#### Defined in

[src/schema/utils.js:39](https://github.com/digidem/mapeo-core-next/blob/53dc843a45bb963f7a880f5f7973107d5b1fb99c/src/schema/utils.js#L39)

___

### getBacklinkTableName

▸ **getBacklinkTableName**(`tableName`): `string`

#### Parameters

| Name | Type |
| :------ | :------ |
| `tableName` | `string` |

#### Returns

`string`

#### Defined in

[src/schema/utils.js:35](https://github.com/digidem/mapeo-core-next/blob/53dc843a45bb963f7a880f5f7973107d5b1fb99c/src/schema/utils.js#L35)
