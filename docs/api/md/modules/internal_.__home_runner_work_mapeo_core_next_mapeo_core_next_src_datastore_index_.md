[API](../README.md) / [\<internal\>](internal_.md) / "/home/runner/work/mapeo-core-next/mapeo-core-next/src/datastore/index"

# Namespace: "/home/runner/work/mapeo-core-next/mapeo-core-next/src/datastore/index"

[\<internal\>](internal_.md)."/home/runner/work/mapeo-core-next/mapeo-core-next/src/datastore/index"

## Table of contents

### References

- [DataStore](internal_.__home_runner_work_mapeo_core_next_mapeo_core_next_src_datastore_index_.md#datastore)
- [NamespaceSchemas](internal_.__home_runner_work_mapeo_core_next_mapeo_core_next_src_datastore_index_.md#namespaceschemas)

### Type Aliases

- [DataStoreEvents](internal_.__home_runner_work_mapeo_core_next_mapeo_core_next_src_datastore_index_.md#datastoreevents)
- [MapeoDocTablesMap](internal_.__home_runner_work_mapeo_core_next_mapeo_core_next_src_datastore_index_.md#mapeodoctablesmap)
- [OmitUnion](internal_.__home_runner_work_mapeo_core_next_mapeo_core_next_src_datastore_index_.md#omitunion)

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

___

### MapeoDocTablesMap

Ƭ **MapeoDocTablesMap**: \{ [K in MapeoDocTables["\_"]["name"]]: Extract\<MapeoDocTables, Object\> }

___

### OmitUnion

Ƭ **OmitUnion**\<`T`, `K`\>: `T` extends `any` ? `Omit`\<`T`, `K`\> : `never`

#### Type parameters

| Name | Type |
| :------ | :------ |
| `T` | `T` |
| `K` | extends keyof `any` |
