[API](../README.md) / [\<internal\>](internal_.md) / "/home/szgy/src/dd/mapeo-core-next/src/datastore/index"

# Namespace: "/home/szgy/src/dd/mapeo-core-next/src/datastore/index"

[\<internal\>](internal_.md)."/home/szgy/src/dd/mapeo-core-next/src/datastore/index"

## Table of contents

### References

- [DataStore](internal_.__home_szgy_src_dd_mapeo_core_next_src_datastore_index_.md#datastore)
- [NamespaceSchemas](internal_.__home_szgy_src_dd_mapeo_core_next_src_datastore_index_.md#namespaceschemas)

### Type Aliases

- [DataStoreEvents](internal_.__home_szgy_src_dd_mapeo_core_next_src_datastore_index_.md#datastoreevents)
- [MapeoDocTablesMap](internal_.__home_szgy_src_dd_mapeo_core_next_src_datastore_index_.md#mapeodoctablesmap)
- [OmitUnion](internal_.__home_szgy_src_dd_mapeo_core_next_src_datastore_index_.md#omitunion)

## References

### DataStore

Re-exports [DataStore](../classes/internal_.DataStore.md)

___

### NamespaceSchemas

Re-exports [NamespaceSchemas](internal_.md#namespaceschemas)

## Type Aliases

### DataStoreEvents

Ƭ **DataStoreEvents**\<`TSchemaName`\>: \{ [S in Exclude\<TSchemaName, "projectSettings"\>]: Function }

#### Type parameters

| Name | Type |
| :------ | :------ |
| `TSchemaName` | extends `MapeoDoc`[``"schemaName"``] |

#### Defined in

[src/datastore/index.js:22](https://github.com/digidem/mapeo-core-next/blob/315dc9781d8d2f74f17b1fd651a3ae81272b7fac/src/datastore/index.js#L22)

___

### MapeoDocTablesMap

Ƭ **MapeoDocTablesMap**: \{ [K in MapeoDocTables["\_"]["name"]]: Extract\<MapeoDocTables, Object\> }

#### Defined in

[src/datatype/index.d.ts:24](https://github.com/digidem/mapeo-core-next/blob/315dc9781d8d2f74f17b1fd651a3ae81272b7fac/src/datatype/index.d.ts#L24)

___

### OmitUnion

Ƭ **OmitUnion**\<`T`, `K`\>: `T` extends `any` ? `Omit`\<`T`, `K`\> : `never`

#### Type parameters

| Name | Type |
| :------ | :------ |
| `T` | `T` |
| `K` | extends keyof `any` |

#### Defined in

[src/datastore/index.js:27](https://github.com/digidem/mapeo-core-next/blob/315dc9781d8d2f74f17b1fd651a3ae81272b7fac/src/datastore/index.js#L27)
