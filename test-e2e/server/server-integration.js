import assert from 'node:assert/strict'
import { randomBytes } from 'node:crypto'
import test from 'node:test'
import { projectKeyToPublicId } from '../../src/utils.js'
import { createTestServer, randomProjectKeys } from './test-helpers.js'

test('add project, sync endpoint available', async (t) => {
  const server = createTestServer(t)
  const projectKeys = randomProjectKeys()
  const projectPublicId = projectKeyToPublicId(
    Buffer.from(projectKeys.projectKey, 'hex')
  )

  await server.inject({
    method: 'POST',
    url: '/projects',
    body: projectKeys,
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
