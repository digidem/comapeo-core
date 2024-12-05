[**API**](../../README.md) • **Docs**

***

[API](../../README.md) / [\<internal\>](../README.md) / CoreIndex

# Class: CoreIndex

An in-memory index of open cores.

## Constructors

### new CoreIndex()

> **new CoreIndex**(): [`CoreIndex`](CoreIndex.md)

#### Returns

[`CoreIndex`](CoreIndex.md)

## Methods

### \[iterator\]()

> **\[iterator\]**(): `MapIterator`\<[`CoreRecord`](../type-aliases/CoreRecord.md)\>

#### Returns

`MapIterator`\<[`CoreRecord`](../type-aliases/CoreRecord.md)\>

***

### add()

> **add**(`options`): `void`

NB. Need to pass key here because `core.key` is not populated until the
core is ready, but we know it beforehand.

#### Parameters

• **options**

• **options.core**: `Hypercore`\<`"binary"`, `Buffer`\>

Hypercore instance

• **options.key**: `Buffer`

Buffer containing public key of this core

• **options.namespace**: `"auth"` \| `"config"` \| `"data"` \| `"blobIndex"` \| `"blob"`

• **options.writer**: `undefined` \| `boolean` = `false`

Is this a writer core?

#### Returns

`void`

***

### getByCoreKey()

> **getByCoreKey**(`coreKey`): `undefined` \| [`CoreRecord`](../type-aliases/CoreRecord.md)

Get a core by its public key

#### Parameters

• **coreKey**: `Buffer`

#### Returns

`undefined` \| [`CoreRecord`](../type-aliases/CoreRecord.md)

***

### getByDiscoveryId()

> **getByDiscoveryId**(`discoveryId`): `undefined` \| [`CoreRecord`](../type-aliases/CoreRecord.md)

Get a core by its discoveryId (discover key as hex string)

#### Parameters

• **discoveryId**: `string`

#### Returns

`undefined` \| [`CoreRecord`](../type-aliases/CoreRecord.md)

***

### getByNamespace()

> **getByNamespace**(`namespace`): [`CoreRecord`](../type-aliases/CoreRecord.md)[]

Get all known cores in a namespace

#### Parameters

• **namespace**: `"auth"` \| `"config"` \| `"data"` \| `"blobIndex"` \| `"blob"`

#### Returns

[`CoreRecord`](../type-aliases/CoreRecord.md)[]

***

### getWriter()

> **getWriter**(`namespace`): [`CoreRecord`](../type-aliases/CoreRecord.md)

Get the write core for the given namespace

#### Parameters

• **namespace**: `"auth"` \| `"config"` \| `"data"` \| `"blobIndex"` \| `"blob"`

#### Returns

[`CoreRecord`](../type-aliases/CoreRecord.md)
