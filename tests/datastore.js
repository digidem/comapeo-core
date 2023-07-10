import test from 'brittle'

import { createDatastore } from './helpers/datastore.js'
import { replicate, waitForCores, getKeys } from './helpers/core-manager.js'
import { addCores, waitForIndexing } from './helpers/index.js'

test('datastore - create, update, query two datatypes', async (t) => {
  t.plan(7)

  const example = {
    name: 'Observation',
    schemaType: 'Observation',
    schemaVersion: 5,
    extraColumns: `
      created INTEGER,
      updated INTEGER,
      timestamp INTEGER,
      authorId TEXT,
      tags TEXT
    `,
  }

  const { datastore } = await createDatastore({
    dataTypes: [example],
  })

  await datastore.ready()

  t.ok(datastore, 'datastore created')

  // create doc
  const doc = await datastore.create('Observation', {
    tags: { value: 'example' },
  })

  t.is(doc.tags.value, 'example', 'doc created')

  const gotDoc = datastore.getById('Observation', doc.id)
  t.is(gotDoc.tags.value, 'example', 'doc queried')

  // update doc
  const updatedDocVersion = Object.assign({}, doc, {
    tags: { value: 'updated' },
    links: [doc.version],
  })

  const updatedDoc = await datastore.update('Observation', updatedDocVersion)

  t.is(updatedDoc.tags.value, 'updated', 'doc updated')

  const [gotUpdatedDoc] = datastore.query(
    `select * from Observation where id = '${doc.id}'`
  )
  t.is(gotUpdatedDoc.tags.value, 'updated', 'updated doc queried')

  // check hypercore block count
  const [core] = datastore.cores
  t.is(core.length, 2, 'example has 2 blocks')
  t.is(datastore.cores.length, 1, 'datastore has 1 core')
})

test('datastore - replicate two datastores', async (t) => {
  t.plan(3)

  const example = {
    name: 'Observation',
    schemaType: 'Observation',
    schemaVersion: 5,
    extraColumns: `
      created INTEGER,
      updated INTEGER,
      timestamp INTEGER,
      authorId TEXT,
      tags TEXT
    `,
  }

  const peer1 = await createDatastore({
    dataTypes: [example],
  })

  const peer2 = await createDatastore({
    dataTypes: [example],
  })

  await addCores([peer1.datastore, peer2.datastore])
  await waitForCores(peer1.coreManager, getKeys(peer2.coreManager, 'data'))
  await waitForCores(peer2.coreManager, getKeys(peer1.coreManager, 'data'))

  const { core: peer1Core } = peer1.coreManager.getWriterCore('data')
  await peer1Core.ready()
  const peer2Core = peer2.coreManager.getCoreByKey(peer1Core.key)
  await peer2Core.ready()

  const { rsm, destroy } = replicate(peer1.coreManager, peer2.coreManager)

  for (const sm of rsm) {
    sm.enableNamespace('data')
  }

  const doc = await peer1.datastore.create('Observation', {
    tags: { value: 'example' },
  })
  await new Promise((res) => setTimeout(res, 200))
  t.is(peer1Core.length, peer2Core.length)
  await peer2Core.download({ start: 0, end: peer1Core.length }).done()
  await waitForIndexing([peer2.datastore])

  const peer2Doc = peer2.datastore.getById('Observation', doc.id)

  t.ok(doc, 'doc created')
  t.is(peer2Doc.tags.value, 'example', 'doc replicated')

  t.teardown(async () => {
    await destroy()
  })
})
