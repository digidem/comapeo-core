[API](../README.md) / fastify-plugins/maps

# Module: fastify-plugins/maps

## Table of contents

### Interfaces

- [MapsPluginContext](../interfaces/fastify_plugins_maps.MapsPluginContext.md)
- [MapsPluginOpts](../interfaces/fastify_plugins_maps.MapsPluginOpts.md)

### Variables

- [DEFAULT\_MAPBOX\_STYLE\_URL](fastify_plugins_maps.md#default_mapbox_style_url)
- [PLUGIN\_NAME](fastify_plugins_maps.md#plugin_name)

### Functions

- [plugin](fastify_plugins_maps.md#plugin)

## Variables

### DEFAULT\_MAPBOX\_STYLE\_URL

• `Const` **DEFAULT\_MAPBOX\_STYLE\_URL**: ``"https://api.mapbox.com/styles/v1/mapbox/outdoors-v12"``

#### Defined in

[src/fastify-plugins/maps/index.js:14](https://github.com/digidem/mapeo-core-next/blob/53dc843a45bb963f7a880f5f7973107d5b1fb99c/src/fastify-plugins/maps/index.js#L14)

___

### PLUGIN\_NAME

• `Const` **PLUGIN\_NAME**: ``"mapeo-maps"``

#### Defined in

[src/fastify-plugins/maps/index.js:13](https://github.com/digidem/mapeo-core-next/blob/53dc843a45bb963f7a880f5f7973107d5b1fb99c/src/fastify-plugins/maps/index.js#L13)

## Functions

### plugin

▸ **plugin**(`instance`, `opts`): `Promise`\<`void`\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `instance` | `FastifyInstance`\<`RawServerDefault`, `IncomingMessage`, `ServerResponse`\<`IncomingMessage`\>, `FastifyBaseLogger`, `FastifyTypeProviderDefault`\> |
| `opts` | [`MapsPluginOpts`](../interfaces/fastify_plugins_maps.MapsPluginOpts.md) |

#### Returns

`Promise`\<`void`\>

#### Defined in

[src/fastify-plugins/maps/index.js:30](https://github.com/digidem/mapeo-core-next/blob/53dc843a45bb963f7a880f5f7973107d5b1fb99c/src/fastify-plugins/maps/index.js#L30)
