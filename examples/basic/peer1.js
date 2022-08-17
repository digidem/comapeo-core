import { Mapeo } from '../../index.js'
import { Discovery } from '../../lib/discovery.js'
import PointSchema from '../../tests/fixtures/datatypes/point/schema.js'

const rootKey = Mapeo.createRootKey()
const mapeo = new Mapeo({
  rootKey,
})

const discover = new Discovery({
  identityKeyPair: mapeo.keyManager.getIdentityKeypair(),
  mdns: true,
  dht: false,
})

await discover.ready()

const project = await mapeo.project({ name: 'point' }) // TODO: project config should be an arg here

const point = await project.data({
  name: 'point',
  schema: PointSchema, // TODO: schema for a dataset should probably actually be part of the config
  keyPair: mapeo.createKeyPair('point'), // TODO: could be optional and this is the default
})

point.on('docIndexed', (doc) => {
  console.log('doc indexed', doc.id, doc.version)
})

discover.on('connection', async (connection, peer) => {
  await project.replicate(connection, peer)
  const point = await project.data({ name: 'point' })

  setInterval(async () => {
    await point.put({
      properties: {
        type: 'Point',
        coordinates: [0, 0],
      },
    })
  }, 1000)

  setInterval(async () => {
    await point.download()

    const results = await point.query('SELECT * FROM point')
    console.log('results', results.length)
  }, 1000)

  setTimeout(async () => {
    const results = await point.query('SELECT * FROM point')
    console.log('results', results, results.length)
    console.log('point writer key', point.writerKey)
    process.exit()
  }, 1101)
})

console.log('project key', project.key.toString('hex'))
await discover.join(project.discoveryKey)
