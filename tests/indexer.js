import test from 'brittle'

import Sqlite from 'better-sqlite3'

import { DataType } from '../lib/datatype/index.js'
import { Indexer } from '../lib/indexer/index.js'

test('create a datastore', async (t) => {
  t.plan(3)

  const dataType = new DataType({
    name: 'test',
    blockPrefix: 'test',
    schema: {
      type: 'object',
      properties: {
        value: { type: 'string' },
      },
    },
  })

  const sqlite = new Sqlite(':memory:')

  const indexer = new Indexer({
    sqlite,
    dataType,
    extraColumns: 'value TEXT',
  })

  t.ok(indexer, 'indexer created')

  const doc = {
    id: '1',
    version: '1',
    value: 'test',
    links: [],
  }

  const indexing = new Promise((resolve) => {
    indexer.onceWriteDoc('1', (doc) => {
      resolve(doc)
    })
  })

  indexer.batch([doc])

  const [indexedDoc] = indexer.query(`value == 'test'`)
  t.ok(indexedDoc.value === 'test', 'doc queried')

  const indexed = await indexing
  t.ok(indexed.value === 'test', 'onceWriteDoc called')
})
