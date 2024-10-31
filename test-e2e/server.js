import createFastify from 'fastify'
import assert from 'node:assert/strict'
import test from 'node:test'
import { createManager } from './utils.js'
/** @import { MapeoProject } from '../src/mapeo-project.js' */
/** @import { MemberInfo } from '../src/member-api.js' */

test('invalid base URLs', async (t) => {
  const manager = createManager('device0', t)
  const projectId = await manager.createProject()
  const project = await manager.getProject(projectId)

  const invalidUrls = [
    '',
    'no-protocol.example',
    'ftp://invalid-protocol.example',
    'http://invalid-protocol.example',
    'https:',
    'https://',
    'https://.',
    'https://..',
    'https://https://',
    'https://https://double-protocol.example',
    'https://bare-domain',
    'https://bare-domain:1234',
    'https://empty-part.',
    'https://.empty-part',
    'https://spaces .in-part',
    'https://spaces.in part',
    'https://bad-port.example:-1',
    'https://username@has-auth.example',
    'https://username:password@has-auth.example',
    'https://has-query.example/?foo=bar',
    'https://has-hash.example/#hash',
    `https://${'x'.repeat(2000)}.example`,
    // We may want to support this someday. See <https://github.com/digidem/comapeo-core/issues/908>.
    'https://has-pathname.example/p',
  ]
  await Promise.all(
    invalidUrls.map((url) =>
      assert.rejects(
        () => project.$member.addServerPeer(url),
        {
          code: 'INVALID_URL',
          message: /base url is invalid/i,
        },
        `${url} should be invalid`
      )
    )
  )

  assert(!(await findServerPeer(project)), 'no server peers should be added')
})

test('project with no name', async (t) => {
  const manager = createManager('device0', t)
  const projectId = await manager.createProject()
  const project = await manager.getProject(projectId)

  await assert.rejects(
    () =>
      project.$member.addServerPeer('http://localhost:9999', {
        dangerouslyAllowInsecureConnections: true,
      }),
    {
      code: 'MISSING_DATA',
      message: /name/,
    }
  )
})

test("fails if we can't connect to the server", async (t) => {
  const manager = createManager('device0', t)
  const projectId = await manager.createProject({ name: 'foo' })
  const project = await manager.getProject(projectId)

  const serverBaseUrl = 'http://localhost:9999'
  await assert.rejects(
    () =>
      project.$member.addServerPeer(serverBaseUrl, {
        dangerouslyAllowInsecureConnections: true,
      }),
    {
      code: 'NETWORK_ERROR',
      message: /Failed to add server peer due to network error/,
    }
  )
})

test(
  "fails if server doesn't return a 200",
  { concurrency: true },
  async (t) => {
    const manager = createManager('device0', t)
    const projectId = await manager.createProject({ name: 'foo' })
    const project = await manager.getProject(projectId)

    await Promise.all(
      [204, 302, 400, 500].map((statusCode) =>
        t.test(`when returning a ${statusCode}`, async (t) => {
          const fastify = createFastify()
          fastify.put('/projects', (_req, reply) => {
            reply.status(statusCode).send()
          })
          const serverBaseUrl = await fastify.listen()
          t.after(() => fastify.close())

          await assert.rejects(
            () =>
              project.$member.addServerPeer(serverBaseUrl, {
                dangerouslyAllowInsecureConnections: true,
              }),
            {
              code: 'INVALID_SERVER_RESPONSE',
              message: `Failed to add server peer due to HTTP status code ${statusCode}`,
            }
          )
        })
      )
    )
  }
)

test(
  "fails if server doesn't return data in the right format",
  { concurrency: true },
  async (t) => {
    const manager = createManager('device0', t)
    const projectId = await manager.createProject({ name: 'foo' })
    const project = await manager.getProject(projectId)

    await Promise.all(
      [
        '',
        '{bad_json',
        JSON.stringify({ data: {} }),
        JSON.stringify({ data: { deviceId: 123 } }),
        JSON.stringify({ deviceId: 'not under "data"' }),
      ].map((responseData) =>
        t.test(`when returning ${responseData}`, async (t) => {
          const fastify = createFastify()
          fastify.put('/projects', (_req, reply) => {
            reply.header('Content-Type', 'application/json').send(responseData)
          })
          const serverBaseUrl = await fastify.listen()
          t.after(() => fastify.close())

          await assert.rejects(
            () =>
              project.$member.addServerPeer(serverBaseUrl, {
                dangerouslyAllowInsecureConnections: true,
              }),
            {
              code: 'INVALID_SERVER_RESPONSE',
              message:
                "Failed to add server peer because we couldn't parse the response",
            }
          )
        })
      )
    )
  }
)

test("fails if first request succeeds but sync doesn't", async (t) => {
  const manager = createManager('device0', t)
  const projectId = await manager.createProject({ name: 'foo' })
  const project = await manager.getProject(projectId)

  const fastify = createFastify()
  fastify.put('/projects', (_req, reply) => {
    reply.send({ data: { deviceId: 'abc123' } })
  })
  const serverBaseUrl = await fastify.listen()
  t.after(() => fastify.close())

  await assert.rejects(
    () =>
      project.$member.addServerPeer(serverBaseUrl, {
        dangerouslyAllowInsecureConnections: true,
      }),
    (err) => {
      assert(err instanceof Error, 'receives an error')
      assert('code' in err, 'gets an error code')
      assert.equal(
        err.code,
        'INVALID_SERVER_RESPONSE',
        'gets the correct error code'
      )
      assert(err.cause instanceof Error, 'error has a cause')
      assert(err.cause.message.includes('404'), 'error cause is an HTTP 404')
      return true
    }
  )
})

/**
 * @param {MapeoProject} project
 * @returns {Promise<undefined | MemberInfo>}
 */
async function findServerPeer(project) {
  return (await project.$member.getMany()).find(
    (member) => member.deviceType === 'selfHostedServer'
  )
}
