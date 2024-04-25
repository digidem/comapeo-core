[API](../README.md) / [mapeo-manager](../modules/mapeo_manager.md) / MapeoManagerEvents

# Interface: MapeoManagerEvents\<\>

[mapeo-manager](../modules/mapeo_manager.md).MapeoManagerEvents

## Table of contents

### Properties

- [local-peers](mapeo_manager.MapeoManagerEvents.md#local-peers)

## Properties

### local-peers

• **local-peers**: (`peers`: [`PublicPeerInfo`](../modules/mapeo_manager.md#publicpeerinfo)[]) => `void`

Emitted when the list of connected peers changes (new ones added, or connection status changes)

#### Type declaration

▸ (`peers`): `void`

##### Parameters

| Name | Type |
| :------ | :------ |
| `peers` | [`PublicPeerInfo`](../modules/mapeo_manager.md#publicpeerinfo)[] |

##### Returns

`void`

#### Defined in

[src/mapeo-manager.js:70](https://github.com/digidem/mapeo-core-next/blob/53dc843a45bb963f7a880f5f7973107d5b1fb99c/src/mapeo-manager.js#L70)
