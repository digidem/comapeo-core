import test from 'brittle'

import ram from 'random-access-memory'
import Sqlite from 'better-sqlite3'
import Corestore from 'corestore'
import { Project } from '../lib/project.js'
import { createCoreKeyPair } from './helpers/index.js'
import PointSchema from './fixtures/datatypes/point/schema.js'

test('point store example', async (t) => {
  t.plan(2)
  const sqlite = new Sqlite(':memory:')
  const corestore = new Corestore(ram)
  const projectKeyPair = createCoreKeyPair('pointproject')
  const project = new Project({
    name: 'point',
    corestore,
    keyPair: projectKeyPair,
    sqlite,
    createKeyPair: () => {
      return createCoreKeyPair('point')
    },
  })

  await project.ready()
  const keyPair = createCoreKeyPair('point')
  const point = await project.data({
    name: 'point',
    keyPair,
    schema: PointSchema,
  })

  point.on('docIndexed', (doc) => {
    t.ok(doc, 'docIndexed event emitted')
  })

  const doc = await point.put({
    properties: {
      type: 'Point',
      coordinates: [0, 0],
    },
  })

  const results = await point.query('SELECT * FROM point')
  t.is(results[0].version, doc.version)
})
