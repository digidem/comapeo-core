[API](../README.md) / [core-manager/random-access-file-pool](../modules/core_manager_random_access_file_pool.md) / RandomAccessFilePool

# Class: RandomAccessFilePool

[core-manager/random-access-file-pool](../modules/core_manager_random_access_file_pool.md).RandomAccessFilePool

File descriptor pool for random-access-storage to limit the number of file
descriptors used. Important particularly for Android where the hard limit for
the app is 1024.

## Table of contents

### Constructors

- [constructor](core_manager_random_access_file_pool.RandomAccessFilePool.md#constructor)

### Properties

- [active](core_manager_random_access_file_pool.RandomAccessFilePool.md#active)
- [maxSize](core_manager_random_access_file_pool.RandomAccessFilePool.md#maxsize)

### Methods

- [\_onactive](core_manager_random_access_file_pool.RandomAccessFilePool.md#_onactive)
- [\_oninactive](core_manager_random_access_file_pool.RandomAccessFilePool.md#_oninactive)

## Constructors

### constructor

• **new RandomAccessFilePool**(`maxSize`): [`RandomAccessFilePool`](core_manager_random_access_file_pool.RandomAccessFilePool.md)

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `maxSize` | `number` | max number of file descriptors to use |

#### Returns

[`RandomAccessFilePool`](core_manager_random_access_file_pool.RandomAccessFilePool.md)

#### Defined in

[src/core-manager/random-access-file-pool.js:8](https://github.com/digidem/mapeo-core-next/blob/53dc843a45bb963f7a880f5f7973107d5b1fb99c/src/core-manager/random-access-file-pool.js#L8)

## Properties

### active

• **active**: `Set`\<`RandomAccessFile`\>

#### Defined in

[src/core-manager/random-access-file-pool.js:11](https://github.com/digidem/mapeo-core-next/blob/53dc843a45bb963f7a880f5f7973107d5b1fb99c/src/core-manager/random-access-file-pool.js#L11)

___

### maxSize

• **maxSize**: `number`

#### Defined in

[src/core-manager/random-access-file-pool.js:9](https://github.com/digidem/mapeo-core-next/blob/53dc843a45bb963f7a880f5f7973107d5b1fb99c/src/core-manager/random-access-file-pool.js#L9)

## Methods

### \_onactive

▸ **_onactive**(`file`): `void`

#### Parameters

| Name | Type |
| :------ | :------ |
| `file` | `RandomAccessFile` |

#### Returns

`void`

#### Defined in

[src/core-manager/random-access-file-pool.js:15](https://github.com/digidem/mapeo-core-next/blob/53dc843a45bb963f7a880f5f7973107d5b1fb99c/src/core-manager/random-access-file-pool.js#L15)

___

### \_oninactive

▸ **_oninactive**(`file`): `void`

#### Parameters

| Name | Type |
| :------ | :------ |
| `file` | `RandomAccessFile` |

#### Returns

`void`

#### Defined in

[src/core-manager/random-access-file-pool.js:27](https://github.com/digidem/mapeo-core-next/blob/53dc843a45bb963f7a880f5f7973107d5b1fb99c/src/core-manager/random-access-file-pool.js#L27)
