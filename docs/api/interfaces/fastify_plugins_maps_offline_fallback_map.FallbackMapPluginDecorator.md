[API](../README.md) / [fastify-plugins/maps/offline-fallback-map](../modules/fastify_plugins_maps_offline_fallback_map.md) / FallbackMapPluginDecorator

# Interface: FallbackMapPluginDecorator\<\>

[fastify-plugins/maps/offline-fallback-map](../modules/fastify_plugins_maps_offline_fallback_map.md).FallbackMapPluginDecorator

## Table of contents

### Properties

- [getResolvedStyleJson](fastify_plugins_maps_offline_fallback_map.FallbackMapPluginDecorator.md#getresolvedstylejson)
- [getStyleJsonStats](fastify_plugins_maps_offline_fallback_map.FallbackMapPluginDecorator.md#getstylejsonstats)

## Properties

### getResolvedStyleJson

• **getResolvedStyleJson**: (`serverAddress`: `string`) => `Promise`\<`any`\>

#### Type declaration

▸ (`serverAddress`): `Promise`\<`any`\>

##### Parameters

| Name | Type |
| :------ | :------ |
| `serverAddress` | `string` |

##### Returns

`Promise`\<`any`\>

#### Defined in

[src/fastify-plugins/maps/offline-fallback-map.js:28](https://github.com/digidem/mapeo-core-next/blob/53dc843a45bb963f7a880f5f7973107d5b1fb99c/src/fastify-plugins/maps/offline-fallback-map.js#L28)

___

### getStyleJsonStats

• **getStyleJsonStats**: () => `Promise`\<`Stats`\>

#### Type declaration

▸ (): `Promise`\<`Stats`\>

##### Returns

`Promise`\<`Stats`\>

#### Defined in

[src/fastify-plugins/maps/offline-fallback-map.js:29](https://github.com/digidem/mapeo-core-next/blob/53dc843a45bb963f7a880f5f7973107d5b1fb99c/src/fastify-plugins/maps/offline-fallback-map.js#L29)
