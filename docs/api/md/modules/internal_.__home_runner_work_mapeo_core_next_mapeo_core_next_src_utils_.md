[API](../README.md) / [\<internal\>](internal_.md) / "/home/runner/work/mapeo-core-next/mapeo-core-next/src/utils"

# Namespace: "/home/runner/work/mapeo-core-next/mapeo-core-next/src/utils"

[\<internal\>](internal_.md)."/home/runner/work/mapeo-core-next/mapeo-core-next/src/utils"

## Table of contents

### References

- [OpenedNoiseStream](internal_.__home_runner_work_mapeo_core_next_mapeo_core_next_src_utils_.md#openednoisestream)

### Classes

- [ExhaustivenessError](../classes/internal_.__home_runner_work_mapeo_core_next_mapeo_core_next_src_utils_.ExhaustivenessError.md)

### Type Aliases

- [DestroyedNoiseStream](internal_.__home_runner_work_mapeo_core_next_mapeo_core_next_src_utils_.md#destroyednoisestream)
- [NoiseStream](internal_.__home_runner_work_mapeo_core_next_mapeo_core_next_src_utils_.md#noisestream)

### Functions

- [assert](internal_.__home_runner_work_mapeo_core_next_mapeo_core_next_src_utils_.md#assert)
- [createMap](internal_.__home_runner_work_mapeo_core_next_mapeo_core_next_src_utils_.md#createmap)
- [deNullify](internal_.__home_runner_work_mapeo_core_next_mapeo_core_next_src_utils_.md#denullify)
- [getDeviceId](internal_.__home_runner_work_mapeo_core_next_mapeo_core_next_src_utils_.md#getdeviceid)
- [hashObject](internal_.__home_runner_work_mapeo_core_next_mapeo_core_next_src_utils_.md#hashobject)
- [idToKey](internal_.__home_runner_work_mapeo_core_next_mapeo_core_next_src_utils_.md#idtokey)
- [keyToId](internal_.__home_runner_work_mapeo_core_next_mapeo_core_next_src_utils_.md#keytoid)
- [noop](internal_.__home_runner_work_mapeo_core_next_mapeo_core_next_src_utils_.md#noop)
- [openedNoiseSecretStream](internal_.__home_runner_work_mapeo_core_next_mapeo_core_next_src_utils_.md#openednoisesecretstream)
- [parseVersion](internal_.__home_runner_work_mapeo_core_next_mapeo_core_next_src_utils_.md#parseversion)
- [projectIdToNonce](internal_.__home_runner_work_mapeo_core_next_mapeo_core_next_src_utils_.md#projectidtononce)
- [projectKeyToId](internal_.__home_runner_work_mapeo_core_next_mapeo_core_next_src_utils_.md#projectkeytoid)
- [projectKeyToPublicId](internal_.__home_runner_work_mapeo_core_next_mapeo_core_next_src_utils_.md#projectkeytopublicid)
- [setHas](internal_.__home_runner_work_mapeo_core_next_mapeo_core_next_src_utils_.md#sethas)
- [valueOf](internal_.__home_runner_work_mapeo_core_next_mapeo_core_next_src_utils_.md#valueof)

## References

### OpenedNoiseStream

Re-exports [OpenedNoiseStream](internal_.md#openednoisestream)

## Type Aliases

### DestroyedNoiseStream

Ƭ **DestroyedNoiseStream**\<\>: [`NoiseStream`](internal_.__home_runner_work_mapeo_core_next_mapeo_core_next_src_utils_.md#noisestream) & \{ `destroyed`: ``true``  }

___

### NoiseStream

Ƭ **NoiseStream**\<\>: `__module`

## Functions

### assert

▸ **assert**(`condition`, `message`): asserts condition

#### Parameters

| Name | Type |
| :------ | :------ |
| `condition` | `unknown` |
| `message` | `string` |

#### Returns

asserts condition

___

### createMap

▸ **createMap**\<`K`, `V`\>(`keys`, `value`): `Record`\<`K`, `V` extends () => `T` ? `T` : `V`\>

Small helper to create a typed map

#### Type parameters

| Name | Type |
| :------ | :------ |
| `K` | extends `string` |
| `V` | extends `unknown` |

#### Parameters

| Name | Type |
| :------ | :------ |
| `keys` | readonly `K`[] |
| `value` | `V` |

#### Returns

`Record`\<`K`, `V` extends () => `T` ? `T` : `V`\>

___

### deNullify

▸ **deNullify**\<`T`\>(`obj`): \{ [KeyType in string \| number \| symbol]: RemoveNull\<\{ [KeyType in string \| number \| symbol]: (\{ [KeyType in string \| number \| symbol as Filter\<KeyType, \{ [Key in (...) \| (...) \| (...)]: (...) extends (...) ? (...) : (...) }[keyof T]\>]: T[KeyType] } & Partial\<Pick\<T, \{ [Key in (...) \| (...) \| (...)]: (...) extends (...) ? (...) : (...) }[keyof T]\>\>)[KeyType] }\>[KeyType] }

When reading from SQLite, any optional properties are set to `null`. This
converts `null` back to `undefined` to match the input types (e.g. the types
defined in @mapeo/schema)

#### Type parameters

| Name | Type |
| :------ | :------ |
| `T` | extends `Object` |

#### Parameters

| Name | Type |
| :------ | :------ |
| `obj` | `T` |

#### Returns

\{ [KeyType in string \| number \| symbol]: RemoveNull\<\{ [KeyType in string \| number \| symbol]: (\{ [KeyType in string \| number \| symbol as Filter\<KeyType, \{ [Key in (...) \| (...) \| (...)]: (...) extends (...) ? (...) : (...) }[keyof T]\>]: T[KeyType] } & Partial\<Pick\<T, \{ [Key in (...) \| (...) \| (...)]: (...) extends (...) ? (...) : (...) }[keyof T]\>\>)[KeyType] }\>[KeyType] }

___

### getDeviceId

▸ **getDeviceId**(`keyManager`): `string`

#### Parameters

| Name | Type |
| :------ | :------ |
| `keyManager` | `KeyManager` |

#### Returns

`string`

___

### hashObject

▸ **hashObject**(`obj`): `string`

create a sha256 hash of an object using json-stable-stringify for deterministic results

#### Parameters

| Name | Type |
| :------ | :------ |
| `obj` | `Object` |

#### Returns

`string`

hash of the object

___

### idToKey

▸ **idToKey**(`id`): `Buffer` \| `Uint8Array`

#### Parameters

| Name | Type |
| :------ | :------ |
| `id` | `string` \| `Buffer` |

#### Returns

`Buffer` \| `Uint8Array`

___

### keyToId

▸ **keyToId**(`key`): `string`

#### Parameters

| Name | Type |
| :------ | :------ |
| `key` | `string` \| `Buffer` |

#### Returns

`string`

___

### noop

▸ **noop**(): `void`

#### Returns

`void`

___

### openedNoiseSecretStream

▸ **openedNoiseSecretStream**(`stream`): `Promise`\<[`DestroyedNoiseStream`](internal_.__home_runner_work_mapeo_core_next_mapeo_core_next_src_utils_.md#destroyednoisestream) \| [`OpenedNoiseStream`](internal_.md#openednoisestream)\<`Duplex` \| `Duplex`\<`any`, `any`, `any`, `any`, ``true``, ``true``, `DuplexEvents`\<`any`, `any`\>\>\>\>

Utility to await a NoiseSecretStream to open, that returns a stream with the
correct types for publicKey and remotePublicKey (which can be null before
stream is opened)

#### Parameters

| Name | Type |
| :------ | :------ |
| `stream` | `NoiseSecretStream`\<`any`\> |

#### Returns

`Promise`\<[`DestroyedNoiseStream`](internal_.__home_runner_work_mapeo_core_next_mapeo_core_next_src_utils_.md#destroyednoisestream) \| [`OpenedNoiseStream`](internal_.md#openednoisestream)\<`Duplex` \| `Duplex`\<`any`, `any`, `any`, `any`, ``true``, ``true``, `DuplexEvents`\<`any`, `any`\>\>\>\>

___

### parseVersion

▸ **parseVersion**(`version`): `Object`

#### Parameters

| Name | Type |
| :------ | :------ |
| `version` | `string` |

#### Returns

`Object`

| Name | Type |
| :------ | :------ |
| `blockIndex` | `number` |
| `coreId` | `string` |

___

### projectIdToNonce

▸ **projectIdToNonce**(`projectId`): `Buffer`

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `projectId` | `string` | Project internal ID |

#### Returns

`Buffer`

24-byte nonce (same length as sodium.crypto_aead_xchacha20poly1305_ietf_NPUBBYTES)

___

### projectKeyToId

▸ **projectKeyToId**(`projectKey`): `string`

Create an internal ID from a project key

#### Parameters

| Name | Type |
| :------ | :------ |
| `projectKey` | `Buffer` |

#### Returns

`string`

___

### projectKeyToPublicId

▸ **projectKeyToPublicId**(`projectKey`): `string`

Create a public ID from a project key

#### Parameters

| Name | Type |
| :------ | :------ |
| `projectKey` | `Buffer` |

#### Returns

`string`

___

### setHas

▸ **setHas**\<`T`\>(`set`): (`value`: `unknown`) => value is T

Return a function that itself returns whether a value is part of the set.

Similar to binding `Set.prototype.has`, but (1) is shorter (2) refines the type.

#### Type parameters

| Name |
| :------ |
| `T` |

#### Parameters

| Name | Type |
| :------ | :------ |
| `set` | `Readonly`\<`Set`\<`T`\>\> |

#### Returns

`fn`

▸ (`value`): value is T

##### Parameters

| Name | Type |
| :------ | :------ |
| `value` | `unknown` |

##### Returns

value is T

**`Example`**

```ts
const mySet = new Set([1, 2, 3])
const isInMySet = setHas(mySet)

console.log(isInMySet(2))
// => true
```

___

### valueOf

▸ **valueOf**\<`T`\>(`doc`): `Omit`\<`T`, ``"docId"`` \| ``"versionId"`` \| ``"links"`` \| ``"forks"`` \| ``"createdAt"`` \| ``"updatedAt"`` \| ``"createdBy"`` \| ``"deleted"``\>

#### Type parameters

| Name | Type |
| :------ | :------ |
| `T` | extends `MapeoDoc` & \{ `forks?`: `string`[]  } |

#### Parameters

| Name | Type |
| :------ | :------ |
| `doc` | `T` |

#### Returns

`Omit`\<`T`, ``"docId"`` \| ``"versionId"`` \| ``"links"`` \| ``"forks"`` \| ``"createdAt"`` \| ``"updatedAt"`` \| ``"createdBy"`` \| ``"deleted"``\>
