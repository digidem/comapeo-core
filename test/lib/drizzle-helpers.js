import Database from 'better-sqlite3'
import { drizzle } from 'drizzle-orm/better-sqlite3'
import assert from 'node:assert/strict'
import test, { describe } from 'node:test'
import { migrate } from '../../src/lib/drizzle-helpers.js'

describe('migrate', async () => {
  const db = new Database(':memory:')
  const driz = drizzle(db)

  const fixturesDir = new URL('../fixtures/schema/', import.meta.url)
  const schema1Path = new URL('./1', fixturesDir).pathname
  const schema2Path = new URL('./2', fixturesDir).pathname

  test('initial migration', () => {
    const result = migrate(driz, { migrationsFolder: schema1Path })
    assert.equal(result, 'initialized database')
  })

  test('subsequent migration', () => {
    const result = migrate(driz, { migrationsFolder: schema2Path })
    assert.equal(result, 'migrated')
  })

  test('redundant migration', () => {
    const result = migrate(driz, { migrationsFolder: schema2Path })
    assert.equal(result, 'no migration')
  })
})
