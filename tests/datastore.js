import test from 'brittle'

import ram from 'random-access-memory'
import Corestore from 'corestore'
import Sqlite from 'better-sqlite3'
import MultiCoreIndexer from 'multi-core-indexer'

import { DataType } from '../lib/datatype/index.js'
import { DataStore } from '../lib/datastore/index.js'
import { Indexer } from '../lib/indexer/index.js'

test('datastore - create, update, query', async (t) => {
  t.plan(7)

  const dataType = new DataType({
    name: 'test',
    blockPrefix: 'test',
    schema: {
      type: 'object',
      properties: {
        id: { type: 'string' },
        version: { type: 'string' },
        value: { type: 'string' },
        created_at: { type: 'number' },
        updated_at: { type: 'number' },
        links: { type: 'array' },
        creatorId: { type: 'string' },
      },
      additionalProperties: false,
    },
  })

  const corestore = new Corestore(ram)
  const sqlite = new Sqlite(':memory:')

  // TODO: this should be done automatically somehow
  const writer = corestore.get({ name: 'writer' })
  await writer.ready()

  new MultiCoreIndexer([...corestore.cores.values()], {
    storage: (key) => {
      return new ram(key)
    },
    batch: (entries) => {
      for (const entry of entries) {
        const { block } = entry
        const doc = dataType.decode(block)
        indexer.batch([doc])
      }
    },
  })

  const indexer = new Indexer({
    sqlite,
    dataType,
    extraColumns: 'value TEXT',
  })

  const datastore = new DataStore({
    corestore,
    indexer,
    dataType,
    identityPublicKey: 'test',
  })

  await datastore.ready()
  t.ok(datastore, 'datastore created')

  try {
    await datastore.create({ wrong: 'wont work' })
  } catch (err) {
    t.ok(err, 'doc create failed validation')
  }

  const doc = await datastore.create({ value: 'test' })
  t.ok(doc && doc.value === 'test', 'doc created')

  const [gotDoc] = datastore.query()
  t.ok(gotDoc && gotDoc.value === 'test', 'doc queried')

  const updatedDocVersion = Object.assign({}, doc, {
    value: 'updated',
    links: [doc.version],
  })

  const updatedDoc = await datastore.update(updatedDocVersion)
  t.ok(updatedDoc && updatedDoc.value === 'updated', 'doc updated')

  try {
    await datastore.update({ wrong: 'wont work' })
  } catch (err) {
    t.ok(err, 'doc update failed validation')
  }

  const [gotUpdatedDoc] = datastore.query()
  t.ok(
    gotUpdatedDoc && gotUpdatedDoc.value === 'updated',
    'updated doc queried'
  )
})
