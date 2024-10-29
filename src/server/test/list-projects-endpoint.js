import assert from 'node:assert/strict'
import test from 'node:test'
import {
  BEARER_TOKEN,
  createTestServer,
  randomAddProjectBody,
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
    const body1 = randomAddProjectBody()
    const body2 = randomAddProjectBody()

    await Promise.all(
      [body1, body2].map(async (body) => {
        const response = await server.inject({
          method: 'PUT',
          url: '/projects',
          body,
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
    for (const body of [body1, body2]) {
      const projectPublicId = projectKeyToPublicId(
        Buffer.from(body.projectKey, 'hex')
      )
      /** @type {Record<string, unknown>} */
      const project = data.find(
        (project) => project.projectId === projectPublicId
      )
      assert(project, `expected ${projectPublicId} to be found`)
      assert.equal(
        project.name,
        body.projectName,
        'expected project name to match'
      )
    }
  })
})
