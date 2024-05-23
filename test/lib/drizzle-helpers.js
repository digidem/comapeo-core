import Database from 'better-sqlite3'
import { drizzle } from 'drizzle-orm/better-sqlite3'
import assert from 'node:assert/strict'
import test, { describe } from 'node:test'
import { tableCountIfExists } from '../../src/lib/drizzle-helpers.js'

describe('table count if exists', () => {
  const db = new Database(':memory:')

  db.exec('CREATE TABLE empty (ignored)')

  db.exec('CREATE TABLE filled (n INT)')
  db.exec('INSERT INTO filled (n) VALUES (9)')
  db.exec('INSERT INTO filled (n) VALUES (8)')
  db.exec('INSERT INTO filled (n) VALUES (7)')

  const driz = drizzle(db)

  test("when table doesn't exist", () => {
    assert.equal(tableCountIfExists(driz, 'doesnt_exist'), 0)
  })

  test('when table is empty', () => {
    assert.equal(tableCountIfExists(driz, 'empty'), 0)
  })

  test('when table has rows', () => {
    assert.equal(tableCountIfExists(driz, 'filled'), 3)
  })
})
