[API](../README.md) / [\<internal\>](../modules/internal_.md) / Corestore

# Class: Corestore

[\<internal\>](../modules/internal_.md).Corestore

## Hierarchy

- `TypedEmitter`\<[`CorestoreEvents`](../interfaces/internal_.CorestoreEvents.md)\>

  ↳ **`Corestore`**

## Table of contents

### Constructors

- [constructor](internal_.Corestore.md#constructor)

### Properties

- [cores](internal_.Corestore.md#cores)
- [replicate](internal_.Corestore.md#replicate)

### Methods

- [close](internal_.Corestore.md#close)
- [get](internal_.Corestore.md#get)
- [namespace](internal_.Corestore.md#namespace)
- [ready](internal_.Corestore.md#ready)

## Constructors

### constructor

• **new Corestore**(`storage`, `options?`): [`Corestore`](internal_.Corestore.md)

#### Parameters

| Name | Type |
| :------ | :------ |
| `storage` | `HypercoreStorage` |
| `options?` | `Object` |
| `options.poolSize?` | `number` |
| `options.primaryKey?` | `Buffer` \| `Uint8Array` |

#### Returns

[`Corestore`](internal_.Corestore.md)

#### Overrides

TypedEmitter\&lt;CorestoreEvents\&gt;.constructor

#### Defined in

[types/corestore.d.ts:15](https://github.com/digidem/mapeo-core-next/blob/315dc9781d8d2f74f17b1fd651a3ae81272b7fac/types/corestore.d.ts#L15)

## Properties

### cores

• **cores**: `Map`\<`string`, `Hypercore`\<`ValueEncoding`, `Buffer`\>\>

#### Defined in

[types/corestore.d.ts:37](https://github.com/digidem/mapeo-core-next/blob/315dc9781d8d2f74f17b1fd651a3ae81272b7fac/types/corestore.d.ts#L37)

___

### replicate

• **replicate**: (`isInitiatorOrReplicationStream`: `boolean` \| `Duplex` \| `Duplex`\<`any`, `any`, `any`, `any`, ``true``, ``true``, `DuplexEvents`\<`any`, `any`\>\>, `opts?`: {}) => `ReplicationStream`(`protomux`: [`Protomux`](internal_.Protomux.md)\<`Duplex`\<`any`, `any`, `any`, `any`, ``true``, ``true``, `DuplexEvents`\<`any`, `any`\>\>\>, `opts?`: {}) => [`Protomux`](internal_.Protomux.md)\<`Duplex`\<`any`, `any`, `any`, `any`, ``true``, ``true``, `DuplexEvents`\<`any`, `any`\>\>\>

#### Type declaration

▸ (`isInitiatorOrReplicationStream`, `opts?`): `ReplicationStream`

##### Parameters

| Name | Type |
| :------ | :------ |
| `isInitiatorOrReplicationStream` | `boolean` \| `Duplex` \| `Duplex`\<`any`, `any`, `any`, `any`, ``true``, ``true``, `DuplexEvents`\<`any`, `any`\>\> |
| `opts?` | `Object` |

##### Returns

`ReplicationStream`

▸ (`protomux`, `opts?`): [`Protomux`](internal_.Protomux.md)\<`Duplex`\<`any`, `any`, `any`, `any`, ``true``, ``true``, `DuplexEvents`\<`any`, `any`\>\>\>

##### Parameters

| Name | Type |
| :------ | :------ |
| `protomux` | [`Protomux`](internal_.Protomux.md)\<`Duplex`\<`any`, `any`, `any`, `any`, ``true``, ``true``, `DuplexEvents`\<`any`, `any`\>\>\> |
| `opts?` | `Object` |

##### Returns

[`Protomux`](internal_.Protomux.md)\<`Duplex`\<`any`, `any`, `any`, `any`, ``true``, ``true``, `DuplexEvents`\<`any`, `any`\>\>\>

#### Defined in

[types/corestore.d.ts:33](https://github.com/digidem/mapeo-core-next/blob/315dc9781d8d2f74f17b1fd651a3ae81272b7fac/types/corestore.d.ts#L33)

## Methods

### close

▸ **close**(): `Promise`\<`void`\>

#### Returns

`Promise`\<`void`\>

#### Defined in

[types/corestore.d.ts:36](https://github.com/digidem/mapeo-core-next/blob/315dc9781d8d2f74f17b1fd651a3ae81272b7fac/types/corestore.d.ts#L36)

___

### get

▸ **get**(`key`): `Hypercore`\<`ValueEncoding`, `Buffer`\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `key` | `Buffer` \| `Uint8Array` |

#### Returns

`Hypercore`\<`ValueEncoding`, `Buffer`\>

#### Defined in

[types/corestore.d.ts:19](https://github.com/digidem/mapeo-core-next/blob/315dc9781d8d2f74f17b1fd651a3ae81272b7fac/types/corestore.d.ts#L19)

▸ **get**(`options`): `Hypercore`\<`ValueEncoding`, `Buffer`\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `options` | `Omit`\<`HypercoreOptions`\<``"binary"``, `undefined`\>, ``"keyPair"``\> & \{ `name`: `string`  } |

#### Returns

`Hypercore`\<`ValueEncoding`, `Buffer`\>

#### Defined in

[types/corestore.d.ts:20](https://github.com/digidem/mapeo-core-next/blob/315dc9781d8d2f74f17b1fd651a3ae81272b7fac/types/corestore.d.ts#L20)

▸ **get**(`options`): `Hypercore`\<`ValueEncoding`, `Buffer`\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `options` | `never` |

#### Returns

`Hypercore`\<`ValueEncoding`, `Buffer`\>

#### Defined in

[types/corestore.d.ts:23](https://github.com/digidem/mapeo-core-next/blob/315dc9781d8d2f74f17b1fd651a3ae81272b7fac/types/corestore.d.ts#L23)

▸ **get**(`options`): `Hypercore`\<`ValueEncoding`, `Buffer`\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `options` | `Omit`\<`HypercoreOptions`\<``"binary"``, `undefined`\>, ``"key"`` \| ``"keyPair"``\> & \{ `key?`: `string` \| `Buffer` ; `keyPair`: \{ `publicKey`: `Buffer` ; `secretKey?`: ``null`` \| `Buffer`  } ; `sparse?`: `boolean`  } |

#### Returns

`Hypercore`\<`ValueEncoding`, `Buffer`\>

#### Defined in

[types/corestore.d.ts:26](https://github.com/digidem/mapeo-core-next/blob/315dc9781d8d2f74f17b1fd651a3ae81272b7fac/types/corestore.d.ts#L26)

___

### namespace

▸ **namespace**(`name`): [`Corestore`](internal_.Corestore.md)

#### Parameters

| Name | Type |
| :------ | :------ |
| `name` | `string` |

#### Returns

[`Corestore`](internal_.Corestore.md)

#### Defined in

[types/corestore.d.ts:34](https://github.com/digidem/mapeo-core-next/blob/315dc9781d8d2f74f17b1fd651a3ae81272b7fac/types/corestore.d.ts#L34)

___

### ready

▸ **ready**(): `Promise`\<`void`\>

#### Returns

`Promise`\<`void`\>

#### Defined in

[types/corestore.d.ts:35](https://github.com/digidem/mapeo-core-next/blob/315dc9781d8d2f74f17b1fd651a3ae81272b7fac/types/corestore.d.ts#L35)
