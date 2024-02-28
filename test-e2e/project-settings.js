// @ts-check
import test from 'tape'
import { KeyManager } from '@mapeo/crypto'
import RAM from 'random-access-memory'
import Fastify from 'fastify'

import { MapeoManager } from '../src/mapeo-manager.js'
import { MapeoProject } from '../src/mapeo-project.js'
import { removeUndefinedFields } from './utils.js'

test('Project settings create, read, and update operations', async (t) => {
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

  t.ok(
    projectId && typeof projectId === 'string',
    'probably valid project ID returned when creating project'
  )

  const project = await manager.getProject(projectId)

  t.ok(
    project instanceof MapeoProject,
    'manager.getProject() returns MapeoProject instance'
  )

  const initialSettings = await project.$getProjectSettings()

  t.deepEqual(
    removeUndefinedFields(initialSettings),
    {},
    'project has no settings when initially created'
  )

  const expectedSettings = {
    name: 'updated',
  }

  const updatedSettings = await project.$setProjectSettings(expectedSettings)

  t.is(updatedSettings.name, expectedSettings.name, 'updatable settings change')

  const settings = await project.$getProjectSettings()

  t.deepEqual(
    settings,
    updatedSettings,
    'retrieved settings are equivalent to most recently updated'
  )
})
