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

## Properties

### cores

• **cores**: `Map`\<`string`, `Hypercore`\<`ValueEncoding`, `Buffer`\>\>

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

## Methods

### close

▸ **close**(): `Promise`\<`void`\>

#### Returns

`Promise`\<`void`\>

___

### get

▸ **get**(`key`): `Hypercore`\<`ValueEncoding`, `Buffer`\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `key` | `Buffer` \| `Uint8Array` |

#### Returns

`Hypercore`\<`ValueEncoding`, `Buffer`\>

▸ **get**(`options`): `Hypercore`\<`ValueEncoding`, `Buffer`\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `options` | `Omit`\<`HypercoreOptions`\<``"binary"``, `undefined`\>, ``"keyPair"``\> & \{ `name`: `string`  } |

#### Returns

`Hypercore`\<`ValueEncoding`, `Buffer`\>

▸ **get**(`options`): `Hypercore`\<`ValueEncoding`, `Buffer`\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `options` | `never` |

#### Returns

`Hypercore`\<`ValueEncoding`, `Buffer`\>

▸ **get**(`options`): `Hypercore`\<`ValueEncoding`, `Buffer`\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `options` | `Omit`\<`HypercoreOptions`\<``"binary"``, `undefined`\>, ``"key"`` \| ``"keyPair"``\> & \{ `key?`: `string` \| `Buffer` ; `keyPair`: \{ `publicKey`: `Buffer` ; `secretKey?`: ``null`` \| `Buffer`  } ; `sparse?`: `boolean`  } |

#### Returns

`Hypercore`\<`ValueEncoding`, `Buffer`\>

___

### namespace

▸ **namespace**(`name`): [`Corestore`](internal_.Corestore.md)

#### Parameters

| Name | Type |
| :------ | :------ |
| `name` | `string` |

#### Returns

[`Corestore`](internal_.Corestore.md)

___

### ready

▸ **ready**(): `Promise`\<`void`\>

#### Returns

`Promise`\<`void`\>
