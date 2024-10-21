import { valueOf } from '@comapeo/schema'
import { generate } from '@mapeo/mock-data'
import { execa } from 'execa'
import createFastify from 'fastify'
import assert from 'node:assert/strict'
import test from 'node:test'
import { pEvent } from 'p-event'
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
/** @import { MapeoProject } from '../src/mapeo-project.js' */
/** @import { State as SyncState } from '../src/sync/sync-api.js' */

// TODO: test bad requests

test('invalid base URLs', async (t) => {
  const manager = createManager('device0', t)
  const projectId = await manager.createProject()
  const project = await manager.getProject(projectId)

  const invalidUrls = [
    '',
    'no-protocol.example',
    'ftp://invalid-protocol.example',
    'http://invalid-protocol.example',
    'https:',
    'https://',
    'https://.',
    'https://..',
    'https://https://',
    'https://https://double-protocol.example',
    'https://bare-domain',
    'https://bare-domain:1234',
    'https://empty-part.',
    'https://.empty-part',
    'https://spaces .in-part',
    'https://spaces.in part',
    'https://bad-port.example:-1',
    'https://username@has-auth.example',
    'https://username:password@has-auth.example',
    'https://has-query.example/?foo=bar',
    'https://has-hash.example/#hash',
    `https://${'x'.repeat(2000)}.example`,
    // We may want to support this someday. See <https://github.com/digidem/comapeo-core/issues/908>.
    'https://has-pathname.example/p',
  ]
  await Promise.all(
    invalidUrls.map((url) =>
      assert.rejects(
        () => project.$member.addServerPeer(url),
        /base url is invalid/i,
        `${url} should be invalid`
      )
    )
  )

  const hasServerPeer = (await project.$member.getMany()).some(
    (member) => member.deviceType === 'selfHostedServer'
  )
  assert(!hasServerPeer, 'no server peers should be added')
})

test("fails if we can't connect to the server", async (t) => {
  const manager = createManager('device0', t)
  const projectId = await manager.createProject()
  const project = await manager.getProject(projectId)

  const url = 'http://localhost:9999'
  await assert.rejects(
    () =>
      project.$member.addServerPeer(url, {
        dangerouslyAllowInsecureConnections: true,
      }),
    {
      message: /Failed to add server peer due to network error/,
    }
  )
})

test(
  "fails if server doesn't return a 200",
  { concurrency: true },
  async (t) => {
    const manager = createManager('device0', t)
    const projectId = await manager.createProject()
    const project = await manager.getProject(projectId)

    await Promise.all(
      [204, 302, 400, 500].map((statusCode) =>
        t.test(`when returning a ${statusCode}`, async (t) => {
          const fastify = createFastify()
          fastify.post('/projects', (_req, reply) => {
            reply.status(statusCode).send()
          })
          const url = await fastify.listen()
          t.after(() => fastify.close())

          await assert.rejects(
            () =>
              project.$member.addServerPeer(url, {
                dangerouslyAllowInsecureConnections: true,
              }),
            {
              message: `Failed to add server peer due to HTTP status code ${statusCode}`,
            }
          )
        })
      )
    )
  }
)

test(
  "fails if server doesn't return data in the right format",
  { concurrency: true },
  async (t) => {
    const manager = createManager('device0', t)
    const projectId = await manager.createProject()
    const project = await manager.getProject(projectId)

    await Promise.all(
      [
        '',
        '{bad_json',
        JSON.stringify({ data: {} }),
        JSON.stringify({ data: { deviceId: 123 } }),
        JSON.stringify({ deviceId: 'not under "data"' }),
      ].map((responseData) =>
        t.test(`when returning ${responseData}`, async (t) => {
          const fastify = createFastify()
          fastify.post('/projects', (_req, reply) => {
            reply.header('Content-Type', 'application/json').send(responseData)
          })
          const url = await fastify.listen()
          t.after(() => fastify.close())

          await assert.rejects(
            () =>
              project.$member.addServerPeer(url, {
                dangerouslyAllowInsecureConnections: true,
              }),
            {
              message:
                "Failed to add server peer because we couldn't parse the response",
            }
          )
        })
      )
    )
  }
)

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
  assert.deepEqual(
    new URL(serverPeer.selfHostedServerDetails?.baseUrl || ''),
    new URL(serverBaseUrl),
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
  const serverDeviceIdPromise = managerAProject.$member
    .getMany()
    .then((members) => {
      const serverMember = members.find(
        (member) => member.deviceType === 'selfHostedServer'
      )
      assert(serverMember, 'Manager A must have a server member')
      return serverMember.deviceId
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
  const serverDeviceId = await serverDeviceIdPromise
  await waitForSyncWithServer(managerAProject, serverDeviceId)
  managerAProject.$sync.disconnectServers()
  managerAProject.$sync.stop()
  await assert.rejects(
    () => managerBProject.observation.getByDocId(observation.docId),
    "manager B doesn't see observation yet"
  )

  // Manager B sees observation after syncing
  managerBProject.$sync.connectServers()
  managerBProject.$sync.start()
  await waitForSyncWithServer(managerBProject, serverDeviceId)
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
    'flyctl',
    ['apps', 'create', '--name', appName, '--org', 'digidem', '--json'],
    { stdio: 'inherit' }
  )
  t.after(async () => {
    await execa('flyctl', ['apps', 'destroy', appName, '-y'], {
      stdio: 'inherit',
    })
  })
  await execa(
    'flyctl',
    ['secrets', 'set', 'SERVER_BEARER_TOKEN=ignored', '--app', appName],
    { stdio: 'inherit' }
  )
  await execa(
    'flyctl',
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
  const server = createServer({
    ...getManagerOptions('test server'),
    serverName: 'test server',
    serverBearerToken: 'ignored',
  })
  const address = await server.listen()
  t.after(() => server.close())
  return address
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

/**
 * @param {MapeoProject} project
 * @param {string} serverDeviceId
 * @returns {Promise<void>}
 */
async function waitForSyncWithServer(project, serverDeviceId) {
  const initialState = project.$sync.getState()
  if (isSyncedWithServer(initialState, serverDeviceId)) return
  await pEvent(project.$sync, 'sync-state', (state) =>
    isSyncedWithServer(state, serverDeviceId)
  )
}

/**
 * @param {SyncState} syncState
 * @param {string} serverDeviceId
 * @returns {boolean}
 */
function isSyncedWithServer(syncState, serverDeviceId) {
  const serverSyncState = syncState.remoteDeviceSyncState[serverDeviceId]
  return Boolean(
    serverSyncState &&
      serverSyncState.initial.want === 0 &&
      serverSyncState.initial.wanted === 0 &&
      serverSyncState.data.want === 0 &&
      serverSyncState.data.wanted === 0
  )
}
