[**API**](../../README.md) • **Docs**

***

[API](../../README.md) / [\<internal\>](../README.md) / DataStore

# Class: DataStore\<TNamespace, TSchemaName\>

## Extends

- `TypedEmitter`

## Type Parameters

• **TNamespace** = keyof [`NamespaceSchemas`](../type-aliases/NamespaceSchemas.md)

• **TSchemaName** = [`NamespaceSchemas`](../type-aliases/NamespaceSchemas.md)\[`TNamespace`\]\[`number`\]

## Constructors

### new DataStore()

> **new DataStore**\<`TNamespace`, `TSchemaName`\>(`opts`): [`DataStore`](DataStore.md)\<`TNamespace`, `TSchemaName`\>

#### Parameters

• **opts**

• **opts.batch**

• **opts.coreManager**: [`CoreManager`](CoreManager.md)

• **opts.namespace**: `TNamespace`

• **opts.reindex**: `boolean`

• **opts.storage**: `StorageParam`

#### Returns

[`DataStore`](DataStore.md)\<`TNamespace`, `TSchemaName`\>

#### Overrides

`TypedEmitter.constructor`

## Accessors

### indexer

> `get` **indexer**(): `MultiCoreIndexer`\<`"binary"`\>

#### Returns

`MultiCoreIndexer`\<`"binary"`\>

***

### namespace

> `get` **namespace**(): `TNamespace`

#### Returns

`TNamespace`

***

### schemas

> `get` **schemas**(): (`"track"` \| `"remoteDetectionAlert"` \| `"observation"`)[] \| (`"translation"` \| `"projectSettings"` \| `"preset"` \| `"icon"` \| `"field"` \| `"deviceInfo"`)[] \| (`"role"` \| `"coreOwnership"`)[]

#### Returns

(`"track"` \| `"remoteDetectionAlert"` \| `"observation"`)[] \| (`"translation"` \| `"projectSettings"` \| `"preset"` \| `"icon"` \| `"field"` \| `"deviceInfo"`)[] \| (`"role"` \| `"coreOwnership"`)[]

***

### writerCore

> `get` **writerCore**(): [`Core`](../type-aliases/Core.md)

#### Returns

[`Core`](../type-aliases/Core.md)

## Methods

### close()

> **close**(): `Promise`\<`void`\>

#### Returns

`Promise`\<`void`\>

***

### read()

> **read**(`versionId`): `Promise`\<`MapeoDoc`\>

#### Parameters

• **versionId**: `string`

#### Returns

`Promise`\<`MapeoDoc`\>

***

### readRaw()

> **readRaw**(`versionId`): `Promise`\<`Buffer`\>

#### Parameters

• **versionId**: `string`

#### Returns

`Promise`\<`Buffer`\>

***

### unlink()

> **unlink**(): `Promise`\<`void`\>

Unlink all index files. This should only be called after `close()` has resolved.

#### Returns

`Promise`\<`void`\>

***

### write()

> **write**\<`TDoc`\>(`doc`): `Promise`\<`Extract`\<`object`, `TDoc`\> \| `Extract`\<`object`, `TDoc`\> \| `Extract`\<`object`, `TDoc`\> \| `Extract`\<`object`, `TDoc`\> \| `Extract`\<`object`, `TDoc`\> \| `Extract`\<`object`, `TDoc`\> \| `Extract`\<`object`, `TDoc`\> \| `Extract`\<`object`, `TDoc`\> \| `Extract`\<`object`, `TDoc`\> \| `Extract`\<`object`, `TDoc`\> \| `Extract`\<`object`, `TDoc`\>\>

UNSAFE: Does not check links: [] refer to a valid doc - should only be used
internally.

Write a doc, must be one of the schema types supported by the namespace of
this DataStore.

#### Type Parameters

• **TDoc** *extends* `object` & `Omit`\<`object`, `"versionId"` \| `"originalVersionId"` \| `"links"`\> & `object` \| `object` & `Omit`\<`object`, `"versionId"` \| `"originalVersionId"` \| `"links"`\> & `object` \| `object` & `Omit`\<`object`, `"versionId"` \| `"originalVersionId"` \| `"links"`\> & `object` \| `object` & `Omit`\<`object`, `"versionId"` \| `"originalVersionId"` \| `"links"`\> & `object` \| `object` & `Omit`\<`object`, `"versionId"` \| `"originalVersionId"` \| `"links"`\> & `object` \| `object` & `Omit`\<`object`, `"versionId"` \| `"originalVersionId"` \| `"links"`\> & `object` \| `object` & `Omit`\<`object`, `"versionId"` \| `"originalVersionId"` \| `"links"`\> & `object` \| `object` & `Omit`\<`object`, `"versionId"` \| `"originalVersionId"` \| `"links"`\> & `object` \| `object` & `Omit`\<`object`, `"versionId"` \| `"originalVersionId"` \| `"links"`\> & `object` \| `object` & `Omit`\<`object`, `"versionId"` \| `"originalVersionId"` \| `"links"`\> & `object` \| `object` & `Omit`\<`object` & `CoreOwnershipSignatures`, `"versionId"` \| `"originalVersionId"` \| `"links"`\> & `object` \| `object` & `Omit`\<`object`, `"versionId"`\> \| `object` & `Omit`\<`object`, `"versionId"`\> \| `object` & `Omit`\<`object`, `"versionId"`\> \| `object` & `Omit`\<`object`, `"versionId"`\> \| `object` & `Omit`\<`object`, `"versionId"`\> \| `object` & `Omit`\<`object`, `"versionId"`\> \| `object` & `Omit`\<`object`, `"versionId"`\> \| `object` & `Omit`\<`object`, `"versionId"`\> \| `object` & `Omit`\<`object`, `"versionId"`\> \| `object` & `Omit`\<`object`, `"versionId"`\> \| `object` & `Omit`\<`object` & `CoreOwnershipSignatures`, `"versionId"`\>

#### Parameters

• **doc**: `TDoc`

#### Returns

`Promise`\<`Extract`\<`object`, `TDoc`\> \| `Extract`\<`object`, `TDoc`\> \| `Extract`\<`object`, `TDoc`\> \| `Extract`\<`object`, `TDoc`\> \| `Extract`\<`object`, `TDoc`\> \| `Extract`\<`object`, `TDoc`\> \| `Extract`\<`object`, `TDoc`\> \| `Extract`\<`object`, `TDoc`\> \| `Extract`\<`object`, `TDoc`\> \| `Extract`\<`object`, `TDoc`\> \| `Extract`\<`object`, `TDoc`\>\>

***

### writeRaw()

> **writeRaw**(`buf`): `Promise`\<`string`\>

#### Parameters

• **buf**: `Buffer`

#### Returns

`Promise`\<`string`\>
