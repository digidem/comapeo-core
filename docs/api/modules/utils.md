[API](../README.md) / utils

# Module: utils

## Table of contents

### Classes

- [ExhaustivenessError](../classes/utils.ExhaustivenessError.md)

### Type Aliases

- [DestroyedNoiseStream](utils.md#destroyednoisestream)
- [NoiseStream](utils.md#noisestream)
- [OpenedNoiseStream](utils.md#openednoisestream)

### Functions

- [assert](utils.md#assert)
- [createMap](utils.md#createmap)
- [deNullify](utils.md#denullify)
- [getDeviceId](utils.md#getdeviceid)
- [idToKey](utils.md#idtokey)
- [keyToId](utils.md#keytoid)
- [noop](utils.md#noop)
- [openedNoiseSecretStream](utils.md#openednoisesecretstream)
- [parseVersion](utils.md#parseversion)
- [projectIdToNonce](utils.md#projectidtononce)
- [projectKeyToId](utils.md#projectkeytoid)
- [projectKeyToPublicId](utils.md#projectkeytopublicid)
- [setHas](utils.md#sethas)
- [valueOf](utils.md#valueof)

## Type Aliases

### DestroyedNoiseStream

Ƭ **DestroyedNoiseStream**\<\>: [`NoiseStream`](utils.md#noisestream) & \{ `destroyed`: ``true``  }

#### Defined in

[src/utils.js:42](https://github.com/digidem/mapeo-core-next/blob/53dc843a45bb963f7a880f5f7973107d5b1fb99c/src/utils.js#L42)

___

### NoiseStream

Ƭ **NoiseStream**\<\>: `__module`

#### Defined in

[src/utils.js:41](https://github.com/digidem/mapeo-core-next/blob/53dc843a45bb963f7a880f5f7973107d5b1fb99c/src/utils.js#L41)

___

### OpenedNoiseStream

Ƭ **OpenedNoiseStream**\<`T`\>: `__module` & \{ `handshake`: `Buffer` ; `publicKey`: `Buffer` ; `remotePublicKey`: `Buffer`  }

#### Type parameters

| Name | Type |
| :------ | :------ |
| `T` | extends `Duplex` \| `Duplex` = `Duplex` \| `Duplex` |

#### Defined in

[src/utils.js:45](https://github.com/digidem/mapeo-core-next/blob/53dc843a45bb963f7a880f5f7973107d5b1fb99c/src/utils.js#L45)

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

#### Defined in

[src/utils.js:79](https://github.com/digidem/mapeo-core-next/blob/53dc843a45bb963f7a880f5f7973107d5b1fb99c/src/utils.js#L79)

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

#### Defined in

[src/utils.js:187](https://github.com/digidem/mapeo-core-next/blob/53dc843a45bb963f7a880f5f7973107d5b1fb99c/src/utils.js#L187)

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

#### Defined in

[src/utils.js:114](https://github.com/digidem/mapeo-core-next/blob/53dc843a45bb963f7a880f5f7973107d5b1fb99c/src/utils.js#L114)

___

### getDeviceId

▸ **getDeviceId**(`keyManager`): `string`

#### Parameters

| Name | Type |
| :------ | :------ |
| `keyManager` | `KeyManager` |

#### Returns

`string`

#### Defined in

[src/utils.js:175](https://github.com/digidem/mapeo-core-next/blob/53dc843a45bb963f7a880f5f7973107d5b1fb99c/src/utils.js#L175)

___

### idToKey

▸ **idToKey**(`id`): `Buffer` \| `Uint8Array`

#### Parameters

| Name | Type |
| :------ | :------ |
| `id` | `string` \| `Buffer` |

#### Returns

`Buffer` \| `Uint8Array`

#### Defined in

[src/utils.js:8](https://github.com/digidem/mapeo-core-next/blob/53dc843a45bb963f7a880f5f7973107d5b1fb99c/src/utils.js#L8)

___

### keyToId

▸ **keyToId**(`key`): `string`

#### Parameters

| Name | Type |
| :------ | :------ |
| `key` | `string` \| `Buffer` |

#### Returns

`string`

#### Defined in

[src/utils.js:21](https://github.com/digidem/mapeo-core-next/blob/53dc843a45bb963f7a880f5f7973107d5b1fb99c/src/utils.js#L21)

___

### noop

▸ **noop**(): `void`

#### Returns

`void`

#### Defined in

[src/utils.js:72](https://github.com/digidem/mapeo-core-next/blob/53dc843a45bb963f7a880f5f7973107d5b1fb99c/src/utils.js#L72)

___

### openedNoiseSecretStream

▸ **openedNoiseSecretStream**(`stream`): `Promise`\<[`DestroyedNoiseStream`](utils.md#destroyednoisestream) \| [`OpenedNoiseStream`](utils.md#openednoisestream)\<`Duplex` \| `Duplex`\<`any`, `any`, `any`, `any`, ``true``, ``true``, `DuplexEvents`\<`any`, `any`\>\>\>\>

Utility to await a NoiseSecretStream to open, that returns a stream with the
correct types for publicKey and remotePublicKey (which can be null before
stream is opened)

#### Parameters

| Name | Type |
| :------ | :------ |
| `stream` | `NoiseSecretStream`\<`any`\> |

#### Returns

`Promise`\<[`DestroyedNoiseStream`](utils.md#destroyednoisestream) \| [`OpenedNoiseStream`](utils.md#openednoisestream)\<`Duplex` \| `Duplex`\<`any`, `any`, `any`, `any`, ``true``, ``true``, `DuplexEvents`\<`any`, `any`\>\>\>\>

#### Defined in

[src/utils.js:56](https://github.com/digidem/mapeo-core-next/blob/53dc843a45bb963f7a880f5f7973107d5b1fb99c/src/utils.js#L56)

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

#### Defined in

[src/utils.js:33](https://github.com/digidem/mapeo-core-next/blob/53dc843a45bb963f7a880f5f7973107d5b1fb99c/src/utils.js#L33)

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

#### Defined in

[src/utils.js:167](https://github.com/digidem/mapeo-core-next/blob/53dc843a45bb963f7a880f5f7973107d5b1fb99c/src/utils.js#L167)

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

#### Defined in

[src/utils.js:150](https://github.com/digidem/mapeo-core-next/blob/53dc843a45bb963f7a880f5f7973107d5b1fb99c/src/utils.js#L150)

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

#### Defined in

[src/utils.js:159](https://github.com/digidem/mapeo-core-next/blob/53dc843a45bb963f7a880f5f7973107d5b1fb99c/src/utils.js#L159)

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

#### Defined in

[src/utils.js:97](https://github.com/digidem/mapeo-core-next/blob/53dc843a45bb963f7a880f5f7973107d5b1fb99c/src/utils.js#L97)

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

#### Defined in

[src/utils.js:128](https://github.com/digidem/mapeo-core-next/blob/53dc843a45bb963f7a880f5f7973107d5b1fb99c/src/utils.js#L128)
