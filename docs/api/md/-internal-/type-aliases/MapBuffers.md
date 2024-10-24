[**API**](../../README.md) • **Docs**

***

[API](../../README.md) / [\<internal\>](../README.md) / MapBuffers

# Type Alias: MapBuffers\<T\>

> **MapBuffers**\<`T`\>: `{ [K in keyof T]: T[K] extends Buffer ? string : T[K] }`

Replace an object's `Buffer` values with `string`s. Useful for serialization.

## Type Parameters

• **T**
