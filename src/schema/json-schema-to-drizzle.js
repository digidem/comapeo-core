import { text, integer, real, sqliteTable } from 'drizzle-orm/sqlite-core'
import { ExhaustivenessError } from '../utils.js'
import { InvalidSchemaError } from '../errors.js'

/**
 * @template {{ [ K in keyof TSchema['properties'] ]?: any }} TObjectType
 * @template {import('./types.js').JSONSchema7Object} TSchema
 * @template {string} TTableName
 * @template {Record<string, import('drizzle-orm').ColumnBuilderBase>} TColumnsMap
 * @template {keyof TSchema['properties']} TPrimaryKey
 * @param {TTableName} tableName
 * @param {TSchema} schema
 * @param {object} [opts]
 * @param {TColumnsMap} [opts.additionalColumns]
 * @param {TPrimaryKey} [opts.primaryKey] - Column name to use as primary key, if not specified in schema
 * @returns {import('./types.js').JsonSchemaToDrizzleSqliteTable<TObjectType, TSchema, TTableName, TColumnsMap, TPrimaryKey>}
 */
export function jsonSchemaToDrizzleSqliteTable(
  tableName,
  schema,
  { additionalColumns, primaryKey } = {}
) {
  if (schema.type !== 'object' || !schema.properties) {
    throw new InvalidSchemaError()
  }
  /** @type {Record<string, any>} */
  const columns = {}
  for (const [key, value] of Object.entries(schema.properties)) {
    if (typeof value !== 'object') continue
    if (isArray(value.type) || typeof value.type === 'undefined') {
      throw new InvalidSchemaError()
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
    if (key === primaryKey) {
      columns[key] = columns[key].primaryKey()
    }
  }
  return /** @type {any} */ (
    sqliteTable(tableName, { ...columns, ...additionalColumns })
  )
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
 * @param {import('./types.js').JSONSchema7Object} schema
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
