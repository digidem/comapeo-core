[API](../README.md) / schema/types

# Module: schema/types

## Table of contents

### Type Aliases

- [JSONSchema7](schema_types.md#jsonschema7)
- [JSONSchema7WithProps](schema_types.md#jsonschema7withprops)
- [NonEmptyArray](schema_types.md#nonemptyarray)
- [OptionalToNull](schema_types.md#optionaltonull)
- [SchemaToDrizzleColumns](schema_types.md#schematodrizzlecolumns)

## Type Aliases

### JSONSchema7

Ƭ **JSONSchema7**: `ReadonlyDeep`\<`JSONSchema7Writable`\>

#### Defined in

[src/schema/types.ts:95](https://github.com/digidem/mapeo-core-next/blob/53dc843a45bb963f7a880f5f7973107d5b1fb99c/src/schema/types.ts#L95)

___

### JSONSchema7WithProps

Ƭ **JSONSchema7WithProps**: `Omit`\<[`JSONSchema7`](schema_types.md#jsonschema7), ``"properties"``\> & \{ `properties`: `JsonSchema7Properties`  }

#### Defined in

[src/schema/types.ts:97](https://github.com/digidem/mapeo-core-next/blob/53dc843a45bb963f7a880f5f7973107d5b1fb99c/src/schema/types.ts#L97)

___

### NonEmptyArray

Ƭ **NonEmptyArray**\<`T`\>: [`T`, ...T[]]

#### Type parameters

| Name |
| :------ |
| `T` |

#### Defined in

[src/schema/types.ts:153](https://github.com/digidem/mapeo-core-next/blob/53dc843a45bb963f7a880f5f7973107d5b1fb99c/src/schema/types.ts#L153)

___

### OptionalToNull

Ƭ **OptionalToNull**\<`T`\>: \{ [K in keyof T]-?: undefined extends T[K] ? T[K] \| null : T[K] }

Convert optional properties to nullable

#### Type parameters

| Name | Type |
| :------ | :------ |
| `T` | extends `Object` |

#### Defined in

[src/schema/types.ts:8](https://github.com/digidem/mapeo-core-next/blob/53dc843a45bb963f7a880f5f7973107d5b1fb99c/src/schema/types.ts#L8)

___

### SchemaToDrizzleColumns

Ƭ **SchemaToDrizzleColumns**\<`T`, `TObjectType`, `U`\>: \{ [K in keyof U]: K extends string ? U[K]["type"] extends "string" ? TextBuilder\<K, Enum\<U[K]\>, IsRequired\<T, K\>, HasDefault\<U[K]\>\> : U[K]["type"] extends "boolean" ? BooleanBuilder\<K, IsRequired\<T, K\>, HasDefault\<U[K]\>\> : U[K]["type"] extends "number" ? RealBuilder\<K, IsRequired\<T, K\>, HasDefault\<U[K]\>\> : U[K]["type"] extends "integer" ? IntegerBuilder\<K, IsRequired\<T, K\>, HasDefault\<U[K]\>\> : U[K]["type"] extends "array" \| "object" ? JsonBuilder\<K, TObjectType[K], IsRequired\<T, K\>, HasDefault\<(...)[(...)]\>\> : never : never } & \{ `forks`: `JsonBuilder`\<``"forks"``, `string`[], ``true``, ``false``\>  }

Convert a JSONSchema to a Drizzle Columns map (e.g. parameter for
`sqliteTable()`). All top-level properties map to SQLite columns, with
`required` properties marked as `NOT NULL`, and JSONSchema `default` will map
to SQLite defaults. Any properties that are of type `object` or `array` in
the JSONSchema will be mapped to a text field, which drizzle will parse and
stringify. Types for parsed JSON will be derived from MapeoDoc types.

#### Type parameters

| Name | Type |
| :------ | :------ |
| `T` | extends [`JSONSchema7WithProps`](schema_types.md#jsonschema7withprops) |
| `TObjectType` | extends \{ [K in keyof U]?: any } |
| `U` | extends `JsonSchema7Properties` = `T`[``"properties"``] |

#### Defined in

[src/schema/types.ts:133](https://github.com/digidem/mapeo-core-next/blob/53dc843a45bb963f7a880f5f7973107d5b1fb99c/src/schema/types.ts#L133)
