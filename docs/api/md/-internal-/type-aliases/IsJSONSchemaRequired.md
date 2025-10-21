[**API**](../../README.md) • **Docs**

***

[API](../../README.md) / [\<internal\>](../README.md) / IsJSONSchemaRequired

# Type Alias: IsJSONSchemaRequired\<T, U, V\>

> **IsJSONSchemaRequired**\<`T`, `U`, `V`\>: `V` *extends* readonly `any`[] ? `Includes`\<`V`, `U`\> : `false`

True if JSONSchema value is required

## Type Parameters

• **T** *extends* [`JSONSchema7Object`](JSONSchema7Object.md)

• **U** *extends* `string`

• **V** *extends* [`JSONSchema7`](JSONSchema7.md)\[`"required"`\] = `T`\[`"required"`\]
