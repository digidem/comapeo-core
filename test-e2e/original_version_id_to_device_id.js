import { generate } from '@mapeo/mock-data'
import { valueOf } from '@comapeo/schema'
import assert from 'node:assert/strict'
import test from 'node:test'
import {
  connectPeers,
  createManagers,
  invite,
  waitForPeers,
  waitForSync,
} from './utils.js'

test('$originalVersionIdToDeviceId', async (t) => {
  const managers = await createManagers(2, t)

  const disconnectPeers = connectPeers(managers)
  t.after(disconnectPeers)
  await waitForPeers(managers)

  const [creator, member] = managers
  const projectId = await creator.createProject({ name: 'mapeo' })

  await invite({
    invitor: creator,
    invitees: [member],
    projectId,
  })

  const projects = await Promise.all(
    managers.map((m) => m.getProject(projectId))
  )
  const [creatorProject, memberProject] = projects

  creatorProject.$sync.start()
  memberProject.$sync.start()

  const observation = await creatorProject.observation.create(
    valueOf(generate('observation')[0])
  )

  await waitForSync(projects, 'full')

  assert.equal(
    await creatorProject.$originalVersionIdToDeviceId(
      observation.originalVersionId
    ),
    creator.deviceId
  )
  assert.equal(
    await memberProject.$originalVersionIdToDeviceId(
      observation.originalVersionId
    ),
    creator.deviceId
  )
})
