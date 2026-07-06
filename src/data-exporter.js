import path from 'path'
import fs from 'node:fs'
import * as b4a from 'b4a'
import ZipArchive from 'zip-stream-promise'
import mime from 'mime/lite'
// @ts-expect-error
import { Readable, pipelinePromise } from 'streamx'

import { buildBlobId } from './utils.js'
import { GeoJSONExportError } from './errors.js'
import { Logger } from './logger.js'
import ensureError from 'ensure-error'

/** @import { Observation, Track } from '@comapeo/schema' */
/** @import { Attachment, BlobId, ObservationDataType, TrackDataType } from './types.js' */

/** @typedef {Map<string, Attachment>} SeenAttachments */

/**
 * @typedef {object} BlobRef
 * @prop {string|undefined} mimeType
 * @prop {BlobId} blobId
 */

/** @typedef {object} ExportOptions
 * @prop {boolean} [observations] Whether observations should be exported
 * @prop {boolean} [tracks] Whether tracks should be exported
 * @prop {string} [lang] Language tag for localized export
 */

/** @typedef {ExportOptions & { attachments?: boolean }} ExportWithAttachmentsOptions */

/**
 * @typedef {object} DataExporterDependencies
 * @prop {ObservationDataType} observations DataType for observations
 * @prop {TrackDataType} tracks DataType for tracks
 * @prop {() => Promise<string | undefined>} getProjectName Async function to get the project name
 * @prop {import('./blob-store/index.js').BlobStore} blobStore BlobStore instance for attachment access
 * @prop {Logger} logger Logger instance
 */

/**
 * @typedef {object} ObservationKnownFields
 * @prop {string} $id
 * @prop {string} $createdAt
 * @prop {string} [$categoryId]
 */

/**
 * @typedef {Record<string, string | null> & ObservationKnownFields} ObservationFeatureProperties
 */

/** @typedef {import('geojson').Feature<import('geojson').Point | null> & {properties: ObservationFeatureProperties, $comapeo: Observation}} ObservationFeature */

/** @type {import('./types.js').BlobId['variant'][]} */
const VARIANT_EXPORT_ORDER = ['original', 'preview', 'thumbnail']

export class DataExporter {
  /** @type {ObservationDataType} */
  #observations
  /** @type {TrackDataType} */
  #tracks
  /** @type {() => Promise<string | undefined>} */
  #getProjectName
  /** @type {import('./blob-store/index.js').BlobStore} */
  #blobStore
  /** @type {Logger} */
  #l

  /**
   * @param {DataExporterDependencies} deps
   */
  constructor({ observations, tracks, getProjectName, blobStore, logger }) {
    this.#observations = observations
    this.#tracks = tracks
    this.#getProjectName = getProjectName
    this.#blobStore = blobStore
    this.#l = Logger.create('dataExporter', logger)
  }

