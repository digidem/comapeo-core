import { valueOf } from '@comapeo/schema'
import { generate } from '@mapeo/mock-data'
import { map } from 'iterpal'
import assert from 'node:assert/strict'
import * as fs from 'node:fs/promises'
import test from 'node:test'
import { projectKeyToPublicId } from '../../src/utils.js'
import { blobMetadata } from '../../test/helpers/blob-store.js'
import { createManager } from '../utils.js'
import {
  BEARER_TOKEN,
  createTestServer,
  randomProjectKeys,
} from './test-helpers.js'
/** @import { ObservationValue } from '@comapeo/schema'*/
/** @import { FastifyInstance } from 'fastify' */

const FIXTURES_ROOT = new URL(
  '../../src/server/test/fixtures/',
  import.meta.url
)
const FIXTURE_ORIGINAL_PATH = new URL('original.jpg', FIXTURES_ROOT).pathname
const FIXTURE_PREVIEW_PATH = new URL('preview.jpg', FIXTURES_ROOT).pathname
const FIXTURE_THUMBNAIL_PATH = new URL('thumbnail.jpg', FIXTURES_ROOT).pathname

test('returns a 403 if no auth is provided', async (t) => {
  const server = createTestServer(t)

  const response = await server.inject({
    method: 'GET',
    url: `/projects/${randomProjectPublicId()}/observations`,
  })
  assert.equal(response.statusCode, 403)
})

test('returns a 403 if incorrect auth is provided', async (t) => {
  const server = createTestServer(t)

  const response = await server.inject({
    method: 'GET',
    url: `/projects/${randomProjectPublicId()}/observations`,
    headers: { Authorization: 'Bearer bad' },
  })
  assert.equal(response.statusCode, 403)
})

test('returning no observations', async (t) => {
  const server = createTestServer(t)
  const projectKeys = randomProjectKeys()
  const projectPublicId = projectKeyToPublicId(
    Buffer.from(projectKeys.projectKey, 'hex')
  )

  const addProjectResponse = await server.inject({
    method: 'POST',
    url: '/projects',
    body: projectKeys,
  })
  assert.equal(addProjectResponse.statusCode, 200)

  const response = await server.inject({
    method: 'GET',
    url: `/projects/${projectPublicId}/observations`,
    headers: { Authorization: 'Bearer ' + BEARER_TOKEN },
  })
  assert.equal(response.statusCode, 200)
  assert.deepEqual(await response.json(), { data: [] })
})

test('returning observations with fetchable attachments', async (t) => {
  const server = createTestServer(t)

  const serverAddress = await server.listen()
  const serverUrl = new URL(serverAddress)
  t.after(() => server.close())

  const manager = await createManager('client', t)
  const projectId = await manager.createProject()
  const project = await manager.getProject(projectId)

  await project.$member.addServerPeer(serverAddress, {
    dangerouslyAllowInsecureConnections: true,
  })

  project.$sync.start()
  project.$sync.connectServers()

  const observations = await Promise.all([
    (() => {
      /** @type {ObservationValue} */
      const noAttachments = {
        ...valueOf(generate('observation')[0]),
        attachments: [],
      }
      return project.observation.create(noAttachments)
    })(),
    (async () => {
      const { docId } = await project.observation.create(
        valueOf(generate('observation')[0])
      )
      return project.observation.delete(docId)
    })(),
    (async () => {
      const blob = await project.$blobs.create(
        {
          original: FIXTURE_ORIGINAL_PATH,
          preview: FIXTURE_PREVIEW_PATH,
          thumbnail: FIXTURE_THUMBNAIL_PATH,
        },
        blobMetadata({ mimeType: 'image/jpeg' })
      )
      /** @type {ObservationValue} */
      const withAttachment = {
        ...valueOf(generate('observation')[0]),
        attachments: [blobToAttachment(blob)],
      }
      return project.observation.create(withAttachment)
    })(),
  ])

  await project.$sync.waitForSync('full')

  const response = await server.inject({
    authority: serverUrl.host,
    method: 'GET',
    url: `/projects/${projectId}/observations`,
    headers: { Authorization: 'Bearer ' + BEARER_TOKEN },
  })

  assert.equal(response.statusCode, 200)

  const { data } = await response.json()

  assert.equal(data.length, 3)

  await Promise.all(
    observations.map(async (observation) => {
      const observationFromApi = data.find(
        (/** @type {{ docId: string }} */ o) => o.docId === observation.docId
      )
      assert(observationFromApi, 'observation found in API response')
      assert.equal(observationFromApi.createdAt, observation.createdAt)
      assert.equal(observationFromApi.updatedAt, observation.updatedAt)
      assert.equal(observationFromApi.lat, observation.lat)
      assert.equal(observationFromApi.lon, observation.lon)
      assert.equal(observationFromApi.deleted, observation.deleted)
      if (!observationFromApi.deleted) {
        await assertAttachmentsCanBeFetched({
          server,
          serverAddress,
          observationFromApi,
        })
      }
      assert.deepEqual(observationFromApi.tags, observation.tags)
    })
  )
})

