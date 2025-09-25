import test from 'node:test'
import assert from 'node:assert/strict'

import { MapeoProject } from '../src/mapeo-project.js'
import { removeUndefinedFields, createManager } from './utils.js'

test('Project settings create, read, and update operations', async (t) => {
  const manager = createManager('test', t)

  const projectId = await manager.createProject()

  assert(
    projectId && typeof projectId === 'string',
    'probably valid project ID returned when creating project'
  )

  const project = await manager.getProject(projectId)

  assert(
    project instanceof MapeoProject,
    'manager.getProject() returns MapeoProject instance'
  )

  const initialSettings = await project.$getProjectSettings()

  assert.deepEqual(
    removeUndefinedFields(initialSettings),
    {
      sendStats: false,
    },
    'project has no settings after creation'
  )

  const expectedSettings = {
    name: 'updated',
    projectColor: '#123456',
    projectDescription: 'cool project',
  }

  const updatedSettings = await project.$setProjectSettings(expectedSettings)

  assert.equal(
    updatedSettings.name,
    expectedSettings.name,
    'updatable settings change'
  )

  const settings = await project.$getProjectSettings()

  assert.deepEqual(
    settings,
    updatedSettings,
    'retrieved settings are equivalent to most recently updated'
  )
})
