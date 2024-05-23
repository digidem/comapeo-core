import Database from 'better-sqlite3'
import { drizzle } from 'drizzle-orm/better-sqlite3'
import { migrate } from 'drizzle-orm/better-sqlite3/migrator'
import assert from 'node:assert/strict'
import * as path from 'node:path'
import test from 'node:test'
import { fileURLToPath } from 'node:url'
import { countDrizzleMigrations } from '../../src/lib/count-drizzle-migrations.js'

const __filename = fileURLToPath(import.meta.url)
const fixturesPath = path.join(__filename, '..', '..', 'fixtures', 'schemas')

test('counting migrations', async (t) => {
  const db = drizzle(new Database(':memory:'))
  const migrationsTable = 'test_drizzle_migrate'

  const count = () => countDrizzleMigrations(db, migrationsTable)

  await t.test('before any migrations run', () => {
    assert.equal(count(), 0)
  })

  await t.test('after one migration', () => {
    migrate(db, {
      migrationsFolder: path.join(fixturesPath, 'one_table'),
      migrationsTable,
    })
    assert.equal(count(), 1)
  })

  await t.test('after two migrations', () => {
    migrate(db, {
      migrationsFolder: path.join(fixturesPath, 'two_tables'),
      migrationsTable,
    })
    assert.equal(count(), 2)
  })

  await t.test('with no changes to two migrations', () => {
    migrate(db, {
      migrationsFolder: path.join(fixturesPath, 'two_tables'),
      migrationsTable,
    })
    assert.equal(count(), 2)
  })
})
