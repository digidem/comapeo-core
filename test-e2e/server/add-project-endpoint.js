import assert from 'node:assert/strict'
import test from 'node:test'
import { omit } from '../../src/lib/omit.js'
import { projectKeyToPublicId } from '../../src/utils.js'
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

// TODO: This test is wrong. Adding the same project twice should be idempotent.
test('trying to create the same project twice fails', async (t) => {
  const server = createTestServer(t, { allowedProjects: 2 })

  const projectKeys = randomProjectKeys()

  await t.test('add project first time succeeds', async () => {
    const response = await server.inject({
      method: 'POST',
      url: '/projects',
      body: projectKeys,
    })
    assert.equal(response.statusCode, 200)
  })

  await t.test('attempt to re-add same project fails', async () => {
    const response = await server.inject({
      method: 'POST',
      url: '/projects',
      body: projectKeys,
    })
    assert.equal(response.statusCode, 400)
    assert.match(response.json().message, /already exists/)
  })
})
