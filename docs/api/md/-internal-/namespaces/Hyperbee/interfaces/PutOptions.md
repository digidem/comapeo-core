[**API**](../../../../README.md) • **Docs**

***

[API](../../../../README.md) / [\<internal\>](../../../README.md) / [Hyperbee](../README.md) / PutOptions

# Interface: PutOptions\<T\>

## Type Parameters

• **T** = `any`

## Properties

### cas()?

> `optional` **cas**: (`prev`, `next`) => `boolean` \| `PromiseLike`\<`boolean`\>

#### Parameters

• **prev**: [`HyperbeeEntry`](HyperbeeEntry.md)\<`T`\>

• **next**: [`HyperbeeEntry`](HyperbeeEntry.md)\<`T`\>

#### Returns

`boolean` \| `PromiseLike`\<`boolean`\>
