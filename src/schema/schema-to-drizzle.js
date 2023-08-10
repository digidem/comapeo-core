import { text, integer, real, customType } from 'drizzle-orm/sqlite-core'

/**
Convert optional properties to nullable
@template {object} T
@typedef {{ [K in keyof T]-?: undefined extends T[K] ? T[K] | null : T[K] }} OptionalToNull
 */

/**
Convert a readonly array/object to writeable
@template T
@typedef {{ -readonly [P in keyof T]: T[P] }} Writable
 */

/**
Type returned by text(columnName, { enum: [] })
@template {string} TName
@template {readonly [string, ...string[]]} TEnum
@template {boolean} TNotNull
@template {boolean} THasDefault
@typedef {import('drizzle-orm/sqlite-core').SQLiteTextBuilder<{
  name: TName;
  data: Writable<TEnum>[number];
  driverParam: string;
  enumValues: Writable<TEnum>;
  notNull: TNotNull;
  hasDefault: THasDefault;
}>} TextBuilder
 */

/**
Type returned by integer(columnName, { mode: 'boolean' })
@template {string} TName
@template {boolean} TNotNull
@template {boolean} THasDefault
@typedef {import('drizzle-orm/sqlite-core').SQLiteBooleanBuilder<{
  name: TName,
  data: boolean;
  driverParam: number;
  notNull: TNotNull;
  hasDefault: THasDefault;
}>} BooleanBuilder
 */

/**
Type returned by real(columnName)
@template {string} TName
@template {boolean} TNotNull
@template {boolean} THasDefault
@typedef {import('drizzle-orm/sqlite-core').SQLiteRealBuilder<{
  name: TName,
  data: number;
  driverParam: number;
  notNull: TNotNull;
  hasDefault: THasDefault;
}>} RealBuilder
 */

/**
Type returned by integer(columnName)
@template {string} TName
@template {boolean} TNotNull
@template {boolean} THasDefault
@typedef {import('drizzle-orm/sqlite-core').SQLiteIntegerBuilder<{
  name: TName,
  data: number;
  driverParam: number;
  notNull: TNotNull;
  hasDefault: THasDefault;
}>} IntegerBuilder
 */

/**
Type returned by the `customJson` custom type
@template {string} TName
@template {unknown} TData
@template {boolean} TNotNull
@template {boolean} THasDefault
@typedef {import('drizzle-orm/sqlite-core').SQLiteCustomColumnBuilder<{
  name: TName,
  data: TData,
  driverParam: string,
  notNull: TNotNull,
  hasDefault: THasDefault
}>} JsonBuilder
 */

const customJson = customType({
  dataType() {
    return 'text'
  },
  fromDriver(value) {
    // @ts-ignore
    return JSON.parse(value)
  },
  toDriver(value) {
    return JSON.stringify(value)
  },
})

/**
@typedef {import('type-fest').ReadonlyDeep<import('json-schema').JSONSchema7>} JSONSchema7
 */

/**
@typedef {{ readonly [K: string]: JSONSchema7 }} JsonSchema7Properties
 */

/**
@typedef {import('json-schema').JSONSchema7Type} JSONSchema7Type
 */

/**
@typedef {Omit<JSONSchema7, 'properties'> & { readonly properties: JsonSchema7Properties }} JSONSchema7WithProps
 */

/**
Get the type of a JSONSchema string: array of constants for an enum, otherwise
string[]. Strangeness is to convert it into the format expected by drizzle,
which results in the correct type for the field from SQLite
@template {JSONSchema7} T
@template {T['enum']} [TEnum=T['enum']]
@typedef {
  TEnum extends readonly [string, ...string[]]
  ? Writable<TEnum>
  : T['const'] extends string
  ? [T['const']]
  : [string, ...string[]]
} Enum
 */

/**
True if JSONSchema object has a default
@template {JSONSchema7} T
@typedef {T['default'] extends JSONSchema7Type ? true : false} HasDefault
 */

/**
True if JSONSchema value is required
@template {JSONSchema7WithProps} T
@template {string} U properties key
@template {JSONSchema7['required']} [V=T['required']]
@typedef {
  V extends readonly any[]
  ? import('type-fest').Includes<V, U>
  : false
} IsRequired
 */

