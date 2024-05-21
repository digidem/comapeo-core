[API](../README.md) / [\<internal\>](../modules/internal_.md) / DataStore

# Class: DataStore\<TNamespace, TSchemaName\>

[\<internal\>](../modules/internal_.md).DataStore

## Type parameters

| Name | Type |
| :------ | :------ |
| `TNamespace` | keyof [`NamespaceSchemas`](../modules/internal_.md#namespaceschemas) |
| `TSchemaName` | [`NamespaceSchemas`](../modules/internal_.md#namespaceschemas)[`TNamespace`][`number`] |

## Hierarchy

- `TypedEmitter`

  ↳ **`DataStore`**

## Table of contents

### Constructors

- [constructor](internal_.DataStore.md#constructor)

### Accessors

- [indexer](internal_.DataStore.md#indexer)
- [namespace](internal_.DataStore.md#namespace)
- [schemas](internal_.DataStore.md#schemas)
- [writerCore](internal_.DataStore.md#writercore)

### Methods

- [close](internal_.DataStore.md#close)
- [getIndexState](internal_.DataStore.md#getindexstate)
- [read](internal_.DataStore.md#read)
- [readRaw](internal_.DataStore.md#readraw)
- [write](internal_.DataStore.md#write)
- [writeRaw](internal_.DataStore.md#writeraw)

## Constructors

### constructor

• **new DataStore**\<`TNamespace`, `TSchemaName`\>(`opts`): [`DataStore`](internal_.DataStore.md)\<`TNamespace`, `TSchemaName`\>

#### Type parameters

| Name | Type |
| :------ | :------ |
| `TNamespace` | extends ``"auth"`` \| ``"config"`` \| ``"data"`` = ``"auth"`` \| ``"config"`` \| ``"data"`` |
| `TSchemaName` | extends ``"translation"`` \| ``"track"`` \| ``"role"`` \| ``"projectSettings"`` \| ``"preset"`` \| ``"observation"`` \| ``"icon"`` \| ``"field"`` \| ``"deviceInfo"`` \| ``"coreOwnership"`` = \{ `auth`: readonly [``"coreOwnership"``, ``"role"``] ; `config`: readonly [``"translation"``, ``"preset"``, ``"field"``, ``"projectSettings"``, ``"deviceInfo"``, ``"icon"``] ; `data`: readonly [``"observation"``, ``"track"``]  }[`TNamespace`][`number`] |

#### Parameters

| Name | Type |
| :------ | :------ |
| `opts` | `Object` |
| `opts.batch` | (`entries`: `Entry`\<``"binary"``\>[]) => `Promise`\<[`IndexedDocIds`](../modules/internal_.md#indexeddocids)\> |
| `opts.coreManager` | [`CoreManager`](internal_.CoreManager.md) |
| `opts.namespace` | `TNamespace` |
| `opts.storage` | `StorageParam` |

#### Returns

[`DataStore`](internal_.DataStore.md)\<`TNamespace`, `TSchemaName`\>

#### Overrides

TypedEmitter.constructor

## Accessors

### indexer

• `get` **indexer**(): `MultiCoreIndexer`\<``"binary"``\>

#### Returns

`MultiCoreIndexer`\<``"binary"``\>

___

### namespace

• `get` **namespace**(): `TNamespace`

#### Returns

`TNamespace`

___

### schemas

• `get` **schemas**(): (``"track"`` \| ``"observation"``)[] \| (``"translation"`` \| ``"projectSettings"`` \| ``"preset"`` \| ``"icon"`` \| ``"field"`` \| ``"deviceInfo"``)[] \| (``"role"`` \| ``"coreOwnership"``)[]

#### Returns

(``"track"`` \| ``"observation"``)[] \| (``"translation"`` \| ``"projectSettings"`` \| ``"preset"`` \| ``"icon"`` \| ``"field"`` \| ``"deviceInfo"``)[] \| (``"role"`` \| ``"coreOwnership"``)[]

___

### writerCore

• `get` **writerCore**(): `Hypercore`\<``"binary"``, `Buffer`\>

#### Returns

`Hypercore`\<``"binary"``, `Buffer`\>

## Methods

### close

▸ **close**(): `Promise`\<`void`\>

#### Returns

`Promise`\<`void`\>

___

### getIndexState

▸ **getIndexState**(): `IndexState`

#### Returns

`IndexState`

___

### read

▸ **read**(`versionId`): `Promise`\<`MapeoDoc`\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `versionId` | `string` |

#### Returns

`Promise`\<`MapeoDoc`\>

___

### readRaw

▸ **readRaw**(`versionId`): `Promise`\<`Buffer`\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `versionId` | `string` |

#### Returns

`Promise`\<`Buffer`\>

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

___

### writeRaw

▸ **writeRaw**(`buf`): `Promise`\<`string`\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `buf` | `Buffer` |

#### Returns

`Promise`\<`string`\>
