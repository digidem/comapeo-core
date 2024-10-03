import { getManagerOptions } from './utils.js'
import createServer from '../src/server/app.js'
import test from 'node:test'
import crypto, { randomBytes } from 'node:crypto'
import { KeyManager } from '@mapeo/crypto'
import assert from 'node:assert/strict'
import { projectKeyToPublicId } from '../src/utils.js'

test('server info endpoint', async (t) => {
  const serverName = 'test server'
  const server = createTestServer(t, serverName)
  const expectedResponseBody = {
    data: {
      deviceId: server.deviceId,
      name: serverName,
    },
  }
  const response = await server.inject({
    method: 'GET',
    url: '/info',
  })
  assert.deepEqual(response.json(), expectedResponseBody)
})

test('add project, sync endpoint available', async (t) => {
  const server = createTestServer(t)
  const projectKeys = randomProjectKeys()
  const projectPublicId = projectKeyToPublicId(
    Buffer.from(projectKeys.projectKey, 'hex')
  )

  await t.test('add project', async () => {
    const expectedResponseBody = {
      data: {
        deviceId: server.deviceId,
      },
    }
    const response = await server.inject({
      method: 'POST',
      url: '/projects',
      body: projectKeys,
    })
    assert.deepEqual(response.json(), expectedResponseBody)
  })

  await t.test('sync endpoint available', async (t) => {
    const ws = await server.injectWS('/sync/' + projectPublicId)
    t.after(() => ws.terminate())
    assert.equal(ws.readyState, ws.OPEN, 'websocket is open')
  })
})

test('no project added, sync endpoint not available', async (t) => {
  const server = createTestServer(t)

  const projectPublicId = projectKeyToPublicId(randomBytes(32))

  const response = await server.inject({
    method: 'GET',
    url: '/sync/' + projectPublicId,
    headers: {
      connection: 'upgrade',
      upgrade: 'websocket',
    },
  })
  assert.equal(response.statusCode, 404)
  assert.equal(response.json().error, 'Not Found')
})

test('invalid project public id', async (t) => {
  const server = createTestServer(t)

  const response = await server.inject({
    method: 'GET',
    url: '/sync/foobidoobi',
    headers: {
      connection: 'upgrade',
      upgrade: 'websocket',
    },
  })
  assert.equal(response.statusCode, 400)
  assert.equal(response.json().code, 'FST_ERR_VALIDATION')
})

test('trying to add second project fails', async (t) => {
  const server = createTestServer(t)

  await t.test('add first project', async () => {
    const expectedResponseBody = {
      data: {
        deviceId: server.deviceId,
      },
    }
    const response = await server.inject({
      method: 'POST',
      url: '/projects',
      body: randomProjectKeys(),
    })
    assert.deepEqual(response.json(), expectedResponseBody)
  })

  await t.test('attempt to add second project', async () => {
    const response = await server.inject({
      method: 'POST',
      url: '/projects',
      body: randomProjectKeys(),
    })
    assert.equal(response.statusCode, 403)
  })
})

function randomHexKey(length = 32) {
  return Buffer.from(crypto.randomBytes(length)).toString('hex')
}

function randomProjectKeys() {
  return {
    projectKey: randomHexKey(),
    encryptionKeys: {
      auth: randomHexKey(),
      config: randomHexKey(),
      data: randomHexKey(),
      blobIndex: randomHexKey(),
      blob: randomHexKey(),
    },
  }
}

/**
 *
 * @param {import('node:test').TestContext} t
 * @returns {ReturnType<typeof createServer> & { deviceId: string }}
 */
function createTestServer(t, serverName = 'test server') {
  const managerOptions = getManagerOptions(serverName)
  const km = new KeyManager(managerOptions.rootKey)
  const server = createServer({
    ...managerOptions,
    serverName,
    serverPublicBaseUrl: 'http://localhost:0',
  })
  t.after(() => server.close())
  Object.defineProperty(server, 'deviceId', {
    get() {
      return km.getIdentityKeypair().publicKey.toString('hex')
    },
  })
  // @ts-expect-error
  return server
}
