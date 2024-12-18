import * as mlef from '@mapeo/legacy-export-format'
import * as fs from 'node:fs/promises'
import pProps from 'p-props'
import { temporaryWrite } from 'tempy'
import { Type as T } from '@sinclair/typebox'
import { Value } from '@sinclair/typebox/value'
import { deNullify } from './utils.js'
/** @import { MapeoProject } from './mapeo-project.js' */
/** @import { Observation, ObservationValue } from '@comapeo/schema' */
/** @import { Document, DocumentVersion } from '@mapeo/legacy-export-format' */

/**
 * @internal
 * @typedef {object} ParsedOldObservation
 * @prop {string} version
 * @prop {string[]} links
 * @prop {ObservationValue} value
 * @prop {OldAttachment[]} attachments
 */

/**
 * @internal
 * @typedef {object} OldAttachment
 * @prop {string} id
 * @prop {string} type
 * @prop {Record<string, Uint8Array>} variants
 */

const OldPositionSchema = T.Object({
  coords: T.Object({
    latitude: T.Number(),
    longitude: T.Number(),
    altitude: T.Union([T.Null(), T.Number()]),
    accuracy: T.Union([T.Null(), T.Number()]),
    altitudeAccuracy: T.Union([T.Null(), T.Number()]),
    heading: T.Union([T.Null(), T.Number()]),
    speed: T.Union([T.Null(), T.Number()]),
  }),
  timestamp: T.Number(),
})

const OldProviderSchema = T.Object({
  backgroundModeEnabled: T.Boolean(),
  gpsAvailable: T.Optional(T.Boolean()),
  passiveAvailable: T.Optional(T.Boolean()),
  locationServicesEnabled: T.Boolean(),
  networkAvailable: T.Optional(T.Boolean()),
})

const OldTagsSchema = T.Record(
  T.String(),
  T.Union([
    T.Boolean(),
    T.Number(),
    T.String(),
    T.Null(),
    T.Array(T.Union([T.Boolean(), T.Number(), T.String(), T.Null()])),
  ])
)

// Lifted from <https://github.com/digidem/mapeo-mobile/blob/0c0ebbb9ef2261e21cd1d1c8bd5ab2fe42017ea3/src/frontend/%40types/mapeo-schema.d.ts#L41-L70>
// with unnecessary fields removed.
const OldDocumentSchema = T.Object({
  attachments: T.Optional(
    T.Array(
      T.Object({
        id: T.String(),
        type: T.Optional(T.String()),
      })
    )
  ),
  lat: T.Optional(T.Union([T.Null(), T.Undefined(), T.Number()])),
  links: T.Optional(T.Union([T.Null(), T.Undefined(), T.Array(T.String())])),
  lon: T.Optional(T.Union([T.Null(), T.Undefined(), T.Number()])),
  metadata: T.Optional(
    T.Object({
      location: T.Optional(
        T.Object({
          position: T.Optional(OldPositionSchema),
          provider: T.Optional(OldProviderSchema),
        })
      ),
      manualLocation: T.Optional(T.Boolean()),
    })
  ),
  schemaVersion: T.Literal(3),
  tags: T.Optional(OldTagsSchema),
  type: T.Literal('observation'),
})

/**
 * @param {Awaited<ReturnType<typeof mlef.reader>>} reader
 * @param {DocumentVersion} documentVersion
 * @returns {Promise<null | ParsedOldObservation>}
 */
async function parseOldObservation(reader, documentVersion) {
  const oldDocument = documentVersion.document

  if (!Value.Check(OldDocumentSchema, oldDocument)) return null

  const links = oldDocument.links || []

  const oldMetadataLocation = oldDocument.metadata?.location
  const oldMetadataPosition = oldMetadataLocation?.position
  const oldMetadataProvider = oldMetadataLocation?.provider

  /** @type {NonNullable<ObservationValue['metadata']>} */
  const metadata = {
    manualLocation: oldDocument.metadata?.manualLocation,
    position: oldMetadataPosition
      ? {
          timestamp: new Date(oldMetadataPosition.timestamp).toISOString(),
          coords: deNullify(oldMetadataPosition.coords),
        }
      : undefined,
    positionProvider: oldMetadataProvider,
  }
  const hasAnyMetadata = Object.values(metadata).some(
    (value) => value !== undefined && value !== null
  )

  /** @type {ObservationValue} */
  const value = {
    schemaName: 'observation',
    attachments: [],
    tags: oldDocument.tags || {},
    lat: oldDocument.lat ?? undefined,
    lon: oldDocument.lon ?? undefined,
    metadata: hasAnyMetadata ? metadata : undefined,
    migrationMetadata: {
      originalDocument: Buffer.from(
        JSON.stringify(oldDocument),
        'utf8'
      ).toString('hex'),
      hypercore: documentVersion.hypercoreMetadata,
    },
  }

  const attachments = await Promise.all(
    (oldDocument.attachments || []).map(async (attachment) => {
      /** @type {OldAttachment} */
      const result = {
        id: attachment.id,
        type: attachment.type || 'image/jpeg',
        variants: {},
      }
      for await (const media of reader.getMediaById(attachment.id)) {
        result.variants[media.variant] = media.data
      }
      return result
    })
  )

  return { version: documentVersion.version, links, value, attachments }
}