  /**
   * @param {Iterable<Observation>} observations
   * @param {Object} options
   * @param {Set<string>} [options.seenObservations]
   * @param {SeenAttachments} [options.seenAttachments]
   * @returns {AsyncIterable<Buffer | Uint8Array>}
   */
  async *#exportObservations(
    observations,
    { seenObservations = new Set(), seenAttachments = new Map() }
  ) {
    let first = true
    for (const observation of observations) {
      const { docId } = observation
      if (seenObservations.has(docId)) continue
      seenObservations.add(docId)
      for (const attachment of observation.attachments) {
        const { hash } = attachment
        if (!seenAttachments.has(hash)) {
          seenAttachments.set(hash, attachment)
        }
      }
      const attachmentNames = await Promise.all(
        observation.attachments.map(async (attachment) => {
          const ref = await this.#tryGetAttachmentBlob(attachment)
          if (!ref) return null
          return getAttachmentFileName(attachment, ref.blobId, ref.mimeType)
        })
      )
      const feature = makeObservationFeature(observation, attachmentNames)
      const comma = first ? '' : ','
      first = false
      yield b4a.from(`${comma}\n      ` + JSON.stringify(feature))
    }
  }

  /**
   * @param {Iterable<Track>} tracks
   * @param {Object} options
   * @param {Set<string>} [options.seenObservations]
   * @param {SeenAttachments} [options.seenAttachments]
   * @param {string} [options.lang]
   * @returns {AsyncIterable<Buffer | Uint8Array>}
   */
  async *#exportTracks(
    tracks,
    { lang, seenObservations = new Set(), seenAttachments = new Map() } = {}
  ) {
    let first = true
    for (const track of tracks) {
      const { observationRefs } = track

      const observations = await Promise.all(
        observationRefs.map(({ docId }) =>
          this.#observations.getByDocId(docId, { lang })
        )
      )

      /** @type {([number, number] | [number, number, number])[]} */
      const coordinates = track.locations.map(
        ({ coords: { longitude, latitude, altitude } }) =>
          typeof altitude === 'number'
            ? [longitude, latitude, altitude]
            : [longitude, latitude]
      )
      const comma = first ? '' : ','
      first = false
      yield b4a.from(
        `${comma}\n      ` +
          JSON.stringify({
            type: 'Feature',
            properties: track,
            geometry: { type: 'LineString', coordinates },
          }) +
          '\n'
      )

      let firstObs = true
      for await (const chunk of this.#exportObservations(observations, {
        seenObservations,
        seenAttachments,
      })) {
        if (firstObs) {
          yield b4a.from(',')
          firstObs = false
        }
        yield chunk
      }
    }
  }

  /**
   * @param {Object} [options]
   * @param {boolean} [options.observations]
   * @param {boolean} [options.tracks]
   * @param {SeenAttachments} [options.seenAttachments]
   * @param {string} [options.lang]
   * @returns {AsyncIterable<Buffer | Uint8Array>}
   */
  async *#exportGeoJSONIterator({
    observations = true,
    tracks = true,
    lang,
    seenAttachments = new Map(),
  } = {}) {
    yield b4a.from(`{"type": "FeatureCollection","features": [
`)

    const seenObservations = new Set()

    let hadTracks = false
    if (tracks) {
      const rows = await this.#tracks.getMany({ lang })
      for await (const chunk of this.#exportTracks(rows, {
        lang,
        seenObservations,
        seenAttachments,
      })) {
        hadTracks = true
        yield chunk
      }
    }

    if (observations) {
      if (hadTracks) yield b4a.from(',')
      const rows = await this.#observations.getMany({ lang })
      yield* this.#exportObservations(rows, {
        seenObservations,
        seenAttachments,
      })
    }

    yield b4a.from(`]}`)
  }

  /**
   * @param {Object} [options]
   * @param {boolean} [options.observations]
   * @param {boolean} [options.tracks]
   * @param {SeenAttachments} [options.seenAttachments]
   * @param {string} [options.lang]
   * @returns {Readable<Buffer | Uint8Array>}
   */
  #exportGeoJSONStream({
    observations = true,
    tracks = true,
    lang,
    seenAttachments = new Map(),
  } = {}) {
    return Readable.from(
      this.#exportGeoJSONIterator({
        observations,
        tracks,
        lang,
        seenAttachments,
      })
    )
  }

  /**
   * @param {string} type
   * @returns {Promise<string>}
   */
  async #exportPrefix(type = '') {
    const name = await this.#getProjectName()
    const date = new Date()
    const yyyy = date.getFullYear()
    const mm = `${date.getMonth() + 1}`.padStart(2, '0')
    const dd = `${date.getDate()}`.padStart(2, '0')
    return `CoMapeo_${name}_${type}_${yyyy}_${mm}_${dd}`
  }

  /**
   * @param {boolean} observations
   * @param {boolean} tracks
   * @returns {Promise<string>}
   */
  async #geoJSONFileName(observations, tracks) {
    let exportType = ''
    if (observations) exportType += 'Obsvns'
    if (tracks) {
      if (observations) exportType += '_'
      exportType += 'Tracks'
    }
    return (await this.#exportPrefix(exportType)) + '.geojson'
  }

  /**
   * @param {boolean} observations
   * @param {boolean} tracks
   * @returns {Promise<string>}
   */
  async #zipFileName(observations, tracks) {
    let exportType = ''
    if (observations) exportType += 'Obsvns'
    if (tracks) {
      if (observations) exportType += '_'
      exportType += 'Tracks'
    }
    return (await this.#exportPrefix(exportType)) + '.zip'
  }

  /**
   * Export observations and/or tracks as a GeoJSON file.
   * @param {string} exportFolder
   * @param {ExportOptions} [options]
   * @returns {Promise<string>} Full path of the exported file
   */
  async exportGeoJSONFile(
    exportFolder,
    { observations = true, tracks = true, lang } = {}
  ) {
    const fileName = await this.#geoJSONFileName(observations, tracks)
    const filePath = path.join(exportFolder, fileName)
    const source = this.#exportGeoJSONStream({ observations, tracks, lang })
    const sink = fs.createWriteStream(filePath)

    try {
      await pipelinePromise(source, sink)
      return filePath
    } catch (e) {
      throw new GeoJSONExportError({ cause: e })
    }
  }

  /**
   * @param {Attachment} attachment
   * @returns {Promise<null | BlobRef>}
   */
  async #tryGetAttachmentBlob(attachment) {
    for (const variant of VARIANT_EXPORT_ORDER) {
      try {
        const blobId = buildBlobId(attachment, variant)
        const entry = await this.#blobStore.entry(blobId)
        if (!entry) continue
        const metadata = entry.value.metadata
        if (!metadata || typeof metadata !== 'object') continue
        let mimeType = undefined
        if ('mimeType' in metadata) {
          if (typeof metadata.mimeType === 'string') {
            mimeType = metadata.mimeType
          } else {
            this.#l.log('Invalid type for mimeType in blob', blobId, entry)
            continue
          }
        }
        const hasDownloaded = await this.#blobStore.hasDownloadedBlobEntry(
          blobId.driveId,
          entry
        )
        if (!hasDownloaded) continue
        return { blobId, mimeType }
      } catch (e) {
        this.#l.log(
          'Error loading blob id for attachment',
          attachment,
          variant,
          ensureError(e).message
        )
        continue
      }
    }
    return null
  }

  /**
   * @param {ZipArchive} archive
   * @param {ExportWithAttachmentsOptions} [options]
   * @returns {Promise<void>}
   */
  async #exportToArchive(
    archive,
    { observations = true, tracks = true, attachments = true, lang } = {}
  ) {
    const geoJSONFileName = await this.#geoJSONFileName(observations, tracks)
    const seenAttachments = new Map()
    const geoJSONStream = this.#exportGeoJSONStream({
      observations,
      tracks,
      lang,
      seenAttachments,
    })

    // @ts-expect-error
    await archive.entry(geoJSONStream, { name: geoJSONFileName })

    const missingAttachments = []
    if (attachments) {
      const mediaFolder = (await this.#exportPrefix('Media')) + '/'
      for (const attachment of seenAttachments.values()) {
        const ref = await this.#tryGetAttachmentBlob(attachment)
        if (ref === null) {
          missingAttachments.push(attachment)
          continue
        }

        const { blobId, mimeType } = ref

        if (mimeType && !mime.getExtension(mimeType)) {
          this.#l.log('Got unknown mime type in attachment blob', attachment)
        }

        const stream = this.#blobStore.createReadStream(blobId)
        const name = path.posix.join(
          mediaFolder,
          getAttachmentFileName(attachment, blobId, mimeType)
        )
        // @ts-expect-error
        await archive.entry(stream, { name })
      }

      if (missingAttachments.length) {
        this.#l.log('Found missing attachments during export')
        const missingContent = missingAttachments
          .map((a) => JSON.stringify(a))
          .join('\n')

        await archive.entry(missingContent, {
          name: mediaFolder + 'missing.ndjson',
        })
      }
    }
    archive.finalize()
  }

  /**
   * @param {ExportWithAttachmentsOptions} [options]
   * @returns {Readable<Buffer | Uint8Array>}
   */
  #exportZipStream({
    observations = true,
    tracks = true,
    attachments = true,
    lang,
  } = {}) {
    const archive = new ZipArchive()

    this.#exportToArchive(archive, {
      observations,
      tracks,
      attachments,
      lang,
    }).catch((e) => archive.emit('error', ensureError(e)))

    // @ts-expect-error
    return archive
  }

  /**
   * Export observations, tracks, and/or attachments as a zip file.
   * @param {string} exportFolder
   * @param {ExportWithAttachmentsOptions} [options]
   * @returns {Promise<string>} Full path of the exported file
   */
  async exportZipFile(
    exportFolder,
    { observations = true, tracks = true, attachments = true, lang } = {}
  ) {
    const fileName = await this.#zipFileName(observations, tracks)
    const filePath = path.join(exportFolder, fileName)
    const source = this.#exportZipStream({
      observations,
      tracks,
      attachments,
      lang,
    })
    const sink = fs.createWriteStream(filePath)
    try {
      await pipelinePromise(source, sink)
      return filePath
    } catch (e) {
      throw new GeoJSONExportError({ cause: e })
    }
  }
}

