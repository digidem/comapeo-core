import test from 'brittle'

import ram from 'random-access-memory'
import Corestore from 'corestore'
import Sqlite from 'better-sqlite3'

import { Mapeo, DataType } from '../index.js'

test('mapeo - create, update, query', async (t) => {
  t.plan(4)

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

  const corestore = new Corestore(ram)
  const sqlite = new Sqlite(':memory:')

  // TODO: this should be done automatically somehow
  const writer = corestore.get({ name: 'writer' })
  await writer.ready()

  const mapeo = new Mapeo({
    corestore,
    sqlite,
    dataTypes: [dataType],
  })

  await mapeo.ready()
  t.ok(mapeo, 'mapeo created')

  const doc = await mapeo.test.create({
    value: 'test',
  })

  t.ok(doc, 'doc created')

  const newDocVersion = Object.assign({}, doc, {
    tags: {
      notes: 'updated note',
    },
    links: [doc.version],
  })

  const newDoc = await mapeo.test.update(newDocVersion)
  t.ok(newDoc, 'doc updated')

  const gotDoc = mapeo.test.query()
  t.ok(gotDoc, 'doc queried')
})
