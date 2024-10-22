import assert from 'node:assert/strict'
import test from 'node:test'
import { omit } from '../../lib/omit.js'
import { projectKeyToPublicId } from '../../utils.js'
import { createTestServer, randomProjectKeys } from './test-helpers.js'

test('request missing project key', async (t) => {
  const server = createTestServer(t)

  const response = await server.inject({
    method: 'POST',
    url: '/projects',
    body: omit(randomProjectKeys(), ['projectKey']),
  })

  assert.equal(response.statusCode, 400)
})

test('request missing any encryption keys', async (t) => {
  const server = createTestServer(t)

  const response = await server.inject({
    method: 'POST',
    url: '/projects',
    body: omit(randomProjectKeys(), ['encryptionKeys']),
  })

  assert.equal(response.statusCode, 400)
})

test('request missing an encryption key', async (t) => {
  const server = createTestServer(t)
  const projectKeys = randomProjectKeys()

  const response = await server.inject({
    method: 'POST',
    url: '/projects',
    body: {
      ...projectKeys,
      encryptionKeys: omit(projectKeys.encryptionKeys, ['config']),
    },
  })

  assert.equal(response.statusCode, 400)
})

test('adding a project', async (t) => {
  const server = createTestServer(t)

  const response = await server.inject({
    method: 'POST',
    url: '/projects',
    body: randomProjectKeys(),
  })

  assert.equal(response.statusCode, 200)
  assert.deepEqual(response.json(), {
    data: { deviceId: server.deviceId },
  })
})

test('adding a second project fails by default', async (t) => {
  const server = createTestServer(t)

  const firstAddResponse = await server.inject({
    method: 'POST',
    url: '/projects',
    body: randomProjectKeys(),
  })
  assert.equal(firstAddResponse.statusCode, 200)

  const response = await server.inject({
    method: 'POST',
    url: '/projects',
    body: randomProjectKeys(),
  })
  assert.equal(response.statusCode, 403)
  assert.match(response.json().message, /maximum number of projects/)
})

test('allowing a maximum number of projects', async (t) => {
  const server = createTestServer(t, { allowedProjects: 3 })

  await t.test('adding 3 projects', async () => {
    for (let i = 0; i < 3; i++) {
      const response = await server.inject({
        method: 'POST',
        url: '/projects',
        body: randomProjectKeys(),
      })
      assert.equal(response.statusCode, 200)
    }
  })

  await t.test('attempting to add 4th project fails', async () => {
    const response = await server.inject({
      method: 'POST',
      url: '/projects',
      body: randomProjectKeys(),
    })
    assert.equal(response.statusCode, 403)
    assert.match(response.json().message, /maximum number of projects/)
  })
})

test(
  'allowing a specific list of projects',
  { concurrency: true },
  async (t) => {
    const projectKeys = randomProjectKeys()
    const projectPublicId = projectKeyToPublicId(
      Buffer.from(projectKeys.projectKey, 'hex')
    )
    const server = createTestServer(t, {
      allowedProjects: [projectPublicId],
    })

    await t.test('adding a project in the list', async () => {
      const response = await server.inject({
        method: 'POST',
        url: '/projects',
        body: projectKeys,
      })
      assert.equal(response.statusCode, 200)
    })

    await t.test('trying to add a project not in the list', async () => {
      const response = await server.inject({
        method: 'POST',
        url: '/projects',
        body: randomProjectKeys(),
      })
      assert.equal(response.statusCode, 403)
    })
  }
)

test('adding the same project twice is idempotent', async (t) => {
  const server = createTestServer(t, { allowedProjects: 1 })
  const projectKeys = randomProjectKeys()

  const firstResponse = await server.inject({
    method: 'POST',
    url: '/projects',
    body: projectKeys,
  })
  assert.equal(firstResponse.statusCode, 200)

  const secondResponse = await server.inject({
    method: 'POST',
    url: '/projects',
    body: projectKeys,
  })
  assert.equal(secondResponse.statusCode, 200)
})

test('adding a project ID with different encryption keys is an error', async (t) => {
  const server = createTestServer(t, { allowedProjects: 1 })
  const projectKeys1 = randomProjectKeys()
  const projectKeys2 = {
    ...projectKeys1,
    encryptionKeys: randomProjectKeys().encryptionKeys,
  }

  const firstResponse = await server.inject({
    method: 'POST',
    url: '/projects',
    body: projectKeys1,
  })
  assert.equal(firstResponse.statusCode, 200)

  const secondResponse = await server.inject({
    method: 'POST',
    url: '/projects',
    body: projectKeys2,
  })
  assert.equal(secondResponse.statusCode, 409)
})
