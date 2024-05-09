API

# API

## Table of contents

### Modules

- [\<internal\>](modules/internal_.md)

### Classes

- [FastifyController](classes/FastifyController.md)
- [MapeoManager](classes/MapeoManager.md)

### Functions

- [MapeoMapsFastifyPlugin](README.md#mapeomapsfastifyplugin)
- [MapeoOfflineFallbackMapFastifyPlugin](README.md#mapeoofflinefallbackmapfastifyplugin)
- [MapeoStaticMapsFastifyPlugin](README.md#mapeostaticmapsfastifyplugin)

## Functions

### MapeoMapsFastifyPlugin

▸ **MapeoMapsFastifyPlugin**(`instance`, `opts`): `Promise`\<`void`\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `instance` | `FastifyInstance`\<`RawServerDefault`, `IncomingMessage`, `ServerResponse`\<`IncomingMessage`\>, `FastifyBaseLogger`, `FastifyTypeProviderDefault`\> |
| `opts` | [`MapsPluginOpts`](interfaces/internal_.MapsPluginOpts.md) |

#### Returns

`Promise`\<`void`\>

#### Defined in

[src/fastify-plugins/maps/index.js:30](https://github.com/digidem/mapeo-core-next/blob/315dc9781d8d2f74f17b1fd651a3ae81272b7fac/src/fastify-plugins/maps/index.js#L30)

___

### MapeoOfflineFallbackMapFastifyPlugin

▸ **MapeoOfflineFallbackMapFastifyPlugin**(`instance`, `opts`): `Promise`\<`void`\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `instance` | `FastifyInstance`\<`RawServerDefault`, `IncomingMessage`, `ServerResponse`\<`IncomingMessage`\>, `FastifyBaseLogger`, `FastifyTypeProviderDefault`\> |
| `opts` | [`OfflineFallbackMapPluginOpts`](interfaces/internal_.OfflineFallbackMapPluginOpts.md) |

#### Returns

`Promise`\<`void`\>

#### Defined in

[src/fastify-plugins/maps/offline-fallback-map.js:14](https://github.com/digidem/mapeo-core-next/blob/315dc9781d8d2f74f17b1fd651a3ae81272b7fac/src/fastify-plugins/maps/offline-fallback-map.js#L14)

___

### MapeoStaticMapsFastifyPlugin

▸ **MapeoStaticMapsFastifyPlugin**(`instance`, `opts`): `Promise`\<`void`\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `instance` | `FastifyInstance`\<`RawServerDefault`, `IncomingMessage`, `ServerResponse`\<`IncomingMessage`\>, `FastifyBaseLogger`, `FastifyTypeProviderDefault`\> |
| `opts` | [`StaticMapsPluginOpts`](interfaces/internal_.StaticMapsPluginOpts.md) |

#### Returns

`Promise`\<`void`\>

#### Defined in

[src/fastify-plugins/maps/static-maps.js:18](https://github.com/digidem/mapeo-core-next/blob/315dc9781d8d2f74f17b1fd651a3ae81272b7fac/src/fastify-plugins/maps/static-maps.js#L18)
