[API](../README.md) / fastify-plugins/maps/static-maps

# Module: fastify-plugins/maps/static-maps

## Table of contents

### Interfaces

- [StaticMapsPluginDecorator](../interfaces/fastify_plugins_maps_static_maps.StaticMapsPluginDecorator.md)
- [StaticMapsPluginOpts](../interfaces/fastify_plugins_maps_static_maps.StaticMapsPluginOpts.md)

### Variables

- [PLUGIN\_NAME](fastify_plugins_maps_static_maps.md#plugin_name)

### Functions

- [plugin](fastify_plugins_maps_static_maps.md#plugin)

## Variables

### PLUGIN\_NAME

• `Const` **PLUGIN\_NAME**: ``"mapeo-static-maps"``

#### Defined in

[src/fastify-plugins/maps/static-maps.js:16](https://github.com/digidem/mapeo-core-next/blob/53dc843a45bb963f7a880f5f7973107d5b1fb99c/src/fastify-plugins/maps/static-maps.js#L16)

## Functions

### plugin

▸ **plugin**(`instance`, `opts`): `Promise`\<`void`\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `instance` | `FastifyInstance`\<`RawServerDefault`, `IncomingMessage`, `ServerResponse`\<`IncomingMessage`\>, `FastifyBaseLogger`, `FastifyTypeProviderDefault`\> |
| `opts` | [`StaticMapsPluginOpts`](../interfaces/fastify_plugins_maps_static_maps.StaticMapsPluginOpts.md) |

#### Returns

`Promise`\<`void`\>

#### Defined in

[src/fastify-plugins/maps/static-maps.js:18](https://github.com/digidem/mapeo-core-next/blob/53dc843a45bb963f7a880f5f7973107d5b1fb99c/src/fastify-plugins/maps/static-maps.js#L18)
