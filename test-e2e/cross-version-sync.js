import { valueOf } from '@comapeo/schema'
import { generate } from '@mapeo/mock-data'
import assert from 'node:assert/strict'
import test from 'node:test'
import {
  connectPeers,
  createManager,
  createOldManagerOnVersion2_0_1,
  invite,
  waitForPeers,
} from './utils.js'

test('syncing @comapeo/core@2.0.1 with the current version', async (t) => {
  const oldManager = await createOldManagerOnVersion2_0_1('old')
  await oldManager.setDeviceInfo({ name: 'old', deviceType: 'mobile' })

  const newManager = createManager('new', t)
  await newManager.setDeviceInfo({ name: 'new', deviceType: 'desktop' })

  const disconnect = connectPeers([oldManager, newManager])
  t.after(disconnect)
  await waitForPeers([oldManager, newManager])

  const [oldManagerPeers, newManagerPeers] = await Promise.all([
    oldManager.listLocalPeers(),
    newManager.listLocalPeers(),
  ])
  assert.equal(oldManagerPeers.length, 1, 'old manager sees 1 peer')
  assert.equal(newManagerPeers.length, 1, 'new manager sees 1 peer')
  assert(
    oldManagerPeers.some((p) => p.deviceId === newManager.deviceId),
    'old manager sees new manager'
  )
  assert(
    newManagerPeers.some((p) => p.deviceId === oldManager.deviceId),
    'new manager sees old manager'
  )

  const projectId = await oldManager.createProject({ name: 'foo bar' })

  await invite({
    projectId,
    invitor: oldManager,
    invitees: [newManager],
  })

  const [oldProject, newProject] = await Promise.all([
    oldManager.getProject(projectId),
    newManager.getProject(projectId),
  ])

  assert.equal(
    (await newProject.$getProjectSettings()).name,
    'foo bar',
    'new manager sees the project'
  )

  oldProject.$sync.start()
  newProject.$sync.start()

  const [oldObservation, newObservation] = await Promise.all([
    oldProject.observation.create(valueOf(generate('observation')[0])),
    newProject.observation.create(valueOf(generate('observation')[0])),
  ])

  await Promise.all([
    oldProject.$sync.waitForSync('full'),
    newProject.$sync.waitForSync('full'),
  ])

  assert(
    await oldProject.observation.getByDocId(newObservation.docId),
    'old project gets observation from new project'
  )
  assert(
    await newProject.observation.getByDocId(oldObservation.docId),
    'new project gets observation from old project'
  )
})
