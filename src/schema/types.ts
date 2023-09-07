import { Includes, ReadonlyDeep } from 'type-fest'
import {
  JSONSchema7 as JSONSchema7Writable,
  JSONSchema7Type,
} from 'json-schema'

/** Convert optional properties to nullable */
export type OptionalToNull<T extends {}> = {
  [K in keyof T]-?: undefined extends T[K] ? T[K] | null : T[K]
}
/** Convert a readonly array/object to writeable */
type Writable<T> = { -readonly [P in keyof T]: T[P] }
/** Type returned by text(columnName, { enum: [] }) */
type TextBuilder<
  TName extends string,
  TEnum extends readonly [string, ...string[]],
  TNotNull extends boolean,
  THasDefault extends boolean
> = import('drizzle-orm/sqlite-core').SQLiteTextBuilder<{
  name: TName
  data: Writable<TEnum>[number]
  driverParam: string
  columnType: 'SQLiteText'
  dataType: 'string'
  enumValues: Writable<TEnum>
  notNull: TNotNull
  hasDefault: THasDefault
}>

/** Type returned by integer(columnName, { mode: 'boolean' }) */
type BooleanBuilder<
  TName extends string,
  TNotNull extends boolean,
  THasDefault extends boolean
> = import('drizzle-orm/sqlite-core').SQLiteBooleanBuilder<{
  name: TName
  data: boolean
  driverParam: number
  columnType: 'SQLiteBoolean'
  dataType: 'boolean'
  notNull: TNotNull
  hasDefault: THasDefault
  enumValues: undefined
}>

/** Type returned by real(columnName) */
type RealBuilder<
  TName extends string,
  TNotNull extends boolean,
  THasDefault extends boolean
> = import('drizzle-orm/sqlite-core').SQLiteRealBuilder<{
  name: TName
  data: number
  driverParam: number
  columnType: 'SQLiteReal'
  dataType: 'number'
  notNull: TNotNull
  hasDefault: THasDefault
  enumValues: undefined
}>

/** Type returned by integer(columnName) */
type IntegerBuilder<
  TName extends string,
  TNotNull extends boolean,
  THasDefault extends boolean
> = import('drizzle-orm/sqlite-core').SQLiteIntegerBuilder<{
  name: TName
  data: number
  driverParam: number
  columnType: 'SQLiteInteger'
  dataType: 'number'
  notNull: TNotNull
  hasDefault: THasDefault
  enumValues: undefined
}>

/** Type returned by the `customJson` custom type */
type JsonBuilder<
  TName extends string,
  TData extends unknown,
  TNotNull extends boolean,
  THasDefault extends boolean
> = import('drizzle-orm/sqlite-core').SQLiteCustomColumnBuilder<{
  name: TName
  data: TData
  dataType: 'custom'
  driverParam: string
  columnType: 'SQLiteCustomColumn'
  notNull: TNotNull
  hasDefault: THasDefault
  enumValues: undefined
}>

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
type HasDefault<T extends JSONSchema7> = T['default'] extends JSONSchema7Type
  ? true
  : false

/** True if JSONSchema value is required */
type IsRequired<
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
  TObjectType extends { [K in keyof U]?: any },
  U extends JsonSchema7Properties = T['properties']
> = {
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
} & { forks: JsonBuilder<'forks', string[], true, false> }

export type NonEmptyArray<T> = [T, ...T[]]
