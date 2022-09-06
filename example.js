import Corestore from 'corestore'
import ram from 'random-access-memory'
import Sqlite from 'better-sqlite3'
import { Mapeo, DataType } from './index.js'

const corestore = new Corestore(ram)

// writer has to be ready for multi-core-indexer to know it exists
const writer = corestore.get({ name: 'writer' })
await writer.ready()

// TODO: actual schema from mapeo-schema
const observation = new DataType({
  name: 'observation',
  blockPrefix: '6f62', // could make this automatically set based on the name, but that might be too magic
  schema: {}
})

const sqlite = new Sqlite(':memory:')

const mapeo = new Mapeo({
  corestore,
  dataTypes: [
    observation
  ],
  sqlite
})

const doc = await mapeo.observation.create({
  properties: {
    test: 'ok'
  }
})

const newDocVersion = Object.assign({}, doc, {
	properties: {
		test: 'cool'
	},
	links: [doc.version]
})
console.log('doc', doc)
await mapeo.observation.update(newDocVersion)

const gotDoc = mapeo.observation.query()

console.log(gotDoc)
