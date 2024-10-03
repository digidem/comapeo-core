import { valueOf } from '@comapeo/schema'
import { generate } from '@mapeo/mock-data'
import assert from 'node:assert/strict'
import test from 'node:test'
import { setTimeout as delay } from 'node:timers/promises'
import { MEMBER_ROLE_ID } from '../src/roles.js'
import createServer from '../src/server/app.js'
import {
  connectPeers,
  createManager,
  createManagers,
  getManagerOptions,
  invite,
  waitForPeers,
} from './utils.js'
/** @import { MapeoManager } from '../src/mapeo-manager.js' */

// TODO: test invalid base URL
// TODO: test bad requests
// TODO: test other base URLs

test('adding a server peer', async (t) => {
  const manager = createManager('device0', t)
  await manager.setDeviceInfo({ name: 'device0', deviceType: 'mobile' }) // TODO: necessary?
  const projectId = await manager.createProject()
  const project = await manager.getProject(projectId)

  const serverBaseUrl = await createTestServer(t)

  await project.$member.addServerPeer(serverBaseUrl, {
    dangerouslyAllowInsecureConnections: true,
  })

  const members = await project.$member.getMany()
  // TODO: Ensure that this peer doesn't exist before adding?
  const serverPeer = members.find(
    (member) => member.deviceType === 'selfHostedServer'
  )
  assert(serverPeer, 'expected a server peer to be found by the client')
  assert.equal(serverPeer.name, 'test server', 'server peers have name')
  assert.equal(
    serverPeer.role.roleId,
    MEMBER_ROLE_ID,
    'server peers are added as regular members'
  )
  assert.equal(
    serverPeer.selfHostedServerDetails?.baseUrl,
    'https://mapeo.example',
    'server peer stores base URL'
  )
})

test("can't add a server to two different projects", async (t) => {
  const [managerA, managerB] = await createManagers(2, t, 'mobile')
  const projectIdA = await managerA.createProject()
  const projectIdB = await managerB.createProject()
  const projectA = await managerA.getProject(projectIdA)
  const projectB = await managerB.getProject(projectIdB)

  const serverHost = await createTestServer(t)

  await projectA.$member.addServerPeer(serverHost, {
    dangerouslyAllowInsecureConnections: true,
  })

  await assert.rejects(async () => {
    await projectB.$member.addServerPeer(serverHost, {
      dangerouslyAllowInsecureConnections: true,
    })
  }, Error)
})

test.only('TODO', { timeout: 2 ** 30 }, async (t) => {
  // create two managers
  const managers = await createManagers(2, t, 'mobile')
  const [managerA, managerB] = managers

  // manager 1 sets up server
  const projectId = await managerA.createProject({ name: 'foo' })
  const managerAProject = await managerA.getProject(projectId)
  const serverBaseUrl = await createTestServer(t)
  await managerAProject.$member.addServerPeer(serverBaseUrl, {
    dangerouslyAllowInsecureConnections: true,
  })

  // TODO: remove this
  await new Promise((resolve) => {
    setTimeout(resolve, 3000)
  })

  // manager 1, invite manager 2
  const disconnect1 = connectPeers(managers)
  t.after(disconnect1)
  await waitForPeers(managers)
  await invite({ invitor: managerA, invitees: [managerB], projectId })
  const managerBProject = await managerB.getProject(projectId)

  // sync managers (to tell manager 2 about server)
  // TODO: We should be calling this instead of `delay`, but there [is a bug][0] that prevents this.
  // [0]: https://github.com/digidem/comapeo-core/pull/887
  // const projects = [managerAProject, managerBProject]
  // await waitForSync(projects, 'initial')
  await delay(3000)
  const members = await managerBProject.$member.getMany() // TODO: maybe rename this
  const serverPeer = members.find(
    (member) => member.deviceType === 'selfHostedServer'
  )
  assert(serverPeer, 'expected a server peer to be found by the client')

  // disconnect managers
  await disconnect1()
  await waitForNoPeersToBeConnected(managerA)
  await waitForNoPeersToBeConnected(managerB)

  // Start both syncing data
  managerAProject.$sync.start()
  managerBProject.$sync.start()
  console.log('@@@@', 'about to connect servers')
  managerAProject.$sync.connectServers()
  managerBProject.$sync.connectServers()
  console.log('@@@@', 'connected servers')
  await waitForSyncWithServer() // TODO this is bogus and silly, just used for waiting
  console.log('@@@@', 'waited a bit')

  // manager 1 adds data, syncs with server
  const observation = await managerAProject.observation.create(
    valueOf(generate('observation')[0])
  )
  await waitForSyncWithServer()

  // Check manager 2 doesn't have the data
  await assert.rejects(() =>
    managerBProject.observation.getByDocId(observation.docId)
  )

  // manager 2 now has data from manager 1, even though it wasn't connected to manager 1 directly
  await waitForSyncWithServer()
  assert(
    await managerBProject.observation.getByDocId(observation.docId),
    'manager B now sees data'
  )
})

/**
 *
 * @param {import('node:test').TestContext} t
 * @returns {Promise<string>} server base URL
 */
async function createTestServer(t) {
  // TODO: Use a port that's guaranteed to be open
  const port = 9876
  const server = createServer({
    ...getManagerOptions('test server'),
    serverName: 'test server',
    serverPublicBaseUrl: 'http://localhost:' + port,
  })
  const serverAddress = await server.listen({ port })
  t.after(() => server.close())
  return serverAddress
}

/**
 * @param {MapeoManager} manager
 * @returns {Promise<void>}
 */
function waitForNoPeersToBeConnected(manager) {
  return new Promise((resolve) => {
    const checkIfDone = async () => {
      const isDone = (await manager.listLocalPeers()).every(
        (peer) => peer.status === 'disconnected'
      )
      if (isDone) {
        manager.off('local-peers', checkIfDone)
        resolve()
      }
    }
    manager.on('local-peers', checkIfDone)
    checkIfDone()
  })
}

function waitForSyncWithServer() {
  // TODO: This is fake
  return new Promise((resolve) => {
    setTimeout(resolve, 3000)
  })
}
