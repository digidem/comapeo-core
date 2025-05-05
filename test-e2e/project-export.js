import test from 'node:test'
import assert from 'node:assert/strict'
import { KeyManager } from '@mapeo/crypto'
import RAM from 'random-access-memory'
import Fastify from 'fastify'
import * as b4a from 'b4a'

import { MapeoManager } from '../src/mapeo-manager.js'
// import { MapeoProject } from '../src/mapeo-project.js'

test('Project export empty GeoJSON to stream', async () => {
  const fastify = Fastify()

  const manager = new MapeoManager({
    rootKey: KeyManager.generateRootKey(),
    projectMigrationsFolder: new URL('../drizzle/project', import.meta.url)
      .pathname,
    clientMigrationsFolder: new URL('../drizzle/client', import.meta.url)
      .pathname,
    dbFolder: ':memory:',
    coreStorage: () => new RAM(),
    fastify,
  })

  const projectId = await manager.createProject()
  const project = await manager.getProject(projectId)

  const stream = project.exportGeoJSONStream()

  const chunks = []
  for await (const chunk of stream) {
    chunks.push(chunk)
  }

  const wholeBuffer = b4a.concat(chunks)

  assert(wholeBuffer.length > 0, 'Exported buffer to empty')

  const asString = b4a.toString(wholeBuffer, 'utf-8')

  const parsed = JSON.parse(asString)

  assert.equal(
    parsed.type,
    'FeatureCollection',
    'Exported GeoJSON is a FeatureCollection'
  )
  assert.deepEqual(
    parsed.features,
    [],
    'Exported GeoJSON has empty features array'
  )
})
