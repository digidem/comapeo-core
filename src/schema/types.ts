import { Includes, ReadonlyDeep } from 'type-fest'
import {
  JSONSchema7 as JSONSchema7Writable,
  JSONSchema7Type,
} from 'json-schema'
import type {
  SQLiteBooleanBuilder,
  SQLiteIntegerBuilder,
  SQLiteRealBuilder,
  SQLiteTextBuilder,
  SQLiteTextJsonBuilder,
} from 'drizzle-orm/sqlite-core'
import type { $Type, ColumnBuilderBase, HasDefault, NotNull } from 'drizzle-orm'

/** Convert a readonly array/object to writeable */
type Writable<T> = { -readonly [P in keyof T]: T[P] }

export type JSONSchema7 = ReadonlyDeep<JSONSchema7Writable>
type JsonSchema7Properties = { readonly [K: string]: JSONSchema7 }
export type JSONSchema7WithProps = Omit<JSONSchema7, 'properties'> & {
  readonly properties: JsonSchema7Properties
}

/** Get the type of a JSONSchema string: array of constants for an enum,
otherwise string[]. Strangeness is to convert it into the format expected by
drizzle, which results in the correct type for the field from SQLite */
type Enum<
  T extends JSONSchema7,
  TEnum extends T['enum'] = T['enum']
> = TEnum extends readonly [string, ...string[]]
  ? Writable<TEnum>
  : T['const'] extends string
  ? [T['const']]
  : [string, ...string[]]

/** True if JSONSchema object has a default */
type HasJSONSchemaDefault<T extends JSONSchema7> =
  T['default'] extends JSONSchema7Type ? true : false

/** True if JSONSchema value is required */
type IsJSONSchemaRequired<
  T extends JSONSchema7WithProps,
  U extends string,
  V extends JSONSchema7['required'] = T['required']
> = V extends readonly any[] ? Includes<V, U> : false

/**
 * Convert a JSONSchema to a Drizzle Columns map (e.g. parameter for
 * `sqliteTable()`). All top-level properties map to SQLite columns, with
 * `required` properties marked as `NOT NULL`, and JSONSchema `default` will map
 * to SQLite defaults. Any properties that are of type `object` or `array` in
 * the JSONSchema will be mapped to a text field, which drizzle will parse and
 * stringify. Types for parsed JSON will be derived from MapeoDoc types.
 */
export type SchemaToDrizzleColumns<
  T extends JSONSchema7WithProps,
  /** This is the type matching the JSONSchema */
  TObjectType extends { [K in keyof T['properties']]?: any }
> = AddJSONSchemaDefaults<
  T,
  AddJSONSchemaRequired<T, SchemaToDrizzleColumnsBase<T, TObjectType>>
>

/**
 * Add `HasDefault` to columns if the JSONSchema has a default for that property
 */
type AddJSONSchemaDefaults<
  TJSONSchema extends JSONSchema7WithProps,
  TColumns extends Record<string, ColumnBuilderBase>,
  U extends JsonSchema7Properties = TJSONSchema['properties']
> = {
  [K in keyof TColumns]: K extends keyof U
    ? HasJSONSchemaDefault<U[K]> extends true
      ? HasDefault<TColumns[K]>
      : TColumns[K]
    : TColumns[K]
}

/**
 * Mark columns as NotNull if they are required in the JSONSchema
 */
type AddJSONSchemaRequired<
  TJSONSchema extends JSONSchema7WithProps,
  TColumns extends Record<string, ColumnBuilderBase>
> = {
  [K in keyof TColumns]: K extends string
    ? IsJSONSchemaRequired<TJSONSchema, K> extends true
      ? NotNull<TColumns[K]>
      : TColumns[K]
    : TColumns[K]
}

/**
 * Map JSONSchema object properties to Drizzle column types.
 */
type SchemaToDrizzleColumnsBase<
  T extends JSONSchema7WithProps,
  TObjectType extends { [K in keyof U]?: any },
  U extends JsonSchema7Properties = T['properties']
> = {
  [K in keyof U]: K extends string
    ? U[K]['type'] extends 'string'
      ? SQLiteTextBuilder<Enum<U[K]>>
      : U[K]['type'] extends 'boolean'
      ? SQLiteBooleanBuilder
      : U[K]['type'] extends 'number'
      ? SQLiteRealBuilder
      : U[K]['type'] extends 'integer'
      ? SQLiteIntegerBuilder
      : U[K]['type'] extends 'array' | 'object'
      ? $Type<SQLiteTextJsonBuilder, TObjectType[K]>
      : never
    : never
} & { forks: $Type<SQLiteTextJsonBuilder, string[]> }

export type NonEmptyArray<T> = [T, ...T[]]
