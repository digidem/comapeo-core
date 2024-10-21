import assert from 'node:assert/strict'
import test from 'node:test'
import {
  BEARER_TOKEN,
  createTestServer,
  randomProjectKeys,
} from './test-helpers.js'
import { projectKeyToPublicId } from '../../utils.js'

test('listing projects', async (t) => {
  const server = createTestServer(t, { allowedProjects: 999 })

  await t.test('with invalid auth', async () => {
    const response = await server.inject({
      method: 'GET',
      url: '/projects',
      headers: { Authorization: 'Bearer bad' },
    })
    assert.equal(response.statusCode, 403)
  })

  await t.test('with no projects', async () => {
    const response = await server.inject({
      method: 'GET',
      url: '/projects',
      headers: { Authorization: 'Bearer ' + BEARER_TOKEN },
    })
    assert.equal(response.statusCode, 200)
    assert.deepEqual(response.json(), { data: [] })
  })

  await t.test('with projects', async () => {
    const projectKeys1 = randomProjectKeys()
    const projectKeys2 = randomProjectKeys()

    await Promise.all(
      [projectKeys1, projectKeys2].map(async (projectKeys) => {
        const response = await server.inject({
          method: 'POST',
          url: '/projects',
          body: projectKeys,
        })
        assert.equal(response.statusCode, 200)
      })
    )

    const response = await server.inject({
      method: 'GET',
      url: '/projects',
      headers: { Authorization: 'Bearer ' + BEARER_TOKEN },
    })
    assert.equal(response.statusCode, 200)

    const { data } = response.json()
    assert(Array.isArray(data))
    assert.equal(data.length, 2, 'expected 2 projects')
    for (const projectKeys of [projectKeys1, projectKeys2]) {
      const projectPublicId = projectKeyToPublicId(
        Buffer.from(projectKeys.projectKey, 'hex')
      )
      assert(
        data.some((project) => project.projectId === projectPublicId),
        `expected ${projectPublicId} to be found`
      )
    }
  })
})
