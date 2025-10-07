import test from 'node:test'
import assert from 'node:assert/strict'
import { COORDINATOR_ROLE_ID } from '../src/roles.js'

import {
  removeUndefinedFields,
  createManager,
  createManagers,
  invite,
  waitForSync,
  connectPeers,
} from './utils.js'

test('Project settings create, read, and update operations', async (t) => {
  const manager = createManager('device0', t)

  const projectId = await manager.createProject()

  assert(
    projectId && typeof projectId === 'string',
    'probably valid project ID returned when creating project'
  )

  const project = await manager.getProject(projectId)

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

test('Set project settings after being invited', async (t) => {
  const managers = await createManagers(2, t)
  const [invitor, invitee] = managers
  const disconnectPeers = connectPeers(managers)
  t.after(disconnectPeers)

  const projectId = await invitor.createProject({ name: 'Example' })

  await invite({
    invitor,
    projectId,
    invitees: [invitee],
    roleId: COORDINATOR_ROLE_ID,
  })

  const project = await invitee.getProject(projectId)

  const initialSettings = await project.$getProjectSettings()

  assert.equal(
    initialSettings.name,
    'Example',
    'Invitee sees name before full sync'
  )

  await waitForSync([project], 'full')

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
