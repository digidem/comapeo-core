import Corestore from 'corestore'
import ram from 'random-access-memory'
import Sqlite from 'better-sqlite3'
import { Mapeo, DataType } from '../index.js'
import { Observation, validateObservation } from 'mapeo-schema'

const corestore = new Corestore(ram)

// writer has to be ready for multi-core-indexer to know it exists
const writer = corestore.get({ name: 'writer' })
await writer.ready()

const observation = new DataType({
  name: 'observation',
  blockPrefix: '6f62', // could make this automatically set based on the name, but that might be too magic
  validate: validateObservation,
  schema: Observation,
})

const sqlite = new Sqlite(':memory:')

/**
 * @type {Mapeo | {{ observation: Observation }}}
 */
const mapeo = new Mapeo({
  corestore,
  sqlite,
  dataTypes: [observation],
})

await mapeo.ready()

const doc = await mapeo.observation.create({
  id: '79be849f934590ec',
  version: '4d822ba6f2e502a5a944f50476217fe90ed5927fe92e71e7d94b0849a65929f3',
  created_at: '2018-12-28T21:25:01.689Z',
  timestamp: '2019-01-13T19:27:39.983Z',
  type: 'observation',
  schemaVersion: 4,
  tags: {
    notes: 'example note',
  },
})

const newDocVersion = Object.assign({}, doc, {
  tags: {
    notes: 'updated note',
  },
  links: [doc.version],
})

await mapeo.observation.update(newDocVersion)
const gotDoc = mapeo.observation.query()

console.log(gotDoc)
