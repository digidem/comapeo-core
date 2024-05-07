API

# API

## Table of contents

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
| `opts` | `MapsPluginOpts` |

#### Returns

`Promise`\<`void`\>

#### Defined in

[src/fastify-plugins/maps/index.js:30](https://github.com/digidem/mapeo-core-next/blob/9222af401663318d26533372ca2e130753329c39/src/fastify-plugins/maps/index.js#L30)

___

### MapeoOfflineFallbackMapFastifyPlugin

▸ **MapeoOfflineFallbackMapFastifyPlugin**(`instance`, `opts`): `Promise`\<`void`\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `instance` | `FastifyInstance`\<`RawServerDefault`, `IncomingMessage`, `ServerResponse`\<`IncomingMessage`\>, `FastifyBaseLogger`, `FastifyTypeProviderDefault`\> |
| `opts` | `OfflineFallbackMapPluginOpts` |

#### Returns

`Promise`\<`void`\>

#### Defined in

[src/fastify-plugins/maps/offline-fallback-map.js:14](https://github.com/digidem/mapeo-core-next/blob/9222af401663318d26533372ca2e130753329c39/src/fastify-plugins/maps/offline-fallback-map.js#L14)

___

### MapeoStaticMapsFastifyPlugin

▸ **MapeoStaticMapsFastifyPlugin**(`instance`, `opts`): `Promise`\<`void`\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `instance` | `FastifyInstance`\<`RawServerDefault`, `IncomingMessage`, `ServerResponse`\<`IncomingMessage`\>, `FastifyBaseLogger`, `FastifyTypeProviderDefault`\> |
| `opts` | `StaticMapsPluginOpts` |

#### Returns

`Promise`\<`void`\>

#### Defined in

[src/fastify-plugins/maps/static-maps.js:18](https://github.com/digidem/mapeo-core-next/blob/9222af401663318d26533372ca2e130753329c39/src/fastify-plugins/maps/static-maps.js#L18)
