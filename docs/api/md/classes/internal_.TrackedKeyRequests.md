[API](../README.md) / [\<internal\>](../modules/internal_.md) / TrackedKeyRequests

# Class: TrackedKeyRequests

[\<internal\>](../modules/internal_.md).TrackedKeyRequests

## Table of contents

### Constructors

- [constructor](internal_.TrackedKeyRequests.md#constructor)

### Methods

- [clear](internal_.TrackedKeyRequests.md#clear)
- [deleteByDiscoveryKey](internal_.TrackedKeyRequests.md#deletebydiscoverykey)
- [deleteByPeerKey](internal_.TrackedKeyRequests.md#deletebypeerkey)
- [has](internal_.TrackedKeyRequests.md#has)
- [set](internal_.TrackedKeyRequests.md#set)

## Constructors

### constructor

• **new TrackedKeyRequests**(): [`TrackedKeyRequests`](internal_.TrackedKeyRequests.md)

#### Returns

[`TrackedKeyRequests`](internal_.TrackedKeyRequests.md)

## Methods

### clear

▸ **clear**(): `void`

#### Returns

`void`

#### Defined in

[src/core-manager/index.js:614](https://github.com/digidem/mapeo-core-next/blob/315dc9781d8d2f74f17b1fd651a3ae81272b7fac/src/core-manager/index.js#L614)

___

### deleteByDiscoveryKey

▸ **deleteByDiscoveryKey**(`discoveryKey`): `boolean`

#### Parameters

| Name | Type |
| :------ | :------ |
| `discoveryKey` | `Buffer` |

#### Returns

`boolean`

#### Defined in

[src/core-manager/index.js:591](https://github.com/digidem/mapeo-core-next/blob/315dc9781d8d2f74f17b1fd651a3ae81272b7fac/src/core-manager/index.js#L591)

___

### deleteByPeerKey

▸ **deleteByPeerKey**(`peerKey`): `void`

#### Parameters

| Name | Type |
| :------ | :------ |
| `peerKey` | `Buffer` |

#### Returns

`void`

#### Defined in

[src/core-manager/index.js:605](https://github.com/digidem/mapeo-core-next/blob/315dc9781d8d2f74f17b1fd651a3ae81272b7fac/src/core-manager/index.js#L605)

___

### has

▸ **has**(`discoveryKey`): `boolean`

#### Parameters

| Name | Type |
| :------ | :------ |
| `discoveryKey` | `Buffer` |

#### Returns

`boolean`

#### Defined in

[src/core-manager/index.js:584](https://github.com/digidem/mapeo-core-next/blob/315dc9781d8d2f74f17b1fd651a3ae81272b7fac/src/core-manager/index.js#L584)

___

### set

▸ **set**(`discoveryKey`, `peerKey`): [`TrackedKeyRequests`](internal_.TrackedKeyRequests.md)

#### Parameters

| Name | Type |
| :------ | :------ |
| `discoveryKey` | `Buffer` |
| `peerKey` | `Buffer` |

#### Returns

[`TrackedKeyRequests`](internal_.TrackedKeyRequests.md)

#### Defined in

[src/core-manager/index.js:572](https://github.com/digidem/mapeo-core-next/blob/315dc9781d8d2f74f17b1fd651a3ae81272b7fac/src/core-manager/index.js#L572)