/**
 * @param {{name: string}} attachment
 * @param {{variant: string}} blobId
 * @param {string | undefined} mimeType
 * @returns {string}
 */
export function getAttachmentFileName(attachment, blobId, mimeType) {
  let extension = ''
  if (mimeType) {
    const ext = mime.getExtension(mimeType)
    if (ext) extension = `.${ext}`
  }
  return `${attachment.name}_${blobId.variant}${extension}`
}

/**
 * @param {Observation} observation
 * @param {(string | null)[]} [attachmentNames]
 * @return {ObservationFeature}
 */
export function makeObservationFeature(observation, attachmentNames) {
  const { lat, lon, docId } = observation

  const metadataCoords = observation.metadata?.position?.coords
  const altitude = metadataCoords?.altitude

  /** @type {[number, number] | [number, number, number] | null} */
  let coordinates = null

  if (typeof lat === 'number' && typeof lon === 'number') {
    coordinates =
      typeof altitude === 'number' ? [lon, lat, altitude] : [lon, lat]
  } else {
    if (
      typeof metadataCoords?.latitude === 'number' &&
      typeof metadataCoords?.longitude === 'number'
    ) {
      coordinates =
        typeof altitude === 'number'
          ? [metadataCoords.longitude, metadataCoords.latitude, altitude]
          : [metadataCoords.longitude, metadataCoords.latitude]
    }
  }

  /** @type {ObservationFeatureProperties} */
  const properties = {
    $id: docId,
    $createdAt: observation.createdAt,
  }

  if (observation.presetRef) {
    properties.$categoryId = observation.presetRef.docId
  }

  for (const [key, value] of Object.entries(observation.tags)) {
    if (value === null) continue
    properties[key] = value.toString()
  }

  if (attachmentNames) {
    attachmentNames.forEach((name, i) => {
      properties[`attachment_${i + 1}`] = name ?? null
    })
  }

  /** @type {ObservationFeature} */
  const feature = {
    type: 'Feature',
    properties,
    $comapeo: observation,
    geometry: coordinates ? { type: 'Point', coordinates } : null,
  }

  return feature
}
