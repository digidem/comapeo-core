import { text, integer, real } from 'drizzle-orm/sqlite-core'
import { ExhaustivenessError } from '../utils.js'
/** @import { MapeoDoc } from '@comapeo/schema' */
/** @import { MapeoDocMap } from '../types.js' */

/**
Convert a JSONSchema definition to a Drizzle Columns Map (the parameter for
`sqliteTable()`).

**NOTE**: The return of this function is _not_ type-checked (it is coerced with
`as`, because it's not possible to type-check what this function is doing), but
the return type _should_ be correct when using this function.
@template {import('./types.js').JSONSchema7WithProps} TSchema
NB: The inline typescript checker often marks this next line as an error, but this seems to be a bug with JSDoc parsing - running `tsc` does not show this as an error.
@template {import('type-fest').Get<TSchema, 'properties.schemaName.const'>} TSchemaName
@template {TSchemaName extends MapeoDoc['schemaName'] ? MapeoDocMap[TSchemaName] : any} TObjectType
@param {TSchema} schema
@returns {import('./types.js').SchemaToDrizzleColumns<TSchema, TObjectType>}
 */
export function jsonSchemaToDrizzleColumns(schema) {
  if (schema.type !== 'object' || !schema.properties) {
    throw new Error('Cannot process JSONSchema as SQL table')
  }
  /** @type {Record<string, any>} */
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
        columns[key] = real(key)
        break
      case 'integer':
        columns[key] = integer(key)
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
        columns[key] = text(key, { mode: 'json' })
        break
      case 'null':
        // Skip handling this right now
        continue
      default:
        throw new ExhaustivenessError(value.type)
    }
    if (isRequired(schema, key)) {
      columns[key] = columns[key].notNull()
      // Only set defaults for required fields
      const defaultValue = getDefault(value)
      if (typeof defaultValue !== 'undefined') {
        columns[key] = columns[key].default(defaultValue)
      }
    }
  }
  // Not yet in @comapeo/schema
  columns.forks = text('forks', { mode: 'json' }).notNull()
  return /** @type {any} */ (columns)
}

/**
 * @template {import('./types.js').JSONSchema7} T
 * @param {T} value
 * @returns {T['default']}
 */
function getDefault(value) {
  return value.default
}

/**
 * @param {import('./types.js').JSONSchema7WithProps} schema
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
