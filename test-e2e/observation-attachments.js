import assert from 'node:assert/strict'
import { join } from 'node:path'
import test from 'node:test'
import { fileURLToPath } from 'node:url'

import { createManager } from './utils.js'

/**
 * @import {Observation} from '@comapeo/schema'
 *
 * @typedef {Observation['attachments'][number]} Attachment
 */

const BLOB_FIXTURES = fileURLToPath(
  new URL('../test/fixtures/blob-api/', import.meta.url)
)

test('attachment creation', async (t) => {
  // 1. Test setup
  const manager = createManager('device0', t)

  const projectId = await manager.createProject({
    name: 'comapeo',
  })

  const project = await manager.getProject(projectId)

  const blobId = await project.$blobs.create(
    {
      original: join(BLOB_FIXTURES, 'original.png'),
      preview: join(BLOB_FIXTURES, 'preview.png'),
      thumbnail: join(BLOB_FIXTURES, 'thumbnail.png'),
    },
    { mimeType: 'image/png' }
  )

  // 2. Fixture creation
  const exampleTimestamp = new Date().toISOString()

  /** @type {Attachment['position']} */
  const examplePosition = {
    mocked: false,
    timestamp: exampleTimestamp,
    coords: {
      accuracy: 3,
      altitude: 8848,
      altitudeAccuracy: 3,
      heading: 180,
      latitude: 27.988333,
      longitude: 86.925278,
      speed: 0,
    },
  }

  /** @type {Extract<Attachment, {type: 'photo'}>['photoExif']} */
  const examplePhotoExif = {
    FNumber: 1.85,
    ImageLength: 200,
    ImageWidth: 100,
    Orientation: 1,
  }

  // Account for every optional (top-level) attachment field that may exist and make sure the information is preserved when creating the observation

  /** @type {{ [t in Attachment['type']]: Array<Partial<Omit<Attachment & { type: t }, 'type'>>> }} */
  const attachmentTypeToAdditionalInfoFixtures = {
    attachment_type_unspecified: [
      {},
      { createdAt: exampleTimestamp },
      { position: examplePosition },
    ],
    audio: [{}, { createdAt: exampleTimestamp }, { position: examplePosition }],
    photo: [
      {},
      { createdAt: exampleTimestamp },
      { position: examplePosition },
      { photoExif: examplePhotoExif },
    ],
    UNRECOGNIZED: [
      {},
      { createdAt: exampleTimestamp },
      { position: examplePosition },
    ],
    video: [{}, { createdAt: exampleTimestamp }, { position: examplePosition }],
  }

  /** @type {Array<Attachment>} */
  const attachmentInputs = Object.entries(
    attachmentTypeToAdditionalInfoFixtures
  ).flatMap(([type, infoFixtures]) => {
    return infoFixtures.map((f) => ({
      ...f,
      type: /** @type {Attachment['type']} */ (type),
      driveDiscoveryId: blobId.driveId,
      name: blobId.name,
      hash: blobId.hash,
    }))
  })

  // 3. Run through the inputs and confirm outputs
  for (const input of attachmentInputs) {
    const observation = await project.observation.create({
      schemaName: 'observation',
      tags: {},
      attachments: [input],
    })

    const createdAttachment = observation.attachments[0]

    assert(createdAttachment)
    assert.deepStrictEqual(
      createdAttachment,
      input,
      'attachment input information is preserved in observation output'
    )
  }
})
