import { valueOf } from '@comapeo/schema'
import { generate } from '@mapeo/mock-data'
import assert from 'node:assert/strict'
import test from 'node:test'
import { setTimeout as delay } from 'node:timers/promises'
import { MapeoCloudServer } from '../src/cloud-server/mapeo-cloud-server.js'
import { createManagers, waitForPeers, waitForSync } from './utils.js'
import { MEMBER_ROLE_ID } from '../src/roles.js'

test('websocket e2e test', async (t) => {
  const managers = await createManagers(2, t)
  const [mobileManager, cloudManager] = managers

  const cloudWrapper = new MapeoCloudServer(cloudManager)
  const port = 1337 // TODO
  await cloudWrapper.listen({ port })

  const hostname = `localhost:${port}`

  mobileManager.connectWebsocketPeer(hostname)

  t.after(async () => {
    mobileManager.disconnectWebsocketPeer(hostname)
    await cloudWrapper.close()
  })

  await waitForPeers(managers)

  const mobileDeviceId = mobileManager.getDeviceInfo().deviceId
  const cloudDeviceId = cloudManager.getDeviceInfo().deviceId
  assert.deepEqual(
    (await cloudManager.listLocalPeers()).map((p) => p.deviceId),
    [mobileDeviceId]
  )
  assert.deepEqual(
    (await mobileManager.listLocalPeers()).map((p) => p.deviceId),
    [cloudDeviceId]
  )

  const projectId = await mobileManager.createProject({ name: 'mapeo' })
  const mobileProject = await mobileManager.getProject(projectId)

  await mobileProject.$member.invite(cloudManager.deviceId, {
    roleId: MEMBER_ROLE_ID,
  })

  // We don't get an event when the cloud manager adds the project, so we have
  // to poll.
  const cloudProject = await runWithRetries(() =>
    cloudManager.getProject(projectId)
  )

  mobileProject.$sync.start()
  cloudProject.$sync.start()

  const projects = [mobileProject, cloudProject]

  const [observation1, observation2] = await Promise.all(
    projects.map((project) =>
      project.observation.create(valueOf(generate('observation')[0]))
    )
  )

  await waitForSync(projects, 'full')

  assert(
    await cloudProject.observation.getByDocId(observation1.docId),
    'Cloud project gets observation created by mobile client'
  )
  assert(
    await mobileProject.observation.getByDocId(observation2.docId),
    'Mobile project gets observation created by cloud'
  )
})

/**
 * Run a function until it resolves, or until the maximum number of attempts is
 * reached.
 *
 * @template T
 * @param {() => Promise<T>} fn
 * @returns {Promise<T>}
 */
async function runWithRetries(fn) {
  /** @type {unknown} */ let lastError
  for (let ms = 50; ms <= 5000; ms **= 1.1) {
    console.log({ ms })
    try {
      return await fn()
    } catch (err) {
      lastError = err
    }
    await delay(ms)
  }
  throw lastError
}
