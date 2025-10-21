[**API**](../../README.md) • **Docs**

***

[API](../../README.md) / [\<internal\>](../README.md) / AddJSONSchemaDefaults

# Type Alias: AddJSONSchemaDefaults\<TJSONSchema, TColumns, U\>

> **AddJSONSchemaDefaults**\<`TJSONSchema`, `TColumns`, `U`\>: `{ [K in keyof TColumns]: K extends keyof U ? HasJSONSchemaDefault<U[K]> extends true ? HasDefault<TColumns[K]> : TColumns[K] : TColumns[K] }`

Add `HasDefault` to columns if the JSONSchema has a default for that property

## Type Parameters

• **TJSONSchema** *extends* [`JSONSchema7Object`](JSONSchema7Object.md)

• **TColumns** *extends* `Record`\<`string`, `ColumnBuilderBase`\>

• **U** *extends* [`JsonSchema7Properties`](JsonSchema7Properties.md) = `TJSONSchema`\[`"properties"`\]
