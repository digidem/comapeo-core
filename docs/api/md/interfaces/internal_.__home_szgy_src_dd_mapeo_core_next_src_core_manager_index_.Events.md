[API](../README.md) / [\<internal\>](../modules/internal_.md) / ["/home/szgy/src/dd/mapeo-core-next/src/core-manager/index"](../modules/internal_.__home_szgy_src_dd_mapeo_core_next_src_core_manager_index_.md) / Events

# Interface: Events\<\>

[\<internal\>](../modules/internal_.md).["/home/szgy/src/dd/mapeo-core-next/src/core-manager/index"](../modules/internal_.__home_szgy_src_dd_mapeo_core_next_src_core_manager_index_.md).Events

## Table of contents

### Properties

- [add-core](internal_.__home_szgy_src_dd_mapeo_core_next_src_core_manager_index_.Events.md#add-core)
- [peer-have](internal_.__home_szgy_src_dd_mapeo_core_next_src_core_manager_index_.Events.md#peer-have)

## Properties

### add-core

• **add-core**: (`coreRecord`: [`CoreRecord`](../modules/internal_.md#corerecord)) => `void`

#### Type declaration

▸ (`coreRecord`): `void`

##### Parameters

| Name | Type |
| :------ | :------ |
| `coreRecord` | [`CoreRecord`](../modules/internal_.md#corerecord) |

##### Returns

`void`

#### Defined in

[src/core-manager/index.js:25](https://github.com/digidem/mapeo-core-next/blob/315dc9781d8d2f74f17b1fd651a3ae81272b7fac/src/core-manager/index.js#L25)

___

### peer-have

• **peer-have**: (`namespace`: ``"blob"`` \| ``"auth"`` \| ``"config"`` \| ``"data"`` \| ``"blobIndex"``, `msg`: \{ `bitfield`: `Uint32Array` ; `coreDiscoveryId`: `string` ; `peerId`: `string` ; `start`: `number`  }) => `void`

#### Type declaration

▸ (`namespace`, `msg`): `void`

##### Parameters

| Name | Type |
| :------ | :------ |
| `namespace` | ``"blob"`` \| ``"auth"`` \| ``"config"`` \| ``"data"`` \| ``"blobIndex"`` |
| `msg` | `Object` |
| `msg.bitfield` | `Uint32Array` |
| `msg.coreDiscoveryId` | `string` |
| `msg.peerId` | `string` |
| `msg.start` | `number` |

##### Returns

`void`

#### Defined in

[src/core-manager/index.js:26](https://github.com/digidem/mapeo-core-next/blob/315dc9781d8d2f74f17b1fd651a3ae81272b7fac/src/core-manager/index.js#L26)
