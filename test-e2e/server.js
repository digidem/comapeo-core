import { valueOf } from '@comapeo/schema'
import { setTimeout as delay } from 'node:timers/promises'
import { generate } from '@mapeo/mock-data'
import { execa } from 'execa'
import createFastify from 'fastify'
import assert from 'node:assert/strict'
import test, { mock } from 'node:test'
import { pEvent } from 'p-event'
import { LEFT_ROLE_ID, MEMBER_ROLE_ID } from '../src/roles.js'
import comapeoServer from '../src/server/app.js'
import {
  connectPeers,
  createManager,
  createManagers,
  getManagerOptions,
  invite,
  waitForPeers,
  waitForSync,
} from './utils.js'
/** @import { FastifyInstance } from 'fastify' */
/** @import { MapeoManager } from '../src/mapeo-manager.js' */
/** @import { MapeoProject } from '../src/mapeo-project.js' */
/** @import { MemberInfo } from '../src/member-api.js' */
/** @import { State as SyncState } from '../src/sync/sync-api.js' */

const USE_REMOTE_SERVER = Boolean(process.env.REMOTE_TEST_SERVER)

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
        {
          code: 'INVALID_URL',
          message: /base url is invalid/i,
        },
        `${url} should be invalid`
      )
    )
  )

  assert(!(await findServerPeer(project)), 'no server peers should be added')
})

test("fails if we can't connect to the server", async (t) => {
  const manager = createManager('device0', t)
  const projectId = await manager.createProject()
  const project = await manager.getProject(projectId)

  const serverBaseUrl = 'http://localhost:9999'
  await assert.rejects(
    () =>
      project.$member.addServerPeer(serverBaseUrl, {
        dangerouslyAllowInsecureConnections: true,
      }),
    {
      code: 'NETWORK_ERROR',
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
          fastify.put('/projects', (_req, reply) => {
            reply.status(statusCode).send()
          })
          const serverBaseUrl = await fastify.listen()
          t.after(() => fastify.close())

          await assert.rejects(
            () =>
              project.$member.addServerPeer(serverBaseUrl, {
                dangerouslyAllowInsecureConnections: true,
              }),
            {
              code: 'INVALID_SERVER_RESPONSE',
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
          fastify.put('/projects', (_req, reply) => {
            reply.header('Content-Type', 'application/json').send(responseData)
          })
          const serverBaseUrl = await fastify.listen()
          t.after(() => fastify.close())

          await assert.rejects(
            () =>
              project.$member.addServerPeer(serverBaseUrl, {
                dangerouslyAllowInsecureConnections: true,
              }),
            {
              code: 'INVALID_SERVER_RESPONSE',
              message:
                "Failed to add server peer because we couldn't parse the response",
            }
          )
        })
      )
    )
  }
)

test("fails if first request succeeds but sync doesn't", async (t) => {
  const manager = createManager('device0', t)
  const projectId = await manager.createProject()
  const project = await manager.getProject(projectId)

  const fastify = createFastify()
  fastify.put('/projects', (_req, reply) => {
    reply.send({ data: { deviceId: 'abc123' } })
  })
  const serverBaseUrl = await fastify.listen()
  t.after(() => fastify.close())

  await assert.rejects(
    () =>
      project.$member.addServerPeer(serverBaseUrl, {
        dangerouslyAllowInsecureConnections: true,
      }),
    (err) => {
      assert(err instanceof Error, 'receives an error')
      assert('code' in err, 'gets an error code')
      assert.equal(
        err.code,
        'INVALID_SERVER_RESPONSE',
        'gets the correct error code'
      )
      assert(err.cause instanceof Error, 'error has a cause')
      assert(err.cause.message.includes('404'), 'error cause is an HTTP 404')
      return true
    }
  )
})

