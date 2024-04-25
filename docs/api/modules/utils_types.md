[API](../README.md) / utils\_types

# Module: utils\_types

## Table of contents

### Type Aliases

- [TypedEventArgs](utils_types.md#typedeventargs)
- [TypedEvents](utils_types.md#typedevents)
- [TypedEventsFor](utils_types.md#typedeventsfor)

## Type Aliases

### TypedEventArgs

Ƭ **TypedEventArgs**\<`Emitter`, `Event`\>: `Parameters`\<[`TypedEvents`](utils_types.md#typedevents)\<`Emitter`\>[`Event`]\>

#### Type parameters

| Name | Type |
| :------ | :------ |
| `Emitter` | extends `TypedEmitter`\<`any`\> |
| `Event` | extends [`TypedEventsFor`](utils_types.md#typedeventsfor)\<`Emitter`\> |

#### Defined in

[src/utils_types.d.ts:11](https://github.com/digidem/mapeo-core-next/blob/53dc843a45bb963f7a880f5f7973107d5b1fb99c/src/utils_types.d.ts#L11)

___

### TypedEvents

Ƭ **TypedEvents**\<`T`\>: `T` extends `TypedEmitter`\<infer Result\> ? `Result` : `never`

#### Type parameters

| Name | Type |
| :------ | :------ |
| `T` | extends `TypedEmitter`\<`any`\> |

#### Defined in

[src/utils_types.d.ts:3](https://github.com/digidem/mapeo-core-next/blob/53dc843a45bb963f7a880f5f7973107d5b1fb99c/src/utils_types.d.ts#L3)

___

### TypedEventsFor

Ƭ **TypedEventsFor**\<`T`\>: keyof [`TypedEvents`](utils_types.md#typedevents)\<`T`\>

#### Type parameters

| Name | Type |
| :------ | :------ |
| `T` | extends `TypedEmitter`\<`any`\> |

#### Defined in

[src/utils_types.d.ts:9](https://github.com/digidem/mapeo-core-next/blob/53dc843a45bb963f7a880f5f7973107d5b1fb99c/src/utils_types.d.ts#L9)
