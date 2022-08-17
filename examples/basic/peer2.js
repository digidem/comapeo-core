import { Mapeo } from '../../index.js'
import { Discovery } from '../../lib/discovery.js'
import PointSchema from '../../tests/fixtures/datatypes/point/schema.js'

const projectKey = process.argv[2]
const discoveryKey = Mapeo.getDiscoveryKey(projectKey)

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

discover.on('connection', async (connection, peer) => {
  const project = await mapeo.project({ name: 'point', key: projectKey }) // TODO: project config should be an arg here
  await project.replicate(connection, peer)

  const core = project.core
  await core.update()
  const range = core.download({ start: 0, end: core.length })
  await range.downloaded()

  const point = await project.data({
    name: 'point',
    schema: PointSchema, // TODO: schema for a dataset should probably actually be part of the config
    keyPair: mapeo.createKeyPair('point'), // TODO: could be optional and this is the default
  })

  point.on('docIndexed', (doc) => {
    console.log('doc indexed', doc.id, doc.version)
  })

  setInterval(async () => {
    await point.put({
      properties: {
        type: 'Point',
        coordinates: [1, 1],
      },
    })
  }, 1000)

  let wrote = false
  setInterval(async () => {
    await point.download()

    const results = await point.query('SELECT * FROM point')

    const remoteDoc = results.find(async (doc) => {
      if (doc) {
        const isLocal = await point.isFromLocalWriter(doc)
        return !isLocal
      }

      return false
    })

    console.log('remote doc', remoteDoc)

    if (remoteDoc && !wrote) {
      console.log(
        'overwriting other doc',
        `
				remote version: ${remoteDoc.version}
				local writer key: ${point.writerKey}

				cores: ${JSON.stringify(point.keys)}
			`
      )

      await point.put({
        ...remoteDoc,
        properties: {
          type: 'Point',
          coordinates: [1, 1],
        },
      })
      wrote = true
    }
  }, 1000)

  setTimeout(async () => {
    const results = await point.query('SELECT * FROM point')
    console.log('results', results.length)
    console.log('point writer key', point.writerKey)
    process.exit()
  }, 1101)
})

await discover.join(discoveryKey)
