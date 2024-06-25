import assert from 'node:assert/strict'
import test from 'node:test'
import {
  connectPeers,
  createManagers,
  invite,
  waitForPeers,
  waitForSync,
} from './utils.js'

test('$createdByToDeviceId', async (t) => {
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

  const observation = await creatorProject.observation.create({
    schemaName: 'observation',
    attachments: [],
    tags: {},
    refs: [],
    metadata: {},
  })

  await waitForSync(projects, 'full')

  assert.equal(
    await creatorProject.$createdByToDeviceId(observation.createdBy),
    creator.deviceId
  )
  assert.equal(
    await memberProject.$createdByToDeviceId(observation.createdBy),
    creator.deviceId
  )
})
