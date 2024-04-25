[API](../README.md) / [datastore](../modules/datastore.md) / DataStore

# Class: DataStore\<TNamespace, TSchemaName\>

[datastore](../modules/datastore.md).DataStore

## Type parameters

| Name | Type |
| :------ | :------ |
| `TNamespace` | keyof [`NamespaceSchemas`](../modules/datastore.md#namespaceschemas) |
| `TSchemaName` | [`NamespaceSchemas`](../modules/datastore.md#namespaceschemas)[`TNamespace`][`number`] |

## Hierarchy

- `TypedEmitter`

  ↳ **`DataStore`**

## Table of contents

### Constructors

- [constructor](datastore.DataStore.md#constructor)

### Accessors

- [indexer](datastore.DataStore.md#indexer)
- [namespace](datastore.DataStore.md#namespace)
- [schemas](datastore.DataStore.md#schemas)
- [writerCore](datastore.DataStore.md#writercore)

### Methods

- [close](datastore.DataStore.md#close)
- [getIndexState](datastore.DataStore.md#getindexstate)
- [read](datastore.DataStore.md#read)
- [readRaw](datastore.DataStore.md#readraw)
- [write](datastore.DataStore.md#write)
- [writeRaw](datastore.DataStore.md#writeraw)

## Constructors

### constructor

• **new DataStore**\<`TNamespace`, `TSchemaName`\>(`opts`): [`DataStore`](datastore.DataStore.md)\<`TNamespace`, `TSchemaName`\>

#### Type parameters

| Name | Type |
| :------ | :------ |
| `TNamespace` | extends ``"auth"`` \| ``"config"`` \| ``"data"`` = ``"auth"`` \| ``"config"`` \| ``"data"`` |
| `TSchemaName` | extends ``"translation"`` \| ``"track"`` \| ``"role"`` \| ``"projectSettings"`` \| ``"preset"`` \| ``"observation"`` \| ``"icon"`` \| ``"field"`` \| ``"deviceInfo"`` \| ``"coreOwnership"`` = \{ `auth`: readonly [``"coreOwnership"``, ``"role"``] ; `config`: readonly [``"translation"``, ``"preset"``, ``"field"``, ``"projectSettings"``, ``"deviceInfo"``, ``"icon"``] ; `data`: readonly [``"observation"``, ``"track"``]  }[`TNamespace`][`number`] |

#### Parameters

| Name | Type |
| :------ | :------ |
| `opts` | `Object` |
| `opts.batch` | (`entries`: `Entry`\<``"binary"``\>[]) => `Promise`\<[`IndexedDocIds`](../modules/index_writer.md#indexeddocids)\> |
| `opts.coreManager` | [`CoreManager`](core_manager.CoreManager.md) |
| `opts.namespace` | `TNamespace` |
| `opts.storage` | `StorageParam` |

#### Returns

[`DataStore`](datastore.DataStore.md)\<`TNamespace`, `TSchemaName`\>

#### Overrides

TypedEmitter.constructor

#### Defined in

[src/datastore/index.js:72](https://github.com/digidem/mapeo-core-next/blob/53dc843a45bb963f7a880f5f7973107d5b1fb99c/src/datastore/index.js#L72)

## Accessors

### indexer

• `get` **indexer**(): `MultiCoreIndexer`\<``"binary"``\>

#### Returns

`MultiCoreIndexer`\<``"binary"``\>

#### Defined in

[src/datastore/index.js:94](https://github.com/digidem/mapeo-core-next/blob/53dc843a45bb963f7a880f5f7973107d5b1fb99c/src/datastore/index.js#L94)

___

### namespace

• `get` **namespace**(): `TNamespace`

#### Returns

`TNamespace`

#### Defined in

[src/datastore/index.js:98](https://github.com/digidem/mapeo-core-next/blob/53dc843a45bb963f7a880f5f7973107d5b1fb99c/src/datastore/index.js#L98)

___

### schemas

• `get` **schemas**(): (``"track"`` \| ``"observation"``)[] \| (``"translation"`` \| ``"projectSettings"`` \| ``"preset"`` \| ``"icon"`` \| ``"field"`` \| ``"deviceInfo"``)[] \| (``"role"`` \| ``"coreOwnership"``)[]

#### Returns

(``"track"`` \| ``"observation"``)[] \| (``"translation"`` \| ``"projectSettings"`` \| ``"preset"`` \| ``"icon"`` \| ``"field"`` \| ``"deviceInfo"``)[] \| (``"role"`` \| ``"coreOwnership"``)[]

#### Defined in

[src/datastore/index.js:102](https://github.com/digidem/mapeo-core-next/blob/53dc843a45bb963f7a880f5f7973107d5b1fb99c/src/datastore/index.js#L102)

___

### writerCore

• `get` **writerCore**(): `Hypercore`\<``"binary"``, `Buffer`\>

#### Returns

`Hypercore`\<``"binary"``, `Buffer`\>

#### Defined in

[src/datastore/index.js:107](https://github.com/digidem/mapeo-core-next/blob/53dc843a45bb963f7a880f5f7973107d5b1fb99c/src/datastore/index.js#L107)

## Methods

### close

▸ **close**(): `Promise`\<`void`\>

#### Returns

`Promise`\<`void`\>

#### Defined in

[src/datastore/index.js:229](https://github.com/digidem/mapeo-core-next/blob/53dc843a45bb963f7a880f5f7973107d5b1fb99c/src/datastore/index.js#L229)

___

### getIndexState

▸ **getIndexState**(): `IndexState`

#### Returns

`IndexState`

#### Defined in

[src/datastore/index.js:111](https://github.com/digidem/mapeo-core-next/blob/53dc843a45bb963f7a880f5f7973107d5b1fb99c/src/datastore/index.js#L111)

___

### read

▸ **read**(`versionId`): `Promise`\<`MapeoDoc`\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `versionId` | `string` |

#### Returns

`Promise`\<`MapeoDoc`\>

#### Defined in

[src/datastore/index.js:198](https://github.com/digidem/mapeo-core-next/blob/53dc843a45bb963f7a880f5f7973107d5b1fb99c/src/datastore/index.js#L198)

___

### readRaw

▸ **readRaw**(`versionId`): `Promise`\<`Buffer`\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `versionId` | `string` |

#### Returns

`Promise`\<`Buffer`\>

#### Defined in

[src/datastore/index.js:220](https://github.com/digidem/mapeo-core-next/blob/53dc843a45bb963f7a880f5f7973107d5b1fb99c/src/datastore/index.js#L220)

___

### write

▸ **write**\<`TDoc`\>(`doc`): `Promise`\<`Extract`\<{}, `TDoc`\> \| `Extract`\<{}, `TDoc`\> \| `Extract`\<{}, `TDoc`\> \| `Extract`\<{}, `TDoc`\> \| `Extract`\<{}, `TDoc`\> \| `Extract`\<{}, `TDoc`\> \| `Extract`\<{}, `TDoc`\> \| `Extract`\<{}, `TDoc`\> \| `Extract`\<{}, `TDoc`\> \| `Extract`\<{}, `TDoc`\>\>

UNSAFE: Does not check links: [] refer to a valid doc - should only be used
internally.

Write a doc, must be one of the schema types supported by the namespace of
this DataStore.

#### Type parameters

| Name | Type |
| :------ | :------ |
| `TDoc` | extends \{ `schemaName`: `TSchemaName`  } & `Omit`\<{}, ``"versionId"``\> \| \{ `schemaName`: `TSchemaName`  } & `Omit`\<{}, ``"versionId"``\> \| \{ `schemaName`: `TSchemaName`  } & `Omit`\<{}, ``"versionId"``\> \| \{ `schemaName`: `TSchemaName`  } & `Omit`\<{}, ``"versionId"``\> \| \{ `schemaName`: `TSchemaName`  } & `Omit`\<{}, ``"versionId"``\> \| \{ `schemaName`: `TSchemaName`  } & `Omit`\<{}, ``"versionId"``\> \| \{ `schemaName`: `TSchemaName`  } & `Omit`\<{}, ``"versionId"``\> \| \{ `schemaName`: `TSchemaName`  } & `Omit`\<{}, ``"versionId"``\> \| \{ `schemaName`: `TSchemaName`  } & `Omit`\<{}, ``"versionId"``\> \| \{ `schemaName`: `TSchemaName`  } & `Omit`\<{} & `CoreOwnershipSignatures`, ``"versionId"``\> |

#### Parameters

| Name | Type |
| :------ | :------ |
| `doc` | `TDoc` |

#### Returns

`Promise`\<`Extract`\<{}, `TDoc`\> \| `Extract`\<{}, `TDoc`\> \| `Extract`\<{}, `TDoc`\> \| `Extract`\<{}, `TDoc`\> \| `Extract`\<{}, `TDoc`\> \| `Extract`\<{}, `TDoc`\> \| `Extract`\<{}, `TDoc`\> \| `Extract`\<{}, `TDoc`\> \| `Extract`\<{}, `TDoc`\> \| `Extract`\<{}, `TDoc`\>\>

#### Defined in

[src/datastore/index.js:157](https://github.com/digidem/mapeo-core-next/blob/53dc843a45bb963f7a880f5f7973107d5b1fb99c/src/datastore/index.js#L157)

___

### writeRaw

▸ **writeRaw**(`buf`): `Promise`\<`string`\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `buf` | `Buffer` |

#### Returns

`Promise`\<`string`\>

#### Defined in

[src/datastore/index.js:208](https://github.com/digidem/mapeo-core-next/blob/53dc843a45bb963f7a880f5f7973107d5b1fb99c/src/datastore/index.js#L208)
