import assert from 'node:assert/strict'
import test from 'node:test'
import { projectKeyToPublicId } from '../../utils.js'
import { createTestServer, randomProjectKeys } from './test-helpers.js'

test('sync endpoint is available after adding a project', async (t) => {
  const server = createTestServer(t)
  const projectKeys = randomProjectKeys()
  const projectPublicId = projectKeyToPublicId(
    Buffer.from(projectKeys.projectKey, 'hex')
  )

  await t.test('sync endpoint not available yet', async () => {
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

test('sync endpoint returns error with an invalid project public ID', async (t) => {
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
