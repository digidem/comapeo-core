[API](../README.md) / [datatype](../modules/datatype-1.md) / DataType

# Class: DataType\<TDataStore, TTable, TSchemaName, TDoc, TValue\>

[datatype](../modules/datatype-1.md).DataType

## Type parameters

| Name | Type |
| :------ | :------ |
| `TDataStore` | extends [`datastore`](../modules/datastore.md) |
| `TTable` | extends [`MapeoDocTables`](../modules/index_writer.md#mapeodoctables) |
| `TSchemaName` | extends `TTable`[``"_"``][``"name"``] |
| `TDoc` | extends [`MapeoDocMap`](../modules/datatype.md#mapeodocmap)[`TSchemaName`] |
| `TValue` | extends [`MapeoValueMap`](../modules/datatype.md#mapeovaluemap)[`TSchemaName`] |

## Hierarchy

- `TypedEmitter`\<[`DataTypeEvents`](../interfaces/datatype-1.DataTypeEvents.md)\<`TDoc`\>\>

  ↳ **`DataType`**

## Table of contents

### Constructors

- [constructor](datatype-1.DataType.md#constructor)

### Accessors

- [[kTable]](datatype-1.DataType.md#[ktable])
- [writerCore](datatype-1.DataType.md#writercore)

### Methods

- [[kCreateWithDocId]](datatype-1.DataType.md#[kcreatewithdocid])
- [[kSelect]](datatype-1.DataType.md#[kselect])
- [create](datatype-1.DataType.md#create)
- [delete](datatype-1.DataType.md#delete)
- [getByDocId](datatype-1.DataType.md#getbydocid)
- [getByVersionId](datatype-1.DataType.md#getbyversionid)
- [getMany](datatype-1.DataType.md#getmany)
- [update](datatype-1.DataType.md#update)

## Constructors

### constructor

• **new DataType**\<`TDataStore`, `TTable`, `TSchemaName`, `TDoc`, `TValue`\>(`«destructured»`): [`DataType`](datatype-1.DataType.md)\<`TDataStore`, `TTable`, `TSchemaName`, `TDoc`, `TValue`\>

#### Type parameters

| Name | Type |
| :------ | :------ |
| `TDataStore` | extends [`DataStore`](datastore.DataStore.md)\<``"auth"`` \| ``"config"`` \| ``"data"``, ``"translation"`` \| ``"track"`` \| ``"role"`` \| ``"projectSettings"`` \| ``"preset"`` \| ``"observation"`` \| ``"icon"`` \| ``"field"`` \| ``"deviceInfo"`` \| ``"coreOwnership"``\> |
| `TTable` | extends [`MapeoDocTables`](../modules/index_writer.md#mapeodoctables) |
| `TSchemaName` | extends ``"translation"`` \| ``"track"`` \| ``"role"`` \| ``"projectSettings"`` \| ``"preset"`` \| ``"observation"`` \| ``"icon"`` \| ``"field"`` \| ``"deviceInfo"`` \| ``"coreOwnership"`` |
| `TDoc` | extends \{ `schemaName`: `TSchemaName`  } & {} \| \{ `schemaName`: `TSchemaName`  } & {} \| \{ `schemaName`: `TSchemaName`  } & {} \| \{ `schemaName`: `TSchemaName`  } & {} \| \{ `schemaName`: `TSchemaName`  } & {} \| \{ `schemaName`: `TSchemaName`  } & {} \| \{ `schemaName`: `TSchemaName`  } & {} \| \{ `schemaName`: `TSchemaName`  } & {} \| \{ `schemaName`: `TSchemaName`  } & {} \| \{ `schemaName`: `TSchemaName`  } & {} |
| `TValue` | extends \{ `schemaName`: `TSchemaName`  } & {} \| \{ `schemaName`: `TSchemaName`  } & {} \| \{ `schemaName`: `TSchemaName`  } & {} \| \{ `schemaName`: `TSchemaName`  } & {} \| \{ `schemaName`: `TSchemaName`  } & {} \| \{ `schemaName`: `TSchemaName`  } & {} \| \{ `schemaName`: `TSchemaName`  } & {} \| \{ `schemaName`: `TSchemaName`  } & {} \| \{ `schemaName`: `TSchemaName`  } & {} \| \{ `schemaName`: `TSchemaName`  } & {} |

#### Parameters

| Name | Type |
| :------ | :------ |
| `«destructured»` | `Object` |
| › `dataStore` | `TDataStore` |
| › `db` | `BetterSQLite3Database`\<`Record`\<`string`, `never`\>\> |
| › `getPermissions?` | () => `any` |
| › `table` | `TTable` |

#### Returns

[`DataType`](datatype-1.DataType.md)\<`TDataStore`, `TTable`, `TSchemaName`, `TDoc`, `TValue`\>

#### Overrides

TypedEmitter\&lt;DataTypeEvents\&lt;TDoc\&gt;\&gt;.constructor

#### Defined in

[src/datatype/index.d.ts:50](https://github.com/digidem/mapeo-core-next/blob/53dc843a45bb963f7a880f5f7973107d5b1fb99c/src/datatype/index.d.ts#L50)

## Accessors

### [kTable]

• `get` **[kTable]**(): `TTable`

#### Returns

`TTable`

#### Defined in

[src/datatype/index.d.ts:62](https://github.com/digidem/mapeo-core-next/blob/53dc843a45bb963f7a880f5f7973107d5b1fb99c/src/datatype/index.d.ts#L62)

___

### writerCore

• `get` **writerCore**(): `Hypercore`\<``"binary"``, `Buffer`\>

#### Returns

`Hypercore`\<``"binary"``, `Buffer`\>

#### Defined in

[src/datatype/index.d.ts:64](https://github.com/digidem/mapeo-core-next/blob/53dc843a45bb963f7a880f5f7973107d5b1fb99c/src/datatype/index.d.ts#L64)

## Methods

### [kCreateWithDocId]

▸ **[kCreateWithDocId]**(`docId`, `value`): `Promise`\<`TDoc` & \{ `forks`: `string`[]  }\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `docId` | `string` |
| `value` | [`CoreOwnershipWithSignaturesValue`](../modules/types.md#coreownershipwithsignaturesvalue) \| `Exclude`\<`TValue`, \{ `schemaName`: ``"coreOwnership"``  }\> |

#### Returns

`Promise`\<`TDoc` & \{ `forks`: `string`[]  }\>

#### Defined in

[src/datatype/index.d.ts:66](https://github.com/digidem/mapeo-core-next/blob/53dc843a45bb963f7a880f5f7973107d5b1fb99c/src/datatype/index.d.ts#L66)

___

### [kSelect]

▸ **[kSelect]**(): `Promise`\<`any`\>

#### Returns

`Promise`\<`any`\>

#### Defined in

[src/datatype/index.d.ts:73](https://github.com/digidem/mapeo-core-next/blob/53dc843a45bb963f7a880f5f7973107d5b1fb99c/src/datatype/index.d.ts#L73)

___

### create

▸ **create**\<`T`\>(`value`): `Promise`\<`TDoc` & \{ `forks`: `string`[]  }\>

#### Type parameters

| Name | Type |
| :------ | :------ |
| `T` | extends \{ `schemaName`: `TSchemaName`  } & {} \| \{ `schemaName`: `TSchemaName`  } & {} \| \{ `schemaName`: `TSchemaName`  } & {} \| \{ `schemaName`: `TSchemaName`  } & {} \| \{ `schemaName`: `TSchemaName`  } & {} \| \{ `schemaName`: `TSchemaName`  } & {} \| \{ `schemaName`: `TSchemaName`  } & {} \| \{ `schemaName`: `TSchemaName`  } & {} \| \{ `schemaName`: `TSchemaName`  } & {} \| `ExactObject`\<\{ `schemaName`: `TSchemaName`  } & {}, `T`\> \| `Exact`\<`ArrayElement`\<`Exclude`\<`Extract`\<{}, \{ `schemaName`: `TSchemaName`  }\>, \{ `schemaName`: ``"coreOwnership"``  }\>\>, `ArrayElement`\<`T`\>\>[] \| readonly `Exact`\<`ArrayElement`\<`Exclude`\<`Extract`\<{}, \{ `schemaName`: `TSchemaName`  }\>, \{ `schemaName`: ``"coreOwnership"``  }\>\>, `ArrayElement`\<`T`\>\>[] \| `ExactObject`\<`Exclude`\<`Extract`\<{}, \{ `schemaName`: `TSchemaName`  }\>, \{ `schemaName`: ``"coreOwnership"``  }\>, `T`\> \| `ExactObject`\<\{ `schemaName`: `TSchemaName`  } & {}, `T`\> \| `ExactObject`\<\{ `schemaName`: `TSchemaName`  } & {}, `T`\> \| `ExactObject`\<\{ `schemaName`: `TSchemaName`  } & {}, `T`\> \| `ExactObject`\<\{ `schemaName`: `TSchemaName`  } & {}, `T`\> \| `ExactObject`\<\{ `schemaName`: `TSchemaName`  } & {}, `T`\> \| `ExactObject`\<\{ `schemaName`: `TSchemaName`  } & {}, `T`\> \| `ExactObject`\<\{ `schemaName`: `TSchemaName`  } & {}, `T`\> \| `ExactObject`\<\{ `schemaName`: `TSchemaName`  } & {}, `T`\> |

#### Parameters

| Name | Type |
| :------ | :------ |
| `value` | `T` |

#### Returns

`Promise`\<`TDoc` & \{ `forks`: `string`[]  }\>

#### Defined in

[src/datatype/index.d.ts:75](https://github.com/digidem/mapeo-core-next/blob/53dc843a45bb963f7a880f5f7973107d5b1fb99c/src/datatype/index.d.ts#L75)

___

### delete

▸ **delete**(`docId`): `Promise`\<`TDoc` & \{ `forks`: `string`[]  }\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `docId` | `string` |

#### Returns

`Promise`\<`TDoc` & \{ `forks`: `string`[]  }\>

#### Defined in

[src/datatype/index.d.ts:97](https://github.com/digidem/mapeo-core-next/blob/53dc843a45bb963f7a880f5f7973107d5b1fb99c/src/datatype/index.d.ts#L97)

___

### getByDocId

▸ **getByDocId**(`docId`): `Promise`\<`TDoc` & \{ `forks`: `string`[]  }\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `docId` | `string` |

#### Returns

`Promise`\<`TDoc` & \{ `forks`: `string`[]  }\>

#### Defined in

[src/datatype/index.d.ts:82](https://github.com/digidem/mapeo-core-next/blob/53dc843a45bb963f7a880f5f7973107d5b1fb99c/src/datatype/index.d.ts#L82)

___

### getByVersionId

▸ **getByVersionId**(`versionId`): `Promise`\<`TDoc`\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `versionId` | `string` |

#### Returns

`Promise`\<`TDoc`\>

#### Defined in

[src/datatype/index.d.ts:84](https://github.com/digidem/mapeo-core-next/blob/53dc843a45bb963f7a880f5f7973107d5b1fb99c/src/datatype/index.d.ts#L84)

___

### getMany

▸ **getMany**(`opts?`): `Promise`\<`TDoc` & \{ `forks`: `string`[]  }[]\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `opts?` | `Object` |
| `opts.includeDeleted?` | `boolean` |

#### Returns

`Promise`\<`TDoc` & \{ `forks`: `string`[]  }[]\>

#### Defined in

[src/datatype/index.d.ts:86](https://github.com/digidem/mapeo-core-next/blob/53dc843a45bb963f7a880f5f7973107d5b1fb99c/src/datatype/index.d.ts#L86)

___

### update

▸ **update**\<`T`\>(`versionId`, `value`): `Promise`\<`TDoc` & \{ `forks`: `string`[]  }\>

#### Type parameters

| Name | Type |
| :------ | :------ |
| `T` | extends \{ `schemaName`: `TSchemaName`  } & {} \| \{ `schemaName`: `TSchemaName`  } & {} \| \{ `schemaName`: `TSchemaName`  } & {} \| \{ `schemaName`: `TSchemaName`  } & {} \| \{ `schemaName`: `TSchemaName`  } & {} \| \{ `schemaName`: `TSchemaName`  } & {} \| \{ `schemaName`: `TSchemaName`  } & {} \| \{ `schemaName`: `TSchemaName`  } & {} \| \{ `schemaName`: `TSchemaName`  } & {} \| `ExactObject`\<\{ `schemaName`: `TSchemaName`  } & {}, `T`\> \| `Exact`\<`ArrayElement`\<`Exclude`\<`Extract`\<{}, \{ `schemaName`: `TSchemaName`  }\>, \{ `schemaName`: ``"coreOwnership"``  }\>\>, `ArrayElement`\<`T`\>\>[] \| readonly `Exact`\<`ArrayElement`\<`Exclude`\<`Extract`\<{}, \{ `schemaName`: `TSchemaName`  }\>, \{ `schemaName`: ``"coreOwnership"``  }\>\>, `ArrayElement`\<`T`\>\>[] \| `ExactObject`\<`Exclude`\<`Extract`\<{}, \{ `schemaName`: `TSchemaName`  }\>, \{ `schemaName`: ``"coreOwnership"``  }\>, `T`\> \| `ExactObject`\<\{ `schemaName`: `TSchemaName`  } & {}, `T`\> \| `ExactObject`\<\{ `schemaName`: `TSchemaName`  } & {}, `T`\> \| `ExactObject`\<\{ `schemaName`: `TSchemaName`  } & {}, `T`\> \| `ExactObject`\<\{ `schemaName`: `TSchemaName`  } & {}, `T`\> \| `ExactObject`\<\{ `schemaName`: `TSchemaName`  } & {}, `T`\> \| `ExactObject`\<\{ `schemaName`: `TSchemaName`  } & {}, `T`\> \| `ExactObject`\<\{ `schemaName`: `TSchemaName`  } & {}, `T`\> \| `ExactObject`\<\{ `schemaName`: `TSchemaName`  } & {}, `T`\> |

#### Parameters

| Name | Type |
| :------ | :------ |
| `versionId` | `string` \| `string`[] |
| `value` | `T` |

#### Returns

`Promise`\<`TDoc` & \{ `forks`: `string`[]  }\>

#### Defined in

[src/datatype/index.d.ts:90](https://github.com/digidem/mapeo-core-next/blob/53dc843a45bb963f7a880f5f7973107d5b1fb99c/src/datatype/index.d.ts#L90)
