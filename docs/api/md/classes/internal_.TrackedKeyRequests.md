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

___

### deleteByDiscoveryKey

▸ **deleteByDiscoveryKey**(`discoveryKey`): `boolean`

#### Parameters

| Name | Type |
| :------ | :------ |
| `discoveryKey` | `Buffer` |

#### Returns

`boolean`

___

### deleteByPeerKey

▸ **deleteByPeerKey**(`peerKey`): `void`

#### Parameters

| Name | Type |
| :------ | :------ |
| `peerKey` | `Buffer` |

#### Returns

`void`

___

### has

▸ **has**(`discoveryKey`): `boolean`

#### Parameters

| Name | Type |
| :------ | :------ |
| `discoveryKey` | `Buffer` |

#### Returns

`boolean`

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
