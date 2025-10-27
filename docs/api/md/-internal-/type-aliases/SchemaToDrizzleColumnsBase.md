[**API**](../../README.md) • **Docs**

***

[API](../../README.md) / [\<internal\>](../README.md) / SchemaToDrizzleColumnsBase

# Type Alias: SchemaToDrizzleColumnsBase\<TSchema, TObjectType, U\>

> **SchemaToDrizzleColumnsBase**\<`TSchema`, `TObjectType`, `U`\>: \{ \[K in keyof U\]: K extends string ? U\[K\]\["type"\] extends "string" ? SQLiteTextBuilder\<Enum\<U\[K\]\>\> : U\[K\]\["type"\] extends "boolean" ? SQLiteBooleanBuilder : U\[K\]\["type"\] extends "number" ? SQLiteRealBuilder : U\[K\]\["type"\] extends "integer" ? SQLiteIntegerBuilder : U\[K\]\["type"\] extends "array" \| "object" ? $Type\<SQLiteTextJsonBuilder, TObjectType\[K\]\> : never : never \} & `object`

Map JSONSchema object properties to Drizzle column types.

## Type declaration

### forks

> **forks**: `$Type`\<`SQLiteTextJsonBuilder`, `string`[]\>

## Type Parameters

• **TSchema** *extends* [`JSONSchema7Object`](JSONSchema7Object.md)

• **TObjectType** *extends* `{ [K in keyof U]?: any }`

• **U** *extends* [`JsonSchema7Properties`](JsonSchema7Properties.md) = `TSchema`\[`"properties"`\]
