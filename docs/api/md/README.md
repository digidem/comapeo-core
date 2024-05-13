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
