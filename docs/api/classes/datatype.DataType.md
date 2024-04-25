[API](../README.md) / [datatype](../modules/datatype.md) / DataType

# Class: DataType\<TDataStore, TSchemaName, TTable, TDoc, TValue\>

[datatype](../modules/datatype.md).DataType

## Type parameters

| Name |
| :------ |
| `TDataStore` |
| `TSchemaName` |
| `TTable` |
| `TDoc` |
| `TValue` |

## Hierarchy

- `TypedEmitter`

  ↳ **`DataType`**

## Table of contents

### Constructors

- [constructor](datatype.DataType.md#constructor)

### Accessors

- [[kTable]](datatype.DataType.md#[ktable])
- [writerCore](datatype.DataType.md#writercore)

### Methods

- [[kCreateWithDocId]](datatype.DataType.md#[kcreatewithdocid])
- [[kSelect]](datatype.DataType.md#[kselect])
- [create](datatype.DataType.md#create)
- [delete](datatype.DataType.md#delete)
- [getByDocId](datatype.DataType.md#getbydocid)
- [getByVersionId](datatype.DataType.md#getbyversionid)
- [getMany](datatype.DataType.md#getmany)
- [update](datatype.DataType.md#update)

## Constructors

### constructor

• **new DataType**\<`TDataStore`, `TSchemaName`, `TTable`, `TDoc`, `TValue`\>(`opts`): [`DataType`](datatype.DataType.md)\<`TDataStore`, `TSchemaName`, `TTable`, `TDoc`, `TValue`\>

#### Type parameters

| Name | Type |
| :------ | :------ |
| `TDataStore` | extends [`DataStore`](datastore.DataStore.md)\<``"auth"`` \| ``"config"`` \| ``"data"``, ``"translation"`` \| ``"track"`` \| ``"role"`` \| ``"projectSettings"`` \| ``"preset"`` \| ``"observation"`` \| ``"icon"`` \| ``"field"`` \| ``"deviceInfo"`` \| ``"coreOwnership"``\> |
| `TSchemaName` | extends ``"translation"`` \| ``"track"`` \| ``"role"`` \| ``"projectSettings"`` \| ``"preset"`` \| ``"observation"`` \| ``"icon"`` \| ``"field"`` \| ``"deviceInfo"`` \| ``"coreOwnership"`` |
| `TTable` | extends \{ `_`: \{ `name`: `TSchemaName`  }  } & `SQLiteTable`\<{}\> & \{ `forks`: `SQLiteColumn`\<{}, `object`\>  } \| \{ `_`: \{ `name`: `TSchemaName`  }  } & `SQLiteTable`\<{}\> & \{ `forks`: `SQLiteColumn`\<{}, `object`\>  } \| \{ `_`: \{ `name`: `TSchemaName`  }  } & `SQLiteTable`\<{}\> & \{ `forks`: `SQLiteColumn`\<{}, `object`\>  } \| \{ `_`: \{ `name`: `TSchemaName`  }  } & `SQLiteTable`\<{}\> & \{ `forks`: `SQLiteColumn`\<{}, `object`\>  } \| \{ `_`: \{ `name`: `TSchemaName`  }  } & `SQLiteTable`\<{}\> & \{ `forks`: `SQLiteColumn`\<{}, `object`\>  } \| \{ `_`: \{ `name`: `TSchemaName`  }  } & `SQLiteTable`\<{}\> & \{ `forks`: `SQLiteColumn`\<{}, `object`\>  } \| \{ `_`: \{ `name`: `TSchemaName`  }  } & `SQLiteTable`\<{}\> & \{ `forks`: `SQLiteColumn`\<{}, `object`\>  } \| \{ `_`: \{ `name`: `TSchemaName`  }  } & `SQLiteTable`\<{}\> & \{ `forks`: `SQLiteColumn`\<{}, `object`\>  } \| \{ `_`: \{ `name`: `TSchemaName`  }  } & `SQLiteTable`\<{}\> & \{ `forks`: `SQLiteColumn`\<{}, `object`\>  } \| \{ `_`: \{ `name`: `TSchemaName`  }  } & `SQLiteTable`\<{}\> & \{ `forks`: `SQLiteColumn`\<{}, `object`\>  } |
| `TDoc` | extends \{ `schemaName`: `TSchemaName`  } & {} \| \{ `schemaName`: `TSchemaName`  } & {} \| \{ `schemaName`: `TSchemaName`  } & {} \| \{ `schemaName`: `TSchemaName`  } & {} \| \{ `schemaName`: `TSchemaName`  } & {} \| \{ `schemaName`: `TSchemaName`  } & {} \| \{ `schemaName`: `TSchemaName`  } & {} \| \{ `schemaName`: `TSchemaName`  } & {} \| \{ `schemaName`: `TSchemaName`  } & {} |
| `TValue` | extends \{ `schemaName`: `TSchemaName`  } & {} \| \{ `schemaName`: `TSchemaName`  } & {} \| \{ `schemaName`: `TSchemaName`  } & {} \| \{ `schemaName`: `TSchemaName`  } & {} \| \{ `schemaName`: `TSchemaName`  } & {} \| \{ `schemaName`: `TSchemaName`  } & {} \| \{ `schemaName`: `TSchemaName`  } & {} \| \{ `schemaName`: `TSchemaName`  } & {} \| \{ `schemaName`: `TSchemaName`  } & {} |

#### Parameters

| Name | Type |
| :------ | :------ |
| `opts` | `Object` |
| `opts.dataStore` | `TDataStore` |
| `opts.db` | `BetterSQLite3Database`\<`Record`\<`string`, `never`\>\> |
| `opts.getPermissions` | `undefined` \| () => `any` |
| `opts.table` | `TTable` |

#### Returns

[`DataType`](datatype.DataType.md)\<`TDataStore`, `TSchemaName`, `TTable`, `TDoc`, `TValue`\>

#### Overrides

TypedEmitter.constructor

#### Defined in

[src/datatype/index.js:81](https://github.com/digidem/mapeo-core-next/blob/53dc843a45bb963f7a880f5f7973107d5b1fb99c/src/datatype/index.js#L81)

## Accessors

### [kTable]

• `get` **[kTable]**(): `TTable`

#### Returns

`TTable`

#### Defined in

[src/datatype/index.js:116](https://github.com/digidem/mapeo-core-next/blob/53dc843a45bb963f7a880f5f7973107d5b1fb99c/src/datatype/index.js#L116)

___

### writerCore

• `get` **writerCore**(): `Hypercore`\<``"binary"``, `Buffer`\>

#### Returns

`Hypercore`\<``"binary"``, `Buffer`\>

#### Defined in

[src/datatype/index.js:120](https://github.com/digidem/mapeo-core-next/blob/53dc843a45bb963f7a880f5f7973107d5b1fb99c/src/datatype/index.js#L120)

## Methods

### [kCreateWithDocId]

▸ **[kCreateWithDocId]**(`docId`, `value`, `opts?`): `Promise`\<\{ [KeyType in string \| number \| symbol]: RemoveNull\<\{ [KeyType in string \| number \| symbol]: (\{ [KeyType in string as Filter\<KeyType, \{ [Key in (...)]: (...) }[(...) & (...)]\>]: \{ [K in string]: (...)[(...)] }[KeyType] } & Partial\<Pick\<\{ [K in string]: (...)[(...)] }, \{ [Key in (...)]: (...) }[(...) & (...)]\>\>)[KeyType] }\>[KeyType] }\>

#### Parameters

| Name | Type | Default value | Description |
| :------ | :------ | :------ | :------ |
| `docId` | `string` | `undefined` |  |
| `value` | [`CoreOwnershipWithSignaturesValue`](../modules/types.md#coreownershipwithsignaturesvalue) \| `TValue` | `undefined` |  |
| `opts?` | `Object` | `{}` | only used internally to skip the checkExisting check when creating a document with a random ID (collisions should be too small probability to be worth checking for) |
| `opts.checkExisting?` | `boolean` | `true` | - |

#### Returns

`Promise`\<\{ [KeyType in string \| number \| symbol]: RemoveNull\<\{ [KeyType in string \| number \| symbol]: (\{ [KeyType in string as Filter\<KeyType, \{ [Key in (...)]: (...) }[(...) & (...)]\>]: \{ [K in string]: (...)[(...)] }[KeyType] } & Partial\<Pick\<\{ [K in string]: (...)[(...)] }, \{ [Key in (...)]: (...) }[(...) & (...)]\>\>)[KeyType] }\>[KeyType] }\>

#### Defined in

[src/datatype/index.js:139](https://github.com/digidem/mapeo-core-next/blob/53dc843a45bb963f7a880f5f7973107d5b1fb99c/src/datatype/index.js#L139)

___

### [kSelect]

▸ **[kSelect]**(): `Promise`\<`Omit`\<`SQLiteSelectBase`\<`GetSelectTableName`\<`TTable`\>, ``"sync"``, `RunResult`, `GetSelectTableSelection`\<`TTable`\>, ``"single"``, `GetSelectTableName`\<`TTable`\> extends `string` ? `Record`\<`string` & `GetSelectTableName`\<`TTable`\>, ``"not-null"``\> : {}, ``false``, `never`, \{ [K in string]: \{ [Key in string]: SelectResultField\<GetSelectTableSelection\<(...)\>[Key], true\> }[K] }[], `BuildSubquerySelection`\<`GetSelectTableSelection`\<`TTable`\>, `GetSelectTableName`\<`TTable`\> extends `string` ? `Record`\<`string` & `GetSelectTableName`\<`TTable`\>, ``"not-null"``\> : {}\>\>, ``"then"`` \| ``"catch"`` \| ``"finally"``\> & \{ `catch?`: `undefined` ; `finally?`: `undefined` ; `then?`: `undefined`  }\>

#### Returns

`Promise`\<`Omit`\<`SQLiteSelectBase`\<`GetSelectTableName`\<`TTable`\>, ``"sync"``, `RunResult`, `GetSelectTableSelection`\<`TTable`\>, ``"single"``, `GetSelectTableName`\<`TTable`\> extends `string` ? `Record`\<`string` & `GetSelectTableName`\<`TTable`\>, ``"not-null"``\> : {}, ``false``, `never`, \{ [K in string]: \{ [Key in string]: SelectResultField\<GetSelectTableSelection\<(...)\>[Key], true\> }[K] }[], `BuildSubquerySelection`\<`GetSelectTableSelection`\<`TTable`\>, `GetSelectTableName`\<`TTable`\> extends `string` ? `Record`\<`string` & `GetSelectTableName`\<`TTable`\>, ``"not-null"``\> : {}\>\>, ``"then"`` \| ``"catch"`` \| ``"finally"``\> & \{ `catch?`: `undefined` ; `finally?`: `undefined` ; `then?`: `undefined`  }\>

#### Defined in

[src/datatype/index.js:242](https://github.com/digidem/mapeo-core-next/blob/53dc843a45bb963f7a880f5f7973107d5b1fb99c/src/datatype/index.js#L242)

___

### create

▸ **create**\<`T`\>(`value`): `Promise`\<\{ [KeyType in string \| number \| symbol]: RemoveNull\<\{ [KeyType in string \| number \| symbol]: (\{ [KeyType in string as Filter\<KeyType, \{ [Key in (...)]: (...) }[(...) & (...)]\>]: \{ [K in string]: (...)[(...)] }[KeyType] } & Partial\<Pick\<\{ [K in string]: (...)[(...)] }, \{ [Key in (...)]: (...) }[(...) & (...)]\>\>)[KeyType] }\>[KeyType] }\>

#### Type parameters

| Name | Type |
| :------ | :------ |
| `T` | extends \{ `schemaName`: `TSchemaName`  } & {} \| \{ `schemaName`: `TSchemaName`  } & {} \| \{ `schemaName`: `TSchemaName`  } & {} \| \{ `schemaName`: `TSchemaName`  } & {} \| \{ `schemaName`: `TSchemaName`  } & {} \| \{ `schemaName`: `TSchemaName`  } & {} \| \{ `schemaName`: `TSchemaName`  } & {} \| \{ `schemaName`: `TSchemaName`  } & {} \| \{ `schemaName`: `TSchemaName`  } & {} \| `ExactObject`\<\{ `schemaName`: `TSchemaName`  } & {}, `T`\> \| `Exact`\<`ArrayElement`\<`Exclude`\<`Extract`\<{}, \{ `schemaName`: `TSchemaName`  }\>, \{ `schemaName`: ``"coreOwnership"``  }\>\>, `ArrayElement`\<`T`\>\>[] \| readonly `Exact`\<`ArrayElement`\<`Exclude`\<`Extract`\<{}, \{ `schemaName`: `TSchemaName`  }\>, \{ `schemaName`: ``"coreOwnership"``  }\>\>, `ArrayElement`\<`T`\>\>[] \| `ExactObject`\<`Exclude`\<`Extract`\<{}, \{ `schemaName`: `TSchemaName`  }\>, \{ `schemaName`: ``"coreOwnership"``  }\>, `T`\> \| `ExactObject`\<\{ `schemaName`: `TSchemaName`  } & {}, `T`\> \| `ExactObject`\<\{ `schemaName`: `TSchemaName`  } & {}, `T`\> \| `ExactObject`\<\{ `schemaName`: `TSchemaName`  } & {}, `T`\> \| `ExactObject`\<\{ `schemaName`: `TSchemaName`  } & {}, `T`\> \| `ExactObject`\<\{ `schemaName`: `TSchemaName`  } & {}, `T`\> \| `ExactObject`\<\{ `schemaName`: `TSchemaName`  } & {}, `T`\> \| `ExactObject`\<\{ `schemaName`: `TSchemaName`  } & {}, `T`\> \| `ExactObject`\<\{ `schemaName`: `TSchemaName`  } & {}, `T`\> |

#### Parameters

| Name | Type |
| :------ | :------ |
| `value` | `T` |

#### Returns

`Promise`\<\{ [KeyType in string \| number \| symbol]: RemoveNull\<\{ [KeyType in string \| number \| symbol]: (\{ [KeyType in string as Filter\<KeyType, \{ [Key in (...)]: (...) }[(...) & (...)]\>]: \{ [K in string]: (...)[(...)] }[KeyType] } & Partial\<Pick\<\{ [K in string]: (...)[(...)] }, \{ [Key in (...)]: (...) }[(...) & (...)]\>\>)[KeyType] }\>[KeyType] }\>

#### Defined in

[src/datatype/index.js:128](https://github.com/digidem/mapeo-core-next/blob/53dc843a45bb963f7a880f5f7973107d5b1fb99c/src/datatype/index.js#L128)

___

### delete

▸ **delete**(`docId`): `Promise`\<\{ [KeyType in string \| number \| symbol]: RemoveNull\<\{ [KeyType in string \| number \| symbol]: (\{ [KeyType in string as Filter\<KeyType, \{ [Key in (...)]: (...) }[(...) & (...)]\>]: \{ [K in string]: (...)[(...)] }[KeyType] } & Partial\<Pick\<\{ [K in string]: (...)[(...)] }, \{ [Key in (...)]: (...) }[(...) & (...)]\>\>)[KeyType] }\>[KeyType] }\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `docId` | `string` |

#### Returns

`Promise`\<\{ [KeyType in string \| number \| symbol]: RemoveNull\<\{ [KeyType in string \| number \| symbol]: (\{ [KeyType in string as Filter\<KeyType, \{ [Key in (...)]: (...) }[(...) & (...)]\>]: \{ [K in string]: (...)[(...)] }[KeyType] } & Partial\<Pick\<\{ [K in string]: (...)[(...)] }, \{ [Key in (...)]: (...) }[(...) & (...)]\>\>)[KeyType] }\>[KeyType] }\>

#### Defined in

[src/datatype/index.js:222](https://github.com/digidem/mapeo-core-next/blob/53dc843a45bb963f7a880f5f7973107d5b1fb99c/src/datatype/index.js#L222)

___

### getByDocId

▸ **getByDocId**(`docId`): `Promise`\<\{ [KeyType in string \| number \| symbol]: RemoveNull\<\{ [KeyType in string \| number \| symbol]: (\{ [KeyType in string as Filter\<KeyType, \{ [Key in (...)]: (...) }[(...) & (...)]\>]: \{ [K in string]: (...)[(...)] }[KeyType] } & Partial\<Pick\<\{ [K in string]: (...)[(...)] }, \{ [Key in (...)]: (...) }[(...) & (...)]\>\>)[KeyType] }\>[KeyType] }\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `docId` | `string` |

#### Returns

`Promise`\<\{ [KeyType in string \| number \| symbol]: RemoveNull\<\{ [KeyType in string \| number \| symbol]: (\{ [KeyType in string as Filter\<KeyType, \{ [Key in (...)]: (...) }[(...) & (...)]\>]: \{ [K in string]: (...)[(...)] }[KeyType] } & Partial\<Pick\<\{ [K in string]: (...)[(...)] }, \{ [Key in (...)]: (...) }[(...) & (...)]\>\>)[KeyType] }\>[KeyType] }\>

#### Defined in

[src/datatype/index.js:175](https://github.com/digidem/mapeo-core-next/blob/53dc843a45bb963f7a880f5f7973107d5b1fb99c/src/datatype/index.js#L175)

___

### getByVersionId

▸ **getByVersionId**(`versionId`): `Promise`\<`MapeoDoc`\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `versionId` | `string` |

#### Returns

`Promise`\<`MapeoDoc`\>

#### Defined in

[src/datatype/index.js:183](https://github.com/digidem/mapeo-core-next/blob/53dc843a45bb963f7a880f5f7973107d5b1fb99c/src/datatype/index.js#L183)

___

### getMany

▸ **getMany**(`opts?`): `Promise`\<\{ [KeyType in string \| number \| symbol]: RemoveNull\<\{ [KeyType in string \| number \| symbol]: (\{ [KeyType in string as Filter\<KeyType, (...)[(...)]\>]: \{ [K in (...)]: (...) }[KeyType] } & Partial\<Pick\<\{ [K in (...)]: (...) }, (...)[(...)]\>\>)[KeyType] }\>[KeyType] }[]\>

#### Parameters

| Name | Type | Default value |
| :------ | :------ | :------ |
| `opts?` | `Object` | `{}` |
| `opts.includeDeleted?` | `boolean` | `false` |

#### Returns

`Promise`\<\{ [KeyType in string \| number \| symbol]: RemoveNull\<\{ [KeyType in string \| number \| symbol]: (\{ [KeyType in string as Filter\<KeyType, (...)[(...)]\>]: \{ [K in (...)]: (...) }[KeyType] } & Partial\<Pick\<\{ [K in (...)]: (...) }, (...)[(...)]\>\>)[KeyType] }\>[KeyType] }[]\>

#### Defined in

[src/datatype/index.js:188](https://github.com/digidem/mapeo-core-next/blob/53dc843a45bb963f7a880f5f7973107d5b1fb99c/src/datatype/index.js#L188)

___

### update

▸ **update**\<`T`\>(`versionId`, `value`): `Promise`\<\{ [KeyType in string \| number \| symbol]: RemoveNull\<\{ [KeyType in string \| number \| symbol]: (\{ [KeyType in string as Filter\<KeyType, \{ [Key in (...)]: (...) }[(...) & (...)]\>]: \{ [K in string]: (...)[(...)] }[KeyType] } & Partial\<Pick\<\{ [K in string]: (...)[(...)] }, \{ [Key in (...)]: (...) }[(...) & (...)]\>\>)[KeyType] }\>[KeyType] }\>

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

`Promise`\<\{ [KeyType in string \| number \| symbol]: RemoveNull\<\{ [KeyType in string \| number \| symbol]: (\{ [KeyType in string as Filter\<KeyType, \{ [Key in (...)]: (...) }[(...) & (...)]\>]: \{ [K in string]: (...)[(...)] }[KeyType] } & Partial\<Pick\<\{ [K in string]: (...)[(...)] }, \{ [Key in (...)]: (...) }[(...) & (...)]\>\>)[KeyType] }\>[KeyType] }\>

#### Defined in

[src/datatype/index.js:202](https://github.com/digidem/mapeo-core-next/blob/53dc843a45bb963f7a880f5f7973107d5b1fb99c/src/datatype/index.js#L202)
