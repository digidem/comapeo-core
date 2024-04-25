[API](../README.md) / datatype

# Module: datatype

## Table of contents

### References

- [MapeoDocTables](datatype-1.md#mapeodoctables)
- [MapeoDocTablesMap](datatype-1.md#mapeodoctablesmap)

### Classes

- [DataType](../classes/datatype-1.DataType.md)

### Interfaces

- [DataTypeEvents](../interfaces/datatype-1.DataTypeEvents.md)

### Type Aliases

- [ExcludeSchema](datatype-1.md#excludeschema)
- [GetMapeoDocTables](datatype-1.md#getmapeodoctables)
- [MapeoDocTableName](datatype-1.md#mapeodoctablename)
- [OmitUnion](datatype-1.md#omitunion)

### Variables

- [kCreateWithDocId](datatype-1.md#kcreatewithdocid)
- [kSelect](datatype-1.md#kselect)
- [kTable](datatype-1.md#ktable)

## References

### MapeoDocTables

Re-exports [MapeoDocTables](index_writer.md#mapeodoctables)

___

### MapeoDocTablesMap

Re-exports [MapeoDocTablesMap](datastore.md#mapeodoctablesmap)

## Type Aliases

### ExcludeSchema

Ƭ **ExcludeSchema**\<`T`, `S`\>: `Exclude`\<`T`, \{ `schemaName`: `S`  }\>

#### Type parameters

| Name | Type |
| :------ | :------ |
| `T` | extends `MapeoValue` |
| `S` | extends `MapeoValue`[``"schemaName"``] |

#### Defined in

[src/datatype/index.d.ts:38](https://github.com/digidem/mapeo-core-next/blob/53dc843a45bb963f7a880f5f7973107d5b1fb99c/src/datatype/index.d.ts#L38)

___

### GetMapeoDocTables

Ƭ **GetMapeoDocTables**\<`T`\>: `T`[keyof `T` & [`MapeoDocTableName`](datatype-1.md#mapeodoctablename)]

#### Type parameters

| Name |
| :------ |
| `T` |

#### Defined in

[src/datatype/index.d.ts:18](https://github.com/digidem/mapeo-core-next/blob/53dc843a45bb963f7a880f5f7973107d5b1fb99c/src/datatype/index.d.ts#L18)

___

### MapeoDocTableName

Ƭ **MapeoDocTableName**: \`$\{MapeoDoc["schemaName"]}Table\`

#### Defined in

[src/datatype/index.d.ts:17](https://github.com/digidem/mapeo-core-next/blob/53dc843a45bb963f7a880f5f7973107d5b1fb99c/src/datatype/index.d.ts#L17)

___

### OmitUnion

Ƭ **OmitUnion**\<`T`, `K`\>: `T` extends `any` ? `Omit`\<`T`, `K`\> : `never`

#### Type parameters

| Name | Type |
| :------ | :------ |
| `T` | `T` |
| `K` | extends keyof `any` |

#### Defined in

[src/datatype/index.d.ts:37](https://github.com/digidem/mapeo-core-next/blob/53dc843a45bb963f7a880f5f7973107d5b1fb99c/src/datatype/index.d.ts#L37)

## Variables

### kCreateWithDocId

• `Const` **kCreateWithDocId**: unique `symbol`

#### Defined in

[src/datatype/index.d.ts:33](https://github.com/digidem/mapeo-core-next/blob/53dc843a45bb963f7a880f5f7973107d5b1fb99c/src/datatype/index.d.ts#L33)

___

### kSelect

• `Const` **kSelect**: unique `symbol`

#### Defined in

[src/datatype/index.d.ts:34](https://github.com/digidem/mapeo-core-next/blob/53dc843a45bb963f7a880f5f7973107d5b1fb99c/src/datatype/index.d.ts#L34)

___

### kTable

• `Const` **kTable**: unique `symbol`

#### Defined in

[src/datatype/index.d.ts:35](https://github.com/digidem/mapeo-core-next/blob/53dc843a45bb963f7a880f5f7973107d5b1fb99c/src/datatype/index.d.ts#L35)