function randomProjectPublicId() {
  return projectKeyToPublicId(
    Buffer.from(randomProjectKeys().projectKey, 'hex')
  )
}

/**
 * @param {object} blob
 * @param {string} blob.driveId
 * @param {'photo' | 'audio' | 'video'} blob.type
 * @param {string} blob.name
 * @param {string} blob.hash
 */
function blobToAttachment(blob) {
  return {
    driveDiscoveryId: blob.driveId,
    type: blob.type,
    name: blob.name,
    hash: blob.hash,
  }
}

/**
 * @param {object} options
 * @param {FastifyInstance} options.server
 * @param {string} options.serverAddress
 * @param {Record<string, unknown>} options.observationFromApi
 * @returns {Promise<void>}
 */
async function assertAttachmentsCanBeFetched({
  server,
  serverAddress,
  observationFromApi,
}) {
  assert(Array.isArray(observationFromApi.attachments))
  await Promise.all(
    observationFromApi.attachments.map(
      /** @param {unknown} attachment */
      async (attachment) => {
        assert(attachment && typeof attachment === 'object')
        assert('url' in attachment && typeof attachment.url === 'string')
        await assertAttachmentAndVariantsCanBeFetched(
          server,
          serverAddress,
          attachment.url
        )
      }
    )
  )
}

/**
 * @param {FastifyInstance} server
 * @param {string} serverAddress
 * @param {string} url
 * @returns {Promise<void>}
 */
async function assertAttachmentAndVariantsCanBeFetched(
  server,
  serverAddress,
  url
) {
  assert(url.startsWith(serverAddress))

  /** @type {Map<null | string, string>} */
  const variantsToCheck = new Map([
    [null, FIXTURE_ORIGINAL_PATH],
    ['original', FIXTURE_ORIGINAL_PATH],
    ['preview', FIXTURE_PREVIEW_PATH],
    ['thumbnail', FIXTURE_THUMBNAIL_PATH],
  ])

  await Promise.all(
    map(variantsToCheck, async ([variant, fixturePath]) => {
      const expectedResponseBodyPromise = fs.readFile(fixturePath)
      const attachmentResponse = await server.inject({
        method: 'GET',
        url: url + (variant ? `?variant=${variant}` : ''),
        headers: { Authorization: 'Bearer ' + BEARER_TOKEN },
      })
      assert.equal(
        attachmentResponse.statusCode,
        200,
        `expected 200 when fetching ${variant} attachment`
      )
      assert.equal(
        attachmentResponse.headers['content-type'],
        'image/jpeg',
        `expected ${variant} attachment to be a JPEG`
      )
      assert.deepEqual(
        attachmentResponse.rawPayload,
        await expectedResponseBodyPromise,
        `expected ${variant} attachment to match fixture`
      )
    })
  )
}
