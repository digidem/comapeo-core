[API](../README.md) / schema/schema-to-drizzle

# Module: schema/schema-to-drizzle

## Table of contents

### References

- [MapeoDocMap](schema_schema_to_drizzle.md#mapeodocmap)

### Functions

- [jsonSchemaToDrizzleColumns](schema_schema_to_drizzle.md#jsonschematodrizzlecolumns)

## References

### MapeoDocMap

Re-exports [MapeoDocMap](datatype.md#mapeodocmap)

## Functions

### jsonSchemaToDrizzleColumns

▸ **jsonSchemaToDrizzleColumns**\<`TSchema`, `TSchemaName`, `TObjectType`\>(`schema`): [`SchemaToDrizzleColumns`](schema_types.md#schematodrizzlecolumns)\<`TSchema`, `TObjectType`, `TSchema`[``"properties"``]\>

Convert a JSONSchema definition to a Drizzle Columns Map (the parameter for
`sqliteTable()`).

**NOTE**: The return of this function is _not_ type-checked (it is coerced with
`as`, because it's not possible to type-check what this function is doing), but
the return type _should_ be correct when using this function.

#### Type parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `TSchema` | extends [`JSONSchema7WithProps`](schema_types.md#jsonschema7withprops) | NB: The inline typescript checker often marks this next line as an error, but this seems to be a bug with JSDoc parsing - running `tsc` does not show this as an error. |
| `TSchemaName` | extends `undefined` \| ``null`` \| `string` \| `number` \| `boolean` \| readonly (``null`` \| `string` \| `number` \| `boolean` \| readonly (string \| number \| boolean \| readonly (string \| number \| boolean \| readonly (string \| number \| boolean \| readonly (string \| number \| boolean \| readonly (string \| number \| boolean \| readonly (string \| number \| boolean \| readonly (string \| number \| boolean \| readonly (string \| number \| boolean \| readonly (string \| number \| boolean \| readonly (string \| number \| boolean \| readonly (string \| number \| boolean \| any \| ReadonlyObjectDeep\<JSONSchema7Object\> \| null)[] \| ReadonlyObjectDeep\<JSONSchema7Object\> \| null)[] \| ReadonlyObjectDeep\<JSONSchema7Object\> \| null)[] \| ReadonlyObjectDeep\<JSONSchema7Object\> \| null)[] \| ReadonlyObjectDeep\<JSONSchema7Object\> \| null)[] \| ReadonlyObjectDeep\<JSONSchema7Object\> \| null)[] \| ReadonlyObjectDeep\<JSONSchema7Object\> \| null)[] \| ReadonlyObjectDeep\<JSONSchema7Object\> \| null)[] \| ReadonlyObjectDeep\<JSONSchema7Object\> \| null)[] \| ReadonlyObjectDeep\<JSONSchema7Object\> \| null)[] \| ReadonlyObjectDeep\<JSONSchema7Object\> \| null)[] \| `ReadonlyObjectDeep`\<`JSONSchema7Object`\>)[] \| `ReadonlyObjectDeep`\<`JSONSchema7Object`\> |  |
| `TObjectType` | extends `any` |  |

#### Parameters

| Name | Type |
| :------ | :------ |
| `schema` | `TSchema` |

#### Returns

[`SchemaToDrizzleColumns`](schema_types.md#schematodrizzlecolumns)\<`TSchema`, `TObjectType`, `TSchema`[``"properties"``]\>

#### Defined in

[src/schema/schema-to-drizzle.js:26](https://github.com/digidem/mapeo-core-next/blob/53dc843a45bb963f7a880f5f7973107d5b1fb99c/src/schema/schema-to-drizzle.js#L26)
