[API](../README.md) / datatype

# Module: datatype

## Table of contents

### Classes

- [DataType](../classes/datatype.DataType.md)

### Interfaces

- [DataTypeEvents](../interfaces/datatype.DataTypeEvents.md)

### Type Aliases

- [GetMapeoDocTables](datatype.md#getmapeodoctables)
- [MapeoDocMap](datatype.md#mapeodocmap)
- [MapeoDocTableName](datatype.md#mapeodoctablename)
- [MapeoDocTables](datatype.md#mapeodoctables)
- [MapeoDocTablesMap](datatype.md#mapeodoctablesmap)
- [MapeoValueMap](datatype.md#mapeovaluemap)
- [OmitUnion](datatype.md#omitunion)

### Variables

- [kCreateWithDocId](datatype.md#kcreatewithdocid)
- [kSelect](datatype.md#kselect)
- [kTable](datatype.md#ktable)

## Type Aliases

### GetMapeoDocTables

Ƭ **GetMapeoDocTables**\<`T`\>: `T`[keyof `T` & [`MapeoDocTableName`](datatype.md#mapeodoctablename)]

#### Type parameters

| Name |
| :------ |
| `T` |

#### Defined in

[src/datatype/index.js:27](https://github.com/digidem/mapeo-core-next/blob/53dc843a45bb963f7a880f5f7973107d5b1fb99c/src/datatype/index.js#L27)

___

### MapeoDocMap

Ƭ **MapeoDocMap**: \{ [K in MapeoDoc["schemaName"]]: Extract\<MapeoDoc, Object\> }

#### Defined in

[src/types.ts:46](https://github.com/digidem/mapeo-core-next/blob/53dc843a45bb963f7a880f5f7973107d5b1fb99c/src/types.ts#L46)

___

### MapeoDocTableName

Ƭ **MapeoDocTableName**\<\>: \`$\{MapeoDoc["schemaName"]}Table\`

#### Defined in

[src/datatype/index.js:23](https://github.com/digidem/mapeo-core-next/blob/53dc843a45bb963f7a880f5f7973107d5b1fb99c/src/datatype/index.js#L23)

___

### MapeoDocTables

Ƭ **MapeoDocTables**\<\>: [`GetMapeoDocTables`](datatype.md#getmapeodoctables)\<[`schema/project`](schema_project.md)\> \| [`GetMapeoDocTables`](datatype.md#getmapeodoctables)\<[`schema/client`](schema_client.md)\>

#### Defined in

[src/datatype/index.js:31](https://github.com/digidem/mapeo-core-next/blob/53dc843a45bb963f7a880f5f7973107d5b1fb99c/src/datatype/index.js#L31)

___

### MapeoDocTablesMap

Ƭ **MapeoDocTablesMap**\<\>: \{ [K in MapeoDocTables["\_"]["name"]]: Extract\<MapeoDocTables, Object\> }

#### Defined in

[src/datatype/index.js:34](https://github.com/digidem/mapeo-core-next/blob/53dc843a45bb963f7a880f5f7973107d5b1fb99c/src/datatype/index.js#L34)

___

### MapeoValueMap

Ƭ **MapeoValueMap**: \{ [K in MapeoValue["schemaName"]]: Extract\<MapeoValue, Object\> }

#### Defined in

[src/types.ts:50](https://github.com/digidem/mapeo-core-next/blob/53dc843a45bb963f7a880f5f7973107d5b1fb99c/src/types.ts#L50)

___

### OmitUnion

Ƭ **OmitUnion**\<`T`, `K`\>: `T` extends `any` ? `Omit`\<`T`, `K`\> : `never`

#### Type parameters

| Name | Type |
| :------ | :------ |
| `T` | `T` |
| `K` | extends keyof `any` |

#### Defined in

[src/datatype/index.js:39](https://github.com/digidem/mapeo-core-next/blob/53dc843a45bb963f7a880f5f7973107d5b1fb99c/src/datatype/index.js#L39)

## Variables

### kCreateWithDocId

• `Const` **kCreateWithDocId**: typeof [`kCreateWithDocId`](datatype.md#kcreatewithdocid)

#### Defined in

[src/datatype/index.js:53](https://github.com/digidem/mapeo-core-next/blob/53dc843a45bb963f7a880f5f7973107d5b1fb99c/src/datatype/index.js#L53)

___

### kSelect

• `Const` **kSelect**: typeof [`kSelect`](datatype.md#kselect)

#### Defined in

[src/datatype/index.js:54](https://github.com/digidem/mapeo-core-next/blob/53dc843a45bb963f7a880f5f7973107d5b1fb99c/src/datatype/index.js#L54)

___

### kTable

• `Const` **kTable**: typeof [`kTable`](datatype.md#ktable)

#### Defined in

[src/datatype/index.js:55](https://github.com/digidem/mapeo-core-next/blob/53dc843a45bb963f7a880f5f7973107d5b1fb99c/src/datatype/index.js#L55)