/**
 * @param {object} options
 * @param {MapeoProject} options.project
 * @param {OldAttachment} options.oldAttachment
 * @returns {Promise<null | ObservationValue['attachments'][0]>}
 */
async function createAttachment({ project, oldAttachment }) {
  const originalData = oldAttachment.variants.original
  if (!originalData) return null

  /** @type {string[]} */
  const pathsToCleanUp = []

  /**
   * @param {Uint8Array} data
   * @returns {Promise<string>}
   */
  const writeToTemporaryFile = async (data) => {
    const result = await temporaryWrite(data)
    pathsToCleanUp.push(result)
    return result
  }

  const result = await project.$blobs.create(
    await pProps({
      original: writeToTemporaryFile(originalData),
      preview:
        oldAttachment.variants.preview &&
        writeToTemporaryFile(oldAttachment.variants.preview),
      thumbnail:
        oldAttachment.variants.thumbnail &&
        writeToTemporaryFile(oldAttachment.variants.thumbnail),
    }),
    {
      mimeType: oldAttachment.type,
      timestamp: Date.now(),
    }
  )

  await Promise.all(
    pathsToCleanUp.map((path) => fs.rm(path, { maxRetries: 2 }))
  )

  return {
    driveDiscoveryId: result.driveId,
    ...result,
  }
}

/**
 * @param {object} options
 * @param {MapeoProject} options.project
 * @param {Awaited<ReturnType<typeof mlef.reader>>} options.reader
 * @param {Document} options.document
 * @returns {Promise<void>}
 */
async function importObservation({ project, reader, document }) {
  /** @type {Map<string, ObservationValue['attachments'][0]>} */
  const attachmentsCreated = new Map()

  /** @type {Map<string, string>} */
  const oldVersionToNewVersion = new Map()

  /**
   * @param {string[]} oldLinks
   * @returns {null | string[]}
   */
  const getNewVersions = (oldLinks) => {
    /** @type {string[]} */ const result = []
    for (const oldLink of oldLinks) {
      const newLink = oldVersionToNewVersion.get(oldLink)
      if (!newLink) return null
      result.push(newLink)
    }
    return result
  }

  /** @type {ParsedOldObservation[]} */
  let remainingVersions = []
  await Promise.all(
    document.versions.map(async (documentVersion) => {
      const parsedOldObservation = await parseOldObservation(
        reader,
        documentVersion
      )
      if (parsedOldObservation) {
        remainingVersions.push(parsedOldObservation)
      }
    })
  )

  while (remainingVersions.length) {
    /** @type {Set<string>} */
    const oldVersionsMigrated = new Set()

    for (const oldVersion of remainingVersions) {
      const { version, links, value, attachments } = oldVersion

      const linksToUpdate = getNewVersions(links)
      if (!linksToUpdate) continue

      /** @type {ObservationValue['attachments']} */
      const newAttachments = []
      await Promise.all(
        attachments.map(async (oldAttachment) => {
          const existingAttachment = attachmentsCreated.get(oldAttachment.id)
          if (existingAttachment) return existingAttachment
          const attachment = await createAttachment({ project, oldAttachment })
          if (attachment) {
            newAttachments.push(attachment)
            attachmentsCreated.set(oldAttachment.id, attachment)
          }
          return attachment
        })
      )

      const toCreateOrUpdate = { ...value, attachments: newAttachments }

      /** @type {Observation} */
      let observation
      if (linksToUpdate.length) {
        observation = await project.observation.update(
          linksToUpdate,
          toCreateOrUpdate
        )
      } else {
        observation = await project.observation.create(toCreateOrUpdate)
      }

      oldVersionToNewVersion.set(version, observation.versionId)
      oldVersionsMigrated.add(version)
    }

    if (!oldVersionsMigrated.size) {
      throw new Error('No versions migrated. Do documents have proper links?')
    }
    remainingVersions = remainingVersions.filter(
      (version) => !oldVersionsMigrated.has(version.version)
    )
  }
}

/**
 * @param {MapeoProject} project
 * @param {string} mlefPath
 * @returns {Promise<void>}
 */
export async function importLegacyMapeoData(project, mlefPath) {
  const reader = await mlef.reader(mlefPath)
  for await (const document of reader.documents()) {
    await importObservation({ project, reader, document })
  }
}