/**
Convert a JSONSchema to a Drizzle Columns map (e.g. parameter for
`sqliteTable()`). All top-level properties map to SQLite columns, with
`required` properties marked as `NOT NULL`, and JSONSchema `default` will map to
SQLite defaults. Any properties that are of type `object` or `array` in the
JSONSchema will be mapped to a text field, which drizzle will parse and
stringify. Types for parsed JSON will be derived from MapeoDoc types.
@template {JSONSchema7WithProps} T
@template {{ [K in keyof U]?: any }} TObjectType
@template {JsonSchema7Properties} [U=T['properties']]
@typedef {{
  [K in keyof U]: K extends string
  ? U[K]['type'] extends 'string'
    ? TextBuilder<K, Enum<U[K]>, IsRequired<T, K>, HasDefault<U[K]>>
    : U[K]['type'] extends 'boolean'
    ? BooleanBuilder<K, IsRequired<T, K>, HasDefault<U[K]>>
    : U[K]['type'] extends 'number'
    ? RealBuilder<K, IsRequired<T, K>, HasDefault<U[K]>>
    : U[K]['type'] extends 'integer'
    ? IntegerBuilder<K, IsRequired<T, K>, HasDefault<U[K]>>
    : U[K]['type'] extends 'array' | 'object'
    ? JsonBuilder<K, TObjectType[K], IsRequired<T, K>, HasDefault<U[K]>>
    : never
  : never
} & { forks: JsonBuilder<'forks', string[], true, false> }} SchemaToDrizzleColumns
 */

/**
@typedef {import('@mapeo/schema').MapeoDoc} MapeoDoc
 */
/**
@typedef {import('../types.js').MapeoDocMap} MapeoDocMap
 */
/**
@template BaseType
@template {string | readonly string[]} Path
@typedef {import('type-fest').Get<BaseType, Path>} Get
 */

/**
Convert a JSONSchema definition to a Drizzle Columns Map (the parameter for
`sqliteTable()`).

**NOTE**: The return of this function is _not_ type-checked (it is coerced with
`as`, because it's not possible to type-check what this function is doing), but
the return type _should_ be correct when using this function. TODO: tests for
the return type of this function.
@template {JSONSchema7WithProps} TSchema
NB: The inline typescript checker often marks this next line as an error, but this seems to be a bug with JSDoc parsing - running `tsc` does not show this as an error.
@template {Get<TSchema, 'properties.schemaName.const'>} TSchemaName
@template {TSchemaName extends MapeoDoc['schemaName'] ? MapeoDocMap[TSchemaName] : any} TObjectType
@param {TSchema} schema
@returns {SchemaToDrizzleColumns<TSchema, TObjectType>}
 */
export function jsonSchemaToDrizzleColumns(schema) {
  if (schema.type !== 'object' || !schema.properties) {
    throw new Error('Cannot process JSONSchema as SQL table')
  }
  /** @type {Record<string, import('drizzle-orm/sqlite-core').AnySQLiteColumnBuilder>} */
  const columns = {}
  for (const [key, value] of Object.entries(schema.properties)) {
    if (typeof value !== 'object') continue
    if (isArray(value.type) || typeof value.type === 'undefined') {
      throw new Error('Cannot process JSONSchema as SQL table')
    }
    switch (value.type) {
      case 'boolean':
        columns[key] = integer(key, { mode: 'boolean' })
        break
      case 'number':
      case 'integer':
        columns[key] = real(key)
        break
      case 'string': {
        const enumValue = isStringArray(value.enum)
          ? value.enum
          : typeof value.const === 'string'
          ? /** @type {[typeof value.const]} */ ([value.const])
          : undefined
        columns[key] = text(key, { enum: enumValue })
        if (key === 'docId') {
          columns[key] = columns[key].primaryKey()
        }
        break
      }
      case 'array':
      case 'object':
        columns[key] = customJson(key)
        break
      case 'null':
        // Skip handling this right now
        continue
      default: {
        /** @type {never} */
        // eslint-disable-next-line no-unused-vars
        const _exhaustiveCheck = value.type
        continue
      }
    }
    const defaultValue = getDefault(value)
    if (typeof defaultValue !== 'undefined') {
      columns[key] = columns[key].default(defaultValue)
    }
    if (isRequired(schema, key)) {
      columns[key] = columns[key].notNull()
    }
  }
  // Not yet in @mapeo/schema
  columns.forks = customJson('forks').notNull()
  return /** @type {any} */ (columns)
}

/**
 * @template {JSONSchema7} T
 * @param {T} value
 * @returns {T['default']}
 */
function getDefault(value) {
  return value.default
}

/**
 * @param {JSONSchema7WithProps} schema
 * @param {string} key
 * @returns {boolean}
 */
function isRequired(schema, key) {
  if (!isArray(schema.required)) return false
  return schema.required.includes(key)
}

/**
 * Tests whether a value is an array.
 * @param {any} value
 * @returns {value is readonly unknown[]}
 */
function isArray(value) {
  // See: https://github.com/microsoft/TypeScript/issues/17002
  return Array.isArray(value)
}

/**
 * Check if a value is an array of strings of length at least one
 * @param {any} value
 * @returns {value is [string, ...string[]]}
 */
function isStringArray(value) {
  return (
    isArray(value) &&
    value.every((v) => typeof v === 'string') &&
    value.length > 0
  )
}
