// TODO: maybe rename this file?
import test from 'node:test'
import assert from 'node:assert/strict'
import { createManagers, invite, waitForPeers, waitForSync } from './utils.js'
import { MEMBER_ROLE_ID } from '../src/roles.js'
import WebsocketManagerWrapper from '../src/cloud-server/manager-wrapper.js'

// TODO: maybe not the best test
test('websocket e2e test', async (t) => {
  console.log('Starting test at ' + new Date().toISOString())

  const managers = await createManagers(2, t)
  const [mobileManager, cloudManager] = managers

  const cloudWrapper = new WebsocketManagerWrapper(cloudManager)
  const port = 1337 // TODO
  await cloudWrapper.listen({ port })

  const address = `ws://localhost:${port}`
  mobileManager.connectDnsPeer({ address })

  t.after(async () => {
    mobileManager.disconnectDnsPeer({ address })
    await cloudWrapper.close()
  })

  await waitForPeers(managers)

  const projectId = await mobileManager.createProject({ name: 'mapeo' })
  await invite({
    invitor: mobileManager,
    invitees: [cloudManager],
    projectId,
    roleId: MEMBER_ROLE_ID,
  })

  const projects = await Promise.all(
    managers.map((m) => m.getProject(projectId))
  )
  const [mobileProject, cloudProject] = projects

  const [observation1, observation2] = await Promise.all(
    projects.map((project) =>
      project.observation.create({
        schemaName: 'observation',
        attachments: [],
        tags: {},
        refs: [],
        metadata: {},
      })
    )
  )

  console.log('Waiting for sync...')
  await waitForSync(projects, 'full')
  console.log('Synced.')

  assert(
    await cloudProject.observation.getByDocId(observation1.docId),
    'Cloud project gets observation created by mobile client'
  )
  assert(
    await mobileProject.observation.getByDocId(observation2.docId),
    'Mobile project gets observation created by cloud'
  )
})
