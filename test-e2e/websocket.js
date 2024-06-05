// TODO: maybe rename this file?
import test from 'node:test'
import assert from 'node:assert/strict'
import { createManagers, invite, waitForPeers } from './utils.js'
import { MEMBER_ROLE_ID } from '../src/roles.js'
import WebsocketManagerWrapper from '../src/cloud-server/manager-wrapper.js'

// TODO: maybe not the best test
test('websocket e2e test', async (t) => {
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
})
