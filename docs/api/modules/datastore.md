[API](../README.md) / datastore

# Module: datastore

## Table of contents

### Classes

- [DataStore](../classes/datastore.DataStore.md)

### Type Aliases

- [DataStoreEvents](datastore.md#datastoreevents)
- [MapeoDocTablesMap](datastore.md#mapeodoctablesmap)
- [NamespaceSchemas](datastore.md#namespaceschemas)
- [OmitUnion](datastore.md#omitunion)

## Type Aliases

### DataStoreEvents

Ƭ **DataStoreEvents**\<`TSchemaName`\>: \{ [S in Exclude\<TSchemaName, "projectSettings"\>]: Function }

#### Type parameters

| Name | Type |
| :------ | :------ |
| `TSchemaName` | extends `MapeoDoc`[``"schemaName"``] |

#### Defined in

[src/datastore/index.js:22](https://github.com/digidem/mapeo-core-next/blob/53dc843a45bb963f7a880f5f7973107d5b1fb99c/src/datastore/index.js#L22)

___

### MapeoDocTablesMap

Ƭ **MapeoDocTablesMap**: \{ [K in MapeoDocTables["\_"]["name"]]: Extract\<MapeoDocTables, Object\> }

#### Defined in

[src/datatype/index.d.ts:23](https://github.com/digidem/mapeo-core-next/blob/53dc843a45bb963f7a880f5f7973107d5b1fb99c/src/datatype/index.d.ts#L23)

___

### NamespaceSchemas

Ƭ **NamespaceSchemas**\<\>: typeof `NAMESPACE_SCHEMAS`

#### Defined in

[src/datastore/index.js:44](https://github.com/digidem/mapeo-core-next/blob/53dc843a45bb963f7a880f5f7973107d5b1fb99c/src/datastore/index.js#L44)

___

### OmitUnion

Ƭ **OmitUnion**\<`T`, `K`\>: `T` extends `any` ? `Omit`\<`T`, `K`\> : `never`

#### Type parameters

| Name | Type |
| :------ | :------ |
| `T` | `T` |
| `K` | extends keyof `any` |

#### Defined in

[src/datastore/index.js:27](https://github.com/digidem/mapeo-core-next/blob/53dc843a45bb963f7a880f5f7973107d5b1fb99c/src/datastore/index.js#L27)
