import assert from 'node:assert/strict'
import test from 'node:test'
import { createTestServer } from './test-helpers.js'

test('server root', async (t) => {
  const server = createTestServer(t)

  const response = await server.inject({
    method: 'GET',
    url: '/',
  })

  assert.equal(response.statusCode, 200)
  const contentType = response.headers['content-type']
  assert(
    typeof contentType === 'string' && contentType.startsWith('text/html'),
    'response is HTML'
  )
  assert(response.body.includes('<html'), 'response body looks like HTML')
})
