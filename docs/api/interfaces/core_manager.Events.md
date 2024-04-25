[API](../README.md) / [core-manager](../modules/core_manager.md) / Events

# Interface: Events\<\>

[core-manager](../modules/core_manager.md).Events

## Table of contents

### Properties

- [add-core](core_manager.Events.md#add-core)
- [peer-have](core_manager.Events.md#peer-have)

## Properties

### add-core

• **add-core**: (`coreRecord`: [`CoreRecord`](../modules/core_manager_core_index.md#corerecord)) => `void`

#### Type declaration

▸ (`coreRecord`): `void`

##### Parameters

| Name | Type |
| :------ | :------ |
| `coreRecord` | [`CoreRecord`](../modules/core_manager_core_index.md#corerecord) |

##### Returns

`void`

#### Defined in

[src/core-manager/index.js:25](https://github.com/digidem/mapeo-core-next/blob/53dc843a45bb963f7a880f5f7973107d5b1fb99c/src/core-manager/index.js#L25)

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

[src/core-manager/index.js:26](https://github.com/digidem/mapeo-core-next/blob/53dc843a45bb963f7a880f5f7973107d5b1fb99c/src/core-manager/index.js#L26)
