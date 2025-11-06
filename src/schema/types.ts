import { Includes, ReadonlyDeep } from 'type-fest'
import {
  JSONSchema7 as JSONSchema7Writable,
  JSONSchema7Type,
} from 'json-schema'
import type {
  SQLiteBooleanBuilder,
  SQLiteIntegerBuilder,
  SQLiteRealBuilder,
  SQLiteTableWithColumns,
  SQLiteTextBuilder,
  SQLiteTextJsonBuilder,
} from 'drizzle-orm/sqlite-core'
import type {
  $Type,
  BuildColumns,
  ColumnBuilderBase,
  HasDefault,
  IsPrimaryKey,
  NotNull,
} from 'drizzle-orm'

/** Convert a readonly array/object to writeable */
type Writable<T> = { -readonly [P in keyof T]: T[P] }

export type JSONSchema7 = ReadonlyDeep<JSONSchema7Writable>
type JsonSchema7Properties = { readonly [K: string]: JSONSchema7 }
export type JSONSchema7Object = Omit<JSONSchema7, 'properties' | 'type'> & {
  readonly type: 'object'
  readonly properties: JsonSchema7Properties
}

/**
 * Create a Drizzle SQLite table definition from a JSONSchema object. All
 * top-level properties map to SQLite columns, with `required` properties marked
 * as `NOT NULL`, and JSONSchema `default` will map to SQLite defaults.
 *
 * Any properties that are of type `object` or `array` in the JSONSchema will be
 * mapped to a text field, which drizzle will parse and stringify. Types for
 * `object` and `array` properties will be derived from `TObjectType`.
 */
export type JsonSchemaToDrizzleSqliteTable<
  /** Typescript type for the object defined in the JSONSchema */
  TObjectType extends { [K in keyof TSchema['properties']]?: any },
  /** The JSONSchema object schema */
  TSchema extends JSONSchema7Object,
  /** Name of the table to create */
  TTableName extends string,
  /** Additional columns to add to the table definition (e.g. not defined in JSONSchema ) */
  TColumnsMap extends Record<string, ColumnBuilderBase> = {},
  /** Name of the property to use as primary key */
  TPrimaryKey extends keyof TSchema['properties'] | undefined = undefined
> = SQLiteTableWithColumns<{
  name: TTableName
  schema: undefined
  columns: BuildColumns<
    TTableName,
    JsonSchemaToDrizzleColumns<TObjectType, TSchema, TPrimaryKey> & TColumnsMap,
    'sqlite'
  >
  dialect: 'sqlite'
}>

/**
 * Convert a JSONSchema Object Schema to a Drizzle Columns map (e.g. parameter
 * for `sqliteTable()`). All top-level properties map to SQLite columns, with
 * `required` properties marked as `NOT NULL`, and JSONSchema `default` will map
 * to SQLite defaults.
 *
 * Any properties that are of type `object` or `array` in the JSONSchema will be
 * mapped to a text field, which drizzle will parse and stringify. Types for
 * `object` and `array` properties will be derived from `TObjectType`.
 */
type JsonSchemaToDrizzleColumns<
  TObjectType extends { [K in keyof TSchema['properties']]?: any },
  TSchema extends JSONSchema7Object,
  TPrimaryKey extends keyof TSchema['properties'] | undefined = undefined
> = AddJSONSchemaDefaults<
  TSchema,
  AddJSONSchemaRequired<
    TSchema,
    SchemaToDrizzleColumnsBase<TSchema, TObjectType>
  >
>

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
  T extends JSONSchema7Object,
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
  TSchema extends JSONSchema7Object,
  /** This is the type matching the JSONSchema */
  TObjectType extends { [K in keyof TSchema['properties']]?: any },
  TPrimaryKey extends keyof TSchema['properties'] | undefined = undefined
> = AddPrimaryKey<
  AddJSONSchemaDefaults<
    TSchema,
    AddJSONSchemaRequired<
      TSchema,
      SchemaToDrizzleColumnsBase<TSchema, TObjectType>
    >
  >,
  TPrimaryKey
>

/**
 * Add `HasDefault` to columns if the JSONSchema has a default for that property
 */
type AddJSONSchemaDefaults<
  TJSONSchema extends JSONSchema7Object,
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
  TJSONSchema extends JSONSchema7Object,
  TColumns extends Record<string, ColumnBuilderBase>
> = {
  [K in keyof TColumns]: K extends string
    ? IsJSONSchemaRequired<TJSONSchema, K> extends true
      ? NotNull<TColumns[K]>
      : TColumns[K]
    : TColumns[K]
}

type AddPrimaryKey<
  TColumns extends Record<string, ColumnBuilderBase>,
  TKey extends keyof TColumns | undefined
> = TKey extends string
  ? Omit<TColumns, TKey> & { [K in TKey]: IsPrimaryKey<TColumns[TKey]> }
  : TColumns

/**
 * Map JSONSchema object properties to Drizzle column types.
 */
type SchemaToDrizzleColumnsBase<
  TSchema extends JSONSchema7Object,
  TObjectType extends { [K in keyof U]?: any },
  U extends JsonSchema7Properties = TSchema['properties']
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
