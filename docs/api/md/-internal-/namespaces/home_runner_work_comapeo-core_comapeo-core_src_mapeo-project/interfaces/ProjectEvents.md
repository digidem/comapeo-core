[**API**](../../../../README.md) • **Docs**

***

[API](../../../../README.md) / [\<internal\>](../../../README.md) / ["/home/runner/work/comapeo-core/comapeo-core/src/mapeo-project"](../README.md) / ProjectEvents

# Interface: ProjectEvents

## Properties

### close()

> **close**: () => `void`

Project resources have been cleared up

#### Returns

`void`

***

### map-share()

> **map-share**: (`mapShare`) => `void`

Emitted when a map share is recieved from someone on the project

#### Parameters

• **mapShare**: [`MapShare`](../../../../type-aliases/MapShare.md)

#### Returns

`void`

***

### map-share-error()

> **map-share-error**: (`e`, `mapShare`) => `void`

Emitted when an incoming map share fails to be recieved due to formatting issues

#### Parameters

• **e**: `Error`

• **mapShare**: `MapShareExtension`

#### Returns

`void`

***

### own-role-change()

> **own-role-change**: (`changeEvent`) => `void`

#### Parameters

• **changeEvent**: [`RoleChangeEvent`](RoleChangeEvent.md)

#### Returns

`void`
