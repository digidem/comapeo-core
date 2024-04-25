[API](../README.md) / fastify-plugins/maps/offline-fallback-map

# Module: fastify-plugins/maps/offline-fallback-map

## Table of contents

### Interfaces

- [FallbackMapPluginDecorator](../interfaces/fastify_plugins_maps_offline_fallback_map.FallbackMapPluginDecorator.md)
- [OfflineFallbackMapPluginOpts](../interfaces/fastify_plugins_maps_offline_fallback_map.OfflineFallbackMapPluginOpts.md)

### Variables

- [PLUGIN\_NAME](fastify_plugins_maps_offline_fallback_map.md#plugin_name)

### Functions

- [plugin](fastify_plugins_maps_offline_fallback_map.md#plugin)

## Variables

### PLUGIN\_NAME

• `Const` **PLUGIN\_NAME**: ``"mapeo-static-maps"``

#### Defined in

[src/fastify-plugins/maps/offline-fallback-map.js:12](https://github.com/digidem/mapeo-core-next/blob/53dc843a45bb963f7a880f5f7973107d5b1fb99c/src/fastify-plugins/maps/offline-fallback-map.js#L12)

## Functions

### plugin

▸ **plugin**(`instance`, `opts`): `Promise`\<`void`\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `instance` | `FastifyInstance`\<`RawServerDefault`, `IncomingMessage`, `ServerResponse`\<`IncomingMessage`\>, `FastifyBaseLogger`, `FastifyTypeProviderDefault`\> |
| `opts` | [`OfflineFallbackMapPluginOpts`](../interfaces/fastify_plugins_maps_offline_fallback_map.OfflineFallbackMapPluginOpts.md) |

#### Returns

`Promise`\<`void`\>

#### Defined in

[src/fastify-plugins/maps/offline-fallback-map.js:14](https://github.com/digidem/mapeo-core-next/blob/53dc843a45bb963f7a880f5f7973107d5b1fb99c/src/fastify-plugins/maps/offline-fallback-map.js#L14)
