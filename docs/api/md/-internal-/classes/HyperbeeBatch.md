[**API**](../../README.md) • **Docs**

***

[API](../../README.md) / [\<internal\>](../README.md) / HyperbeeBatch

# Class: HyperbeeBatch\<T\>

## Type Parameters

• **T**

## Constructors

### new HyperbeeBatch()

> **new HyperbeeBatch**\<`T`\>(): [`HyperbeeBatch`](HyperbeeBatch.md)\<`T`\>

#### Returns

[`HyperbeeBatch`](HyperbeeBatch.md)\<`T`\>

## Methods

### close()

> **close**(): `Promise`\<`void`\>

#### Returns

`Promise`\<`void`\>

***

### del()

> **del**(`key`, `options`?): `Promise`\<`void`\>

#### Parameters

• **key**: `string`

• **options?**: `any`

#### Returns

`Promise`\<`void`\>

***

### flush()

> **flush**(): `Promise`\<`void`\>

#### Returns

`Promise`\<`void`\>

***

### get()

> **get**(`key`): `Promise`\<`any`\>

#### Parameters

• **key**: `string`

#### Returns

`Promise`\<`any`\>

***

### put()

> **put**(`key`, `value`?, `options`?): `Promise`\<`void`\>

#### Parameters

• **key**: `string`

• **value?**: `T`

• **options?**: `any`

#### Returns

`Promise`\<`void`\>
