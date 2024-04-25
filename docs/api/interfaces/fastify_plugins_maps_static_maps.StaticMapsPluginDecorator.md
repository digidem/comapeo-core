[API](../README.md) / [fastify-plugins/maps/static-maps](../modules/fastify_plugins_maps_static_maps.md) / StaticMapsPluginDecorator

# Interface: StaticMapsPluginDecorator\<\>

[fastify-plugins/maps/static-maps](../modules/fastify_plugins_maps_static_maps.md).StaticMapsPluginDecorator

## Table of contents

### Properties

- [getResolvedStyleJson](fastify_plugins_maps_static_maps.StaticMapsPluginDecorator.md#getresolvedstylejson)
- [getStyleJsonStats](fastify_plugins_maps_static_maps.StaticMapsPluginDecorator.md#getstylejsonstats)

## Properties

### getResolvedStyleJson

• **getResolvedStyleJson**: (`styleId`: `string`, `serverAddress`: `string`) => `Promise`\<`string`\>

#### Type declaration

▸ (`styleId`, `serverAddress`): `Promise`\<`string`\>

##### Parameters

| Name | Type |
| :------ | :------ |
| `styleId` | `string` |
| `serverAddress` | `string` |

##### Returns

`Promise`\<`string`\>

#### Defined in

[src/fastify-plugins/maps/static-maps.js:31](https://github.com/digidem/mapeo-core-next/blob/53dc843a45bb963f7a880f5f7973107d5b1fb99c/src/fastify-plugins/maps/static-maps.js#L31)

___

### getStyleJsonStats

• **getStyleJsonStats**: (`styleId`: `string`) => `Promise`\<`Stats`\>

#### Type declaration

▸ (`styleId`): `Promise`\<`Stats`\>

##### Parameters

| Name | Type |
| :------ | :------ |
| `styleId` | `string` |

##### Returns

`Promise`\<`Stats`\>

#### Defined in

[src/fastify-plugins/maps/static-maps.js:32](https://github.com/digidem/mapeo-core-next/blob/53dc843a45bb963f7a880f5f7973107d5b1fb99c/src/fastify-plugins/maps/static-maps.js#L32)
