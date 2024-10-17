import assert from 'node:assert/strict'
import test from 'node:test'
import { createTestServer } from './test-helpers.js'

test('server info endpoint', async (t) => {
  const serverName = 'test server'
  const server = createTestServer(t, { serverName })

  const response = await server.inject({
    method: 'GET',
    url: '/info',
  })

  assert.equal(response.statusCode, 200)
  assert.deepEqual(response.json(), {
    data: {
      deviceId: server.deviceId,
      name: serverName,
    },
  })
})
