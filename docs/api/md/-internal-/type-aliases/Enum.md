[**API**](../../README.md) • **Docs**

***

[API](../../README.md) / [\<internal\>](../README.md) / Enum

# Type Alias: Enum\<T, TEnum\>

> **Enum**\<`T`, `TEnum`\>: `TEnum` *extends* readonly [`string`, `...string[]`] ? [`Writable`](Writable.md)\<`TEnum`\> : `T`\[`"const"`\] *extends* `string` ? [`T`\[`"const"`\]] : [`string`, `...string[]`]

Get the type of a JSONSchema string: array of constants for an enum,
otherwise string[]. Strangeness is to convert it into the format expected by
drizzle, which results in the correct type for the field from SQLite

## Type Parameters

• **T** *extends* [`JSONSchema7`](JSONSchema7.md)

• **TEnum** *extends* `T`\[`"enum"`\] = `T`\[`"enum"`\]
