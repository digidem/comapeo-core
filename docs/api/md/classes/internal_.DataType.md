[API](../README.md) / [\<internal\>](../modules/internal_.md) / DataType

# Class: DataType\<TDataStore, TTable, TSchemaName, TDoc, TValue\>

[\<internal\>](../modules/internal_.md).DataType

## Type parameters

| Name | Type |
| :------ | :------ |
| `TDataStore` | extends [`"/home/szgy/src/dd/mapeo-core-next/src/datastore/index"`](../modules/internal_.__home_szgy_src_dd_mapeo_core_next_src_datastore_index_.md) |
| `TTable` | extends [`MapeoDocTables`](../modules/internal_.md#mapeodoctables-1) |
| `TSchemaName` | extends `TTable`[``"_"``][``"name"``] |
| `TDoc` | extends [`MapeoDocMap`](../modules/internal_.md#mapeodocmap)[`TSchemaName`] |
| `TValue` | extends [`MapeoValueMap`](../modules/internal_.md#mapeovaluemap)[`TSchemaName`] |

## Hierarchy

- `TypedEmitter`\<[`DataTypeEvents`](../interfaces/internal_.DataTypeEvents.md)\<`TDoc`\>\>

  ↳ **`DataType`**

## Table of contents

### Constructors

- [constructor](internal_.DataType.md#constructor)

### Accessors

- [[kTable]](internal_.DataType.md#[ktable])
- [writerCore](internal_.DataType.md#writercore)

### Methods

- [[kCreateWithDocId]](internal_.DataType.md#[kcreatewithdocid])
- [[kSelect]](internal_.DataType.md#[kselect])
- [create](internal_.DataType.md#create)
- [delete](internal_.DataType.md#delete)
- [getByDocId](internal_.DataType.md#getbydocid)
- [getByVersionId](internal_.DataType.md#getbyversionid)
- [getMany](internal_.DataType.md#getmany)
- [update](internal_.DataType.md#update)

## Constructors

### constructor

• **new DataType**\<`TDataStore`, `TTable`, `TSchemaName`, `TDoc`, `TValue`\>(`«destructured»`): [`DataType`](internal_.DataType.md)\<`TDataStore`, `TTable`, `TSchemaName`, `TDoc`, `TValue`\>

#### Type parameters

| Name | Type |
| :------ | :------ |
| `TDataStore` | extends [`DataStore`](internal_.DataStore.md)\<``"auth"`` \| ``"config"`` \| ``"data"``, ``"translation"`` \| ``"track"`` \| ``"role"`` \| ``"projectSettings"`` \| ``"preset"`` \| ``"observation"`` \| ``"icon"`` \| ``"field"`` \| ``"deviceInfo"`` \| ``"coreOwnership"``\> |
| `TTable` | extends [`MapeoDocTables`](../modules/internal_.md#mapeodoctables-1) |
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
| › `getTranslations` | (`value`: {}) => `Promise`\<{}[]\> |
| › `table` | `TTable` |

#### Returns

[`DataType`](internal_.DataType.md)\<`TDataStore`, `TTable`, `TSchemaName`, `TDoc`, `TValue`\>

#### Overrides

TypedEmitter\&lt;DataTypeEvents\&lt;TDoc\&gt;\&gt;.constructor

## Accessors

### [kTable]

• `get` **[kTable]**(): `TTable`

#### Returns

`TTable`

___

### writerCore

• `get` **writerCore**(): `Hypercore`\<``"binary"``, `Buffer`\>

#### Returns

`Hypercore`\<``"binary"``, `Buffer`\>

## Methods

### [kCreateWithDocId]

▸ **[kCreateWithDocId]**(`docId`, `value`): `Promise`\<`TDoc` & \{ `forks`: `string`[]  }\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `docId` | `string` |
| `value` | `Exclude`\<`TValue`, \{ `schemaName`: ``"coreOwnership"``  }\> \| [`CoreOwnershipWithSignaturesValue`](../modules/internal_.md#coreownershipwithsignaturesvalue) |

#### Returns

`Promise`\<`TDoc` & \{ `forks`: `string`[]  }\>

___

### [kSelect]

▸ **[kSelect]**(): `Promise`\<`any`\>

#### Returns

`Promise`\<`any`\>

___

### create

▸ **create**\<`T`\>(`value`): `Promise`\<`TDoc` & \{ `forks`: `string`[]  }\>

#### Type parameters

| Name | Type |
| :------ | :------ |
| `T` | extends \{ `schemaName`: `TSchemaName`  } & {} \| \{ `schemaName`: `TSchemaName`  } & {} \| \{ `schemaName`: `TSchemaName`  } & {} \| \{ `schemaName`: `TSchemaName`  } & {} \| \{ `schemaName`: `TSchemaName`  } & {} \| \{ `schemaName`: `TSchemaName`  } & {} \| \{ `schemaName`: `TSchemaName`  } & {} \| \{ `schemaName`: `TSchemaName`  } & {} \| \{ `schemaName`: `TSchemaName`  } & {} \| `ExactObject`\<\{ `schemaName`: `TSchemaName`  } & {}, `T`\> \| `ExactObject`\<\{ `schemaName`: `TSchemaName`  } & {}, `T`\> \| `ExactObject`\<\{ `schemaName`: `TSchemaName`  } & {}, `T`\> \| `ExactObject`\<\{ `schemaName`: `TSchemaName`  } & {}, `T`\> \| `ExactObject`\<\{ `schemaName`: `TSchemaName`  } & {}, `T`\> \| `ExactObject`\<\{ `schemaName`: `TSchemaName`  } & {}, `T`\> \| `ExactObject`\<\{ `schemaName`: `TSchemaName`  } & {}, `T`\> \| `ExactObject`\<\{ `schemaName`: `TSchemaName`  } & {}, `T`\> \| `ExactObject`\<\{ `schemaName`: `TSchemaName`  } & {}, `T`\> \| `Exact`\<`ArrayElement`\<`Exclude`\<`Extract`\<{}, \{ `schemaName`: `TSchemaName`  }\>, \{ `schemaName`: ``"coreOwnership"``  }\>\>, `ArrayElement`\<`T`\>\>[] \| readonly `Exact`\<`ArrayElement`\<`Exclude`\<`Extract`\<{}, \{ `schemaName`: `TSchemaName`  }\>, \{ `schemaName`: ``"coreOwnership"``  }\>\>, `ArrayElement`\<`T`\>\>[] \| `ExactObject`\<`Exclude`\<`Extract`\<{}, \{ `schemaName`: `TSchemaName`  }\>, \{ `schemaName`: ``"coreOwnership"``  }\>, `T`\> |

#### Parameters

| Name | Type |
| :------ | :------ |
| `value` | `T` |

#### Returns

`Promise`\<`TDoc` & \{ `forks`: `string`[]  }\>

___

### delete

▸ **delete**(`docId`): `Promise`\<`TDoc` & \{ `forks`: `string`[]  }\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `docId` | `string` |

#### Returns

`Promise`\<`TDoc` & \{ `forks`: `string`[]  }\>

___

### getByDocId

▸ **getByDocId**(`docId`, `opts?`): `Promise`\<`TDoc` & \{ `forks`: `string`[]  }\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `docId` | `string` |
| `opts?` | `Object` |
| `opts.lang?` | `string` |

#### Returns

`Promise`\<`TDoc` & \{ `forks`: `string`[]  }\>

___

### getByVersionId

▸ **getByVersionId**(`versionId`, `opts?`): `Promise`\<`TDoc`\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `versionId` | `string` |
| `opts?` | `Object` |
| `opts.lang?` | `string` |

#### Returns

`Promise`\<`TDoc`\>

___

### getMany

▸ **getMany**(`opts?`): `Promise`\<`TDoc` & \{ `forks`: `string`[]  }[]\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `opts?` | `Object` |
| `opts.includeDeleted?` | `boolean` |
| `opts.lang?` | `string` |

#### Returns

`Promise`\<`TDoc` & \{ `forks`: `string`[]  }[]\>

___

### update

▸ **update**\<`T`\>(`versionId`, `value`): `Promise`\<`TDoc` & \{ `forks`: `string`[]  }\>

#### Type parameters

| Name | Type |
| :------ | :------ |
| `T` | extends \{ `schemaName`: `TSchemaName`  } & {} \| \{ `schemaName`: `TSchemaName`  } & {} \| \{ `schemaName`: `TSchemaName`  } & {} \| \{ `schemaName`: `TSchemaName`  } & {} \| \{ `schemaName`: `TSchemaName`  } & {} \| \{ `schemaName`: `TSchemaName`  } & {} \| \{ `schemaName`: `TSchemaName`  } & {} \| \{ `schemaName`: `TSchemaName`  } & {} \| \{ `schemaName`: `TSchemaName`  } & {} \| `ExactObject`\<\{ `schemaName`: `TSchemaName`  } & {}, `T`\> \| `ExactObject`\<\{ `schemaName`: `TSchemaName`  } & {}, `T`\> \| `ExactObject`\<\{ `schemaName`: `TSchemaName`  } & {}, `T`\> \| `ExactObject`\<\{ `schemaName`: `TSchemaName`  } & {}, `T`\> \| `ExactObject`\<\{ `schemaName`: `TSchemaName`  } & {}, `T`\> \| `ExactObject`\<\{ `schemaName`: `TSchemaName`  } & {}, `T`\> \| `ExactObject`\<\{ `schemaName`: `TSchemaName`  } & {}, `T`\> \| `ExactObject`\<\{ `schemaName`: `TSchemaName`  } & {}, `T`\> \| `ExactObject`\<\{ `schemaName`: `TSchemaName`  } & {}, `T`\> \| `Exact`\<`ArrayElement`\<`Exclude`\<`Extract`\<{}, \{ `schemaName`: `TSchemaName`  }\>, \{ `schemaName`: ``"coreOwnership"``  }\>\>, `ArrayElement`\<`T`\>\>[] \| readonly `Exact`\<`ArrayElement`\<`Exclude`\<`Extract`\<{}, \{ `schemaName`: `TSchemaName`  }\>, \{ `schemaName`: ``"coreOwnership"``  }\>\>, `ArrayElement`\<`T`\>\>[] \| `ExactObject`\<`Exclude`\<`Extract`\<{}, \{ `schemaName`: `TSchemaName`  }\>, \{ `schemaName`: ``"coreOwnership"``  }\>, `T`\> |

#### Parameters

| Name | Type |
| :------ | :------ |
| `versionId` | `string` \| `string`[] |
| `value` | `T` |

#### Returns

`Promise`\<`TDoc` & \{ `forks`: `string`[]  }\>
