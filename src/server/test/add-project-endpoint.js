import { keyToPublicId as projectKeyToPublicId } from '@mapeo/crypto'
import assert from 'node:assert/strict'
import test from 'node:test'
import {
  createTestServer,
  randomAddProjectBody,
  randomHex,
} from './test-helpers.js'

test('request missing project name', async (t) => {
  const server = createTestServer(t)

  const response = await server.inject({
    method: 'PUT',
    url: '/projects',
    body: omit(randomAddProjectBody(), 'projectName'),
  })

  assert.equal(response.statusCode, 400)
})

test('request with empty project name', async (t) => {
  const server = createTestServer(t)

  const response = await server.inject({
    method: 'PUT',
    url: '/projects',
    body: { ...randomAddProjectBody(), projectName: '' },
  })

  assert.equal(response.statusCode, 400)
})

test('request missing project key', async (t) => {
  const server = createTestServer(t)

  const response = await server.inject({
    method: 'PUT',
    url: '/projects',
    body: omit(randomAddProjectBody(), 'projectKey'),
  })

  assert.equal(response.statusCode, 400)
})

test("request with a project key that's too short", async (t) => {
  const server = createTestServer(t)

  const response = await server.inject({
    method: 'PUT',
    url: '/projects',
    body: { ...randomAddProjectBody(), projectKey: randomHex(31) },
  })

  assert.equal(response.statusCode, 400)
})

test('request missing any encryption keys', async (t) => {
  const server = createTestServer(t)

  const response = await server.inject({
    method: 'PUT',
    url: '/projects',
    body: omit(randomAddProjectBody(), 'encryptionKeys'),
  })

  assert.equal(response.statusCode, 400)
})

test('request missing an encryption key', async (t) => {
  const server = createTestServer(t)
  const body = randomAddProjectBody()

  const response = await server.inject({
    method: 'PUT',
    url: '/projects',
    body: {
      ...body,
      encryptionKeys: omit(body.encryptionKeys, 'config'),
    },
  })

  assert.equal(response.statusCode, 400)
})

test("request with an encryption key that's too short", async (t) => {
  const server = createTestServer(t)
  const body = randomAddProjectBody()

  const response = await server.inject({
    method: 'PUT',
    url: '/projects',
    body: {
      ...body,
      encryptionKeys: { ...body.encryptionKeys, config: randomHex(31) },
    },
  })

  assert.equal(response.statusCode, 400)
})

test('adding a project', async (t) => {
  const server = createTestServer(t)

  const response = await server.inject({
    method: 'PUT',
    url: '/projects',
    body: randomAddProjectBody(),
  })

  assert.equal(response.statusCode, 200)
  assert.deepEqual(response.json(), {
    data: { deviceId: server.deviceId },
  })
})

test('adding a second project fails by default', async (t) => {
  const server = createTestServer(t)

  const firstAddResponse = await server.inject({
    method: 'PUT',
    url: '/projects',
    body: randomAddProjectBody(),
  })
  assert.equal(firstAddResponse.statusCode, 200)

  const response = await server.inject({
    method: 'PUT',
    url: '/projects',
    body: randomAddProjectBody(),
  })
  assert.equal(response.statusCode, 403)
  assert.match(response.json().message, /maximum number of projects/)
})

test('allowing a maximum number of projects', async (t) => {
  const server = createTestServer(t, { allowedProjects: 3 })

  await t.test('adding 3 projects', async () => {
    for (let i = 0; i < 3; i++) {
      const response = await server.inject({
        method: 'PUT',
        url: '/projects',
        body: randomAddProjectBody(),
      })
      assert.equal(response.statusCode, 200)
    }
  })

  await t.test('attempting to add 4th project fails', async () => {
    const response = await server.inject({
      method: 'PUT',
      url: '/projects',
      body: randomAddProjectBody(),
    })
    assert.equal(response.statusCode, 403)
    assert.match(response.json().message, /maximum number of projects/)
  })
})

test(
  'allowing a specific list of projects',
  { concurrency: true },
  async (t) => {
    const body = randomAddProjectBody()
    const projectPublicId = projectKeyToPublicId(
      Buffer.from(body.projectKey, 'hex')
    )
    const server = createTestServer(t, {
      allowedProjects: [projectPublicId],
    })

    await t.test('adding a project in the list', async () => {
      const response = await server.inject({
        method: 'PUT',
        url: '/projects',
        body,
      })
      assert.equal(response.statusCode, 200)
    })

    await t.test('trying to add a project not in the list', async () => {
      const response = await server.inject({
        method: 'PUT',
        url: '/projects',
        body: randomAddProjectBody(),
      })
      assert.equal(response.statusCode, 403)
    })
  }
)

test('adding the same project twice is idempotent', async (t) => {
  const server = createTestServer(t, { allowedProjects: 1 })
  const body = randomAddProjectBody()

  const firstResponse = await server.inject({
    method: 'PUT',
    url: '/projects',
    body,
  })
  assert.equal(firstResponse.statusCode, 200)

  const secondResponse = await server.inject({
    method: 'PUT',
    url: '/projects',
    body,
  })
  assert.equal(secondResponse.statusCode, 200)
})

/**
 * @template {object} T
 * @template {keyof T} K
 * @param {T} obj
 * @param {K} key
 * @returns {Omit<T, K>}
 */
function omit(obj, key) {
  const result = { ...obj }
  delete result[key]
  return result
}