test('adding a server peer', async (t) => {
  const manager = createManager('device0', t)
  const projectId = await manager.createProject()
  const project = await manager.getProject(projectId)

  const { serverBaseUrl } = await createTestServer(t)

  assert(!(await findServerPeer(project)), 'no server peers before adding')

  await project.$member.addServerPeer(serverBaseUrl, {
    dangerouslyAllowInsecureConnections: true,
  })

  const serverPeer = await findServerPeer(project)
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

test.skip('removing a server peer', async (t) => {
  const manager = createManager('device0', t)
  const projectId = await manager.createProject()
  const project = await manager.getProject(projectId)

  const testServer = await createTestServer(t)
  const { serverBaseUrl } = testServer

  await project.$member.addServerPeer(serverBaseUrl, {
    dangerouslyAllowInsecureConnections: true,
  })

  const serverPeer = await findServerPeer(project)
  assert(serverPeer, 'server peer should be added')

  await project.$member.removeServerPeer(serverPeer.deviceId)

  assert.equal(
    (await findServerPeer(project))?.role.roleId,
    LEFT_ROLE_ID,
    'we should believe the server is gone'
  )

  // If we don't have access to the server (e.g., if it's remote), we can't run
  // this part of the test. We could probably support this, but it's a lot more
  // work for limited benefit.
  if ('server' in testServer) {
    await testServer.server.close()

    const bogusServer = createFastify()
    const anyRequestHandler = mock.fn(() => 'should not happen')
    bogusServer.all('*', anyRequestHandler)

    const { port } = new URL(serverBaseUrl)
    const bogusServerAddress = await bogusServer.listen({
      // host,
      port: Number(port),
    })
    t.after(() => bogusServer.close())
    assert.equal(
      bogusServerAddress,
      serverBaseUrl,
      'Bogus server should have same address as "real" test server. Test is not set up correctly.'
    )

    project.$sync.connectServers()

    await delay(500)

    assert.strictEqual(
      anyRequestHandler.mock.calls.length,
      0,
      'no connection was made to the server'
    )
  }
})

test("can't add a server to two different projects", async (t) => {
  const [managerA, managerB] = await createManagers(2, t, 'mobile')
  const projectIdA = await managerA.createProject()
  const projectIdB = await managerB.createProject()
  const projectA = await managerA.getProject(projectIdA)
  const projectB = await managerB.getProject(projectIdB)

  const { serverBaseUrl } = await createTestServer(t)

  await projectA.$member.addServerPeer(serverBaseUrl, {
    dangerouslyAllowInsecureConnections: true,
  })

  await assert.rejects(async () => {
    await projectB.$member.addServerPeer(serverBaseUrl, {
      dangerouslyAllowInsecureConnections: true,
    })
  }, Error)
})

test('data can be synced via a server', async (t) => {
  const [managers, { serverBaseUrl }] = await Promise.all([
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
  const serverDeviceIdPromise = findServerPeer(managerAProject).then(
    (serverMember) => {
      assert(serverMember, 'Manager A must have a server member')
      return serverMember.deviceId
    }
  )

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
  const serverPeer = await findServerPeer(managerBProject)
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
 * @typedef {object} LocalTestServer
 * @prop {'local'} type
 * @prop {string} serverBaseUrl
 * @prop {FastifyInstance} server
 */

/**
 * @typedef {object} RemoteTestServer
 * @prop {'remote'} type
 * @prop {string} serverBaseUrl
 */

/**
 * @param {import('node:test').TestContext} t
 * @returns {Promise<LocalTestServer | RemoteTestServer>}
 */
async function createTestServer(t) {
  if (USE_REMOTE_SERVER) {
    return createRemoteTestServer(t)
  } else {
    return createLocalTestServer(t)
  }
}

/**
 * @param {import('node:test').TestContext} t
 * @returns {Promise<RemoteTestServer>}
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
  return { type: 'remote', serverBaseUrl: `https://${appName}.fly.dev/` }
}

/**
 * @param {import('node:test').TestContext} t
 * @returns {Promise<LocalTestServer>}
 */
async function createLocalTestServer(t) {
  const server = createFastify()
  server.register(comapeoServer, {
    ...getManagerOptions('test server'),
    serverName: 'test server',
    serverBearerToken: 'ignored',
  })
  const serverBaseUrl = await server.listen()
  t.after(() => server.close())
  return { type: 'local', server, serverBaseUrl }
}

/**
 * @param {MapeoProject} project
 * @returns {Promise<undefined | MemberInfo>}
 */
async function findServerPeer(project) {
  return (await project.$member.getMany()).find(
    (member) => member.deviceType === 'selfHostedServer'
  )
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
