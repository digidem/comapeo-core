import test from 'brittle'

import ram from 'random-access-memory'
import Corestore from 'corestore'
import Sqlite from 'better-sqlite3'
import { Point } from './fixtures/datatypes/point/index.js'
import { createCoreKeyPair } from './helpers/index.js'

test('point store example', async (t) => {
  t.plan(2)
  const keyPair = createCoreKeyPair('point')
  const sqlite = new Sqlite(':memory:')
  const corestore = new Corestore(ram)

  const pointstore = new Point({
    corestore,
    keyPair,
    sqlite,
  })

  await pointstore.ready()

  t.is(pointstore.name, 'point', 'name is set')

  const doc = await pointstore.put({
    properties: {
      type: 'Point',
      coordinates: [0, 0],
    },
  })

  setTimeout(async () => {
    const results = await pointstore.query('SELECT * FROM point')
    t.is(results[0].version, doc.version)
  }, 1000)
})
