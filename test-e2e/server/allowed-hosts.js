import assert from 'node:assert/strict'
import test from 'node:test'
import { createTestServer } from './test-helpers.js'

test('allowed host', async (t) => {
  const allowedHost = 'www.example.com'
  const server = createTestServer(t, { allowedHosts: [allowedHost] })

  const response = await server.inject({
    authority: allowedHost,
    method: 'GET',
    url: '/info',
  })

  assert.equal(response.statusCode, 200)
})

test('disallowed host', async (t) => {
  const server = createTestServer(t, { allowedHosts: ['www.example.com'] })

  const response = await server.inject({
    authority: 'www.invalid-host.example',
    method: 'GET',
    url: '/info',
  })

  assert.equal(response.statusCode, 403)
})
