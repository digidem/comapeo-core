import test from 'brittle'

import ram from 'random-access-memory'
import Corestore from 'corestore'
import b4a from 'b4a'

import { DataStore } from '../lib/datastore/index.js'
import { Sqlite } from '../lib/sqlite.js'

import { createIdentityKeys } from './helpers/index.js'
import { getBlockPrefix } from '../lib/utils.js'

test('datastore - create, update, query two datatypes', async (t) => {
  t.plan(13)

  const { identityKeyPair, keyManager } = createIdentityKeys()
  const keyPair = keyManager.getHypercoreKeypair('data', b4a.alloc(32))
  const corestore = new Corestore(ram)
  const sqlite = new Sqlite(':memory:')

  const datastore = new DataStore({
    corestore,
    sqlite,
    keyPair,
    identityPublicKey: identityKeyPair.publicKey,
  })

  await datastore.ready()
  t.ok(datastore, 'datastore created')

  const example1 = await datastore.dataType({
    name: 'example1',
    blockPrefix: '0',
    schema: {
      type: 'object',
      properties: {
        id: { type: 'string' },
        version: { type: 'string' },
        value: { type: 'string' },
        created: { type: 'number' },
        updated: { type: 'number' },
        timestamp: { type: 'number' },
        links: { type: 'array' },
        forks: { type: 'array' },
        authorId: { type: 'string' },
      },
      additionalProperties: false,
    },
    extraColumns: `
      value TEXT,
      created INTEGER,
      updated INTEGER,
      timestamp INTEGER,
      authorId TEXT
    `,
  })

  const example2 = await datastore.dataType({
    name: 'example2',
    blockPrefix: '1',
    schema: {
      type: 'object',
      properties: {
        id: { type: 'string' },
        version: { type: 'string' },
        value: { type: 'string' },
        created: { type: 'number' },
        updated: { type: 'number' },
        timestamp: { type: 'number' },
        links: { type: 'array' },
        forks: { type: 'array' },
        authorId: { type: 'string' },
      },
      additionalProperties: false,
    },
    extraColumns: `
      value TEXT,
      created INTEGER,
      updated INTEGER,
      timestamp INTEGER,
      authorId TEXT
    `,
  })

  // example1 create doc
  const doc = await datastore.create('example1', { value: 'example1' })
  t.is(doc.value, 'example1', 'doc created')

  const [gotDoc] = datastore.query(
    `select * from example1 where id = '${doc.id}'`
  )
  t.is(gotDoc.value, 'example1', 'doc queried')

  // example1 update doc
  const updatedDocVersion = Object.assign({}, doc, {
    value: 'updated',
    links: [doc.version],
  })

  const updatedDoc = await datastore.update('example1', updatedDocVersion)
  t.is(updatedDoc.value, 'updated', 'doc updated')

  const [gotUpdatedDoc] = datastore.query(
    `select * from example1 where id = '${doc.id}'`
  )
  t.is(gotUpdatedDoc.value, 'updated', 'updated doc queried')

  // example2 create doc
  const example2Doc = await datastore.create('example2', { value: 'example2' })
  const [gotDoc2] = datastore.query(
    `select * from example2 where id = '${example2Doc.id}'`
  )
  t.is(gotDoc2.value, 'example2', 'example2 doc queried')

  // example2 update doc
  const updatedDocVersion2 = Object.assign({}, example2Doc, {
    value: 'updated2',
    links: [example2Doc.version],
  })

  const updatedDoc2 = await datastore.update('example2', updatedDocVersion2)
  t.is(updatedDoc2.value, 'updated2', 'doc updated')

  const [gotUpdatedDoc2] = datastore.query(
    `select * from example2 where id = '${example2Doc.id}'`
  )
  t.is(gotUpdatedDoc2.value, 'updated2', 'updated doc queried')

  // check hypercore block count
  const counts = { example1: 0, example2: 0 }
  for await (const data of datastore.createReadStream()) {
    const blockPrefix = getBlockPrefix(data)
    if (blockPrefix === example1.blockPrefix) {
      counts.example1++
    } else if (blockPrefix === example2.blockPrefix) {
      counts.example2++
    }
  }

  t.is(counts.example1, 2, 'example1 has 2 blocks')
  t.is(counts.example2, 2, 'example2 has 2 blocks')
  t.is(datastore.dataTypes.length, 2, 'datastore has 2 dataTypes')
  t.is(datastore.cores.length, 1, 'datastore has 1 core')
  t.is(datastore.localCore.length, 4, 'datastore core has 4 blocks')
})
