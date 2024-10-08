import { valueOf } from '@comapeo/schema'
import { generate } from '@mapeo/mock-data'
import assert from 'node:assert/strict'
import test from 'node:test'
import { execa } from 'execa'
import { MEMBER_ROLE_ID } from '../src/roles.js'
import createServer from '../src/server/app.js'
import {
  connectPeers,
  createManager,
  createManagers,
  getManagerOptions,
  invite,
  waitForPeers,
  waitForSync,
} from './utils.js'
/** @import { MapeoManager } from '../src/mapeo-manager.js' */

// TODO: test invalid base URL
// TODO: test bad requests
// TODO: test other base URLs

test('adding a server peer', async (t) => {
  const manager = createManager('device0', t)
  const projectId = await manager.createProject()
  const project = await manager.getProject(projectId)

  const serverBaseUrl = await createTestServer(t)

  const hasServerPeerBeforeAdding = (await project.$member.getMany()).some(
    (member) => member.deviceType === 'selfHostedServer'
  )
  assert(!hasServerPeerBeforeAdding, 'no server peers before adding')

  await project.$member.addServerPeer(serverBaseUrl, {
    dangerouslyAllowInsecureConnections: true,
  })

  const serverPeer = (await project.$member.getMany()).find(
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
    serverBaseUrl,
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

test('data can be synced via a server', async (t) => {
  const [managers, serverBaseUrl] = await Promise.all([
    createManagers(2, t, 'mobile'),
    createTestServer(t),
  ])
  const [managerA, managerB] = managers

  // Manager A: create project and add the server to it
  const projectId = await managerA.createProject({ name: 'foo' })
  const managerAProject = await managerA.getProject(projectId)
  t.after(() => managerAProject.$sync.disconnectServers())
  await managerAProject.$member.addServerPeer(serverBaseUrl, {
    dangerouslyAllowInsecureConnections: true,
  })

  // Add Manager B to project
  const disconnectManagers = connectPeers(managers)
  t.after(disconnectManagers)
  await waitForPeers(managers)
  await invite({ invitor: managerA, invitees: [managerB], projectId })
  const managerBProject = await managerB.getProject(projectId)
  t.after(() => managerBProject.$sync.disconnectServers())

  // Sync managers to tell Manager B about the server
  const projects = [managerAProject, managerBProject]
  await waitForSync(projects, 'initial')
  const managerBMembers = await managerBProject.$member.getMany()
  const serverPeer = managerBMembers.find(
    (member) => member.deviceType === 'selfHostedServer'
  )
  assert(serverPeer, 'expected a server peer to be found by the client')

  // Manager A adds data that Manager B doesn't know about
  await disconnectManagers()
  await waitForNoPeersToBeConnected(managerA)
  await waitForNoPeersToBeConnected(managerB)
  managerAProject.$sync.start()
  managerAProject.$sync.connectServers()
  const observation = await managerAProject.observation.create(
    valueOf(generate('observation')[0])
  )
  await waitForSyncWithServer()
  managerAProject.$sync.disconnectServers()
  managerAProject.$sync.stop()
  await assert.rejects(
    () => managerBProject.observation.getByDocId(observation.docId),
    "manager B doesn't see observation yet"
  )

  // Manager B sees observation after syncing
  managerBProject.$sync.connectServers()
  managerBProject.$sync.start()
  await waitForSyncWithServer()
  assert(
    await managerBProject.observation.getByDocId(observation.docId),
    'manager B now sees data'
  )
})

/**
 * @param {import('node:test').TestContext} t
 * @returns {Promise<string>} server base URL
 */
async function createTestServer(t) {
  if (process.env.REMOTE_TEST_SERVER) {
    return createRemoteTestServer(t)
  } else {
    return createLocalTestServer(t)
  }
}

/**
 * @param {import('node:test').TestContext} t
 * @returns {Promise<string>} server base URL
 */
async function createRemoteTestServer(t) {
  const appName = 'comapeo-cloud-test-' + Math.random().toString(36).slice(8)
  await execa(
    'fly',
    ['apps', 'create', '--name', appName, '--org', 'digidem', '--json'],
    { stdio: 'inherit' }
  )
  t.after(async () => {
    await execa('fly', ['apps', 'destroy', appName, '-y'], { stdio: 'inherit' })
  })
  await execa(
    'fly',
    ['secrets', 'set', 'SERVER_BEARER_TOKEN=ignored', '--app', appName],
    { stdio: 'inherit' }
  )
  await execa(
    'fly',
    ['deploy', '--app', appName, '-e', 'SERVER_NAME=test server'],
    {
      stdio: 'inherit',
    }
  )
  return `https://${appName}.fly.dev/`
}

/**
 * @param {import('node:test').TestContext} t
 * @returns {Promise<string>} server base URL
 */
async function createLocalTestServer(t) {
  // TODO: Use a port that's guaranteed to be open
  const port = 9876
  const server = createServer({
    ...getManagerOptions('test server'),
    serverName: 'test server',
    serverBearerToken: 'ignored',
  })
  await server.listen({ port })
  t.after(() => server.close())
  return `http://localhost:${port}/`
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
  // TODO: This is fake!
  return new Promise((resolve) => {
    setTimeout(resolve, 3000)
  })
}
