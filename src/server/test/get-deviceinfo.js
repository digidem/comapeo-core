import assert from 'node:assert/strict'
import test from 'node:test'
import createServer from '../app.js'
import { getManagerOptions } from '../../../test-e2e/utils.js'

test('GET /deviceinfo', async () => {
  const server = createServer({
    ...getManagerOptions('test server'),
    serverName: 'test server',
  })

  const response = await server.inject({
    method: 'GET',
    url: '/deviceinfo',
  })

  assert.equal(response.statusCode, 200)

  const responseBody = response.json()
  assert.deepEqual(Object.keys(responseBody), ['data'])
  assert.deepEqual(Object.keys(responseBody.data), ['deviceId', 'name'])
  assert.equal(typeof responseBody.data.deviceId, 'string')
  assert.equal(responseBody.data.name, 'test server')
})
