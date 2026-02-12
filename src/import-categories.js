import PQueue from 'p-queue'
import { Reader } from 'comapeocat/reader.js'
import { typedEntries } from './utils.js'
import { parseBcp47 } from './intl/parse-bcp-47.js'
import ensureError from 'ensure-error'
import { IconNotFoundError, KeyNotFoundError } from './errors.js'

// The main reason for the concurrency limit is to avoid run-away memory usage.
// The comapeocat Reader limits icon size to 2Mb (as-per the specification), and
// it's likely that as SVGs, most icons will be much smaller than that, but we
// don't want a file with 1,000 icons of 2Mb each to bring a device to its
// knees. The choice of 4 is somewhat arbitrary, but should keep memory usage
// reasonable even in the worst case (8Mb of icon data in memory at once), while
// still allowing some parallelism to speed up the import.
const ICON_QUEUE_CONCURRENCY = 4
// Because fields and presets are all stored in a single file in the categories
// archive, they all need to be loaded into memory at once anyway (each file,
// with all docs, is limited to 1Mb). The concurrency limit here is somewhat
// arbitrary also, but it's to avoid a performance bottleneck if a user tries to
// import a file with thousands of categories or fields.
const DOC_QUEUE_CONCURRENCY = 32

/** @import {MapeoProject} from './mapeo-project.js' */
/** @typedef {{ docId: string, versionId: string }} Ref */
/**
 * @param {MapeoProject} project
 * @param {object} options
 * @param {string} options.filePath
 * @param {import('./logger.js').Logger} options.logger
 * @returns {Promise<void>}
 */
export async function importCategories(project, { filePath, logger }) {
  // Queue promises to create icons and docs, initially with concurrency of 4
  // for icons, to minimize memory usage.
  const queue = new PQueue({ concurrency: ICON_QUEUE_CONCURRENCY })

  // TODO: We should use something like a hash to avoid deleting and
  // re-importing presets and fields that have not changed, and try to identify
  // modified presets and fields so we can update them rather than delete and
  // re-create.
  const presetsToDelete = await existingDocIds(project.preset)
  const fieldsToDelete = await existingDocIds(project.field)
  // No need to delete translations or icons, since these are always fetched by
  // their references, so unreferenced icons and translations are just ignored
  // (because our DB is immutable, deleting docs does not save space, it instead
  // adds a new copy of the doc with `deleted: true` to the DB)

  const reader = new Reader(filePath)
  try {
    // This validates that all icons and fields referenced by categories exist -
    // it should throw an error here (before any docs are created) for any of the
    // errors that we check for below.
    await reader.validate()

    /** @type {Map<string, Ref>} */
    const iconNameToRef = new Map()
    /** @type {Map<string, Ref>} */
    const fieldNameToRef = new Map()
    /** @type {Map<string, Ref>} */
    const presetNameToRef = new Map()

    const categories = await reader.categories()
    // We only add icons referenced by categories (the archive could contain additional icons)
    /** @type {Set<string>} */
    const iconsToAdd = new Set()
    // Only import icons that are referenced by categories, rather than all icons in the file
    for (const category of categories.values()) {
      if (!('icon' in category && category.icon)) continue
      iconsToAdd.add(category.icon)
    }
    /** @type {Error[]} */
    const errors = []
    for (const iconName of iconsToAdd) {
      queue
        .add(async () => {
          const iconXml = await reader.getIcon(iconName)
          if (!iconXml) {
            // This should never happen because of the validate() call above
            throw new IconNotFoundError(iconName)
          }
          /** @type {Parameters<typeof project.$icons.create>[0]} */
          const icon = {
            name: iconName,
            variants: [
              {
                mimeType: 'image/svg+xml',
                size: 'medium',
                blob: Buffer.from(iconXml, 'utf-8'),
              },
            ],
          }

          await project.$icons.create(icon).then(({ docId, versionId }) => {
            iconNameToRef.set(iconName, { docId, versionId })
          })
        })
        .catch((err) => {
          // The queue task added above could throw (it shouldn't!), and the
          // promise for that task is returned by `queue.add()`. We don't await
          // this (because we want to keep adding items to the queue), but we need
          // to avoid an uncaught error, so we catch it here and store it for later.
          errors.push(ensureError(err))
        })
    }

    await queue.onIdle()
    if (errors.length > 0) {
      throw new AggregateError(
        errors,
        'Errors occurred creating icons during import'
      )
    }
    queue.concurrency = DOC_QUEUE_CONCURRENCY // increase concurrency for creating fields and presets

    const fields = await reader.fields()
    /** @type {Set<string>} */
    const fieldsToAdd = new Set()
    // Only import fields that are referenced by categories, rather than all fields in the file
    for (const category of categories.values()) {
      for (const fieldName of category.fields) {
        fieldsToAdd.add(fieldName)
      }
    }
    for (const fieldName of fieldsToAdd) {
      const field = getOrThrow(fields, fieldName)
      /** @type {import('@comapeo/schema').FieldValue} */
      const fieldValue = { ...field, schemaName: 'field' }
      queue
        .add(() =>
          project.field.create(fieldValue).then(({ docId, versionId }) => {
            fieldNameToRef.set(fieldName, { docId, versionId })
          })
        )
        .catch((err) => {
          errors.push(ensureError(err))
        })
    }

    // Must wait for all fields and icons to be created before creating presets,
    // because we need the field and icon refs
    await queue.onIdle()
    if (errors.length > 0) {
      throw new AggregateError(
        errors,
        'Errors occurred creating fields during import'
      )
    }

    for (const [categoryName, category] of categories) {
      const {
        fields: fieldNames,
        icon: iconName,
        appliesTo,
        ...rest
      } = category
      /** @type {Ref[]} */
      const fieldRefs = []
      for (const fieldName of fieldNames) {
        const fieldRef = getOrThrow(fieldNameToRef, fieldName)
        fieldRefs.push(fieldRef)
      }

      /** @type {import('./icon-api.js').IconRef} */
      let iconRef
      if (iconName) {
        iconRef = getOrThrow(iconNameToRef, iconName)
      }

      /** @type {import('@comapeo/schema').PresetValue} */
      const presetValue = {
        ...rest,
        geometry: appliesToToGeometry(appliesTo),
        fieldRefs,
        iconRef,
        schemaName: 'preset',
      }

      queue
        .add(() =>
          project.preset.create(presetValue).then(({ docId, versionId }) => {
            presetNameToRef.set(categoryName, { docId, versionId })
          })
        )
        .catch((err) => {
          errors.push(ensureError(err))
        })
    }

    const { buildDateValue, ...readerMetadata } = await reader.metadata()
    const fileVersion = await reader.fileVersion()

    // Need to wait for all presets to be created so that we can read the refs for the translations
    await queue.onIdle()

    for await (const {
      lang,
      translations: translationsByDocType,
    } of reader.translations()) {
      const { language: languageCode, region: regionCode } = parseBcp47(lang)
      if (!languageCode) {
        logger.log(`ignoring invalid language tag: ${lang}`)
        continue
      }
      for (const [docType, translationsByDocId] of typedEntries(
        translationsByDocType
      )) {
        if (!translationsByDocId) continue
        for (const [docId, translations] of typedEntries(translationsByDocId)) {
          /** @type {{ docId: string, versionId: string } | undefined} */
          let docRef
          if (docType === 'field') {
            docRef = fieldNameToRef.get(docId)
          } else if (docType === 'category') {
            docRef = presetNameToRef.get(docId)
          }
          if (!docRef) {
            // ignore translations that reference unknown docs or doc types
            continue
          }
          for (const [propertyRef, message] of typedEntries(translations)) {
            /** @type {Parameters<typeof project.$translation.put>[0]} */
            const translationValue = {
              schemaName: 'translation',
              languageCode: languageCode,
              regionCode: regionCode ?? undefined,
              docRefType: docType === 'category' ? 'preset' : 'field',
              docRef,
              propertyRef,
              message,
            }
            queue
              .add(() => project.$translation.put(translationValue))
              .catch((err) => {
                errors.push(ensureError(err))
              })
            // Since translations are stored in separate files in the archive,
            // and there could potentially be hundreds of them in the future,
            // and the async iterator in this loop will load a new file for
            // every iteration, we pause here when there are queued tasks (up to
            // DOCS_QUEUE_CONCURRENCY tasks could be pending however) to avoid
            // run-away memory usage.
            await queue.onSizeLessThan(1)
          }
        }
      }
    }

    // Need to wait for all presets to be created so that we can read the refs for the defaultPresets
    await queue.onIdle()
    if (errors.length > 0) {
      throw new AggregateError(
        errors,
        'Errors occurred creating presets or translations during import'
      )
    }
    /** @type {import('@comapeo/schema').ProjectSettings['defaultPresets']} */
    const defaultPresets = {
      point: [],
      line: [],
      area: [],
      vertex: [],
      relation: [],
    }
    const categorySelection = await reader.categorySelection()
    for (const categoryName of categorySelection.observation) {
      const ref = getOrThrow(presetNameToRef, categoryName)
      defaultPresets.point.push(ref.docId)
    }
    for (const categoryName of categorySelection.track) {
      const ref = getOrThrow(presetNameToRef, categoryName)
      defaultPresets.line.push(ref.docId)
    }

    await project.$setProjectSettings({
      defaultPresets,
      configMetadata: {
        ...readerMetadata,
        fileVersion,
        importDate: new Date().toISOString(),
        buildDate: new Date(buildDateValue).toISOString(),
      },
    })

    for (const docId of presetsToDelete) {
      queue
        .add(() => project.preset.delete(docId))
        .catch((err) => {
          errors.push(ensureError(err))
        })
    }
    for (const docId of fieldsToDelete) {
      queue
        .add(() => project.field.delete(docId))
        .catch((err) => {
          errors.push(ensureError(err))
        })
    }
    await queue.onIdle()
    if (errors.length > 0) {
      throw new AggregateError(
        errors,
        'Errors occurred deleting old presets or fields during import'
      )
    }
  } finally {
    // Don't throw errors from closing the reader, because if the import was
    // successful we don't want to throw an error, and if there was an error
    // with the import, the error thrown here would mask that error (Control
    // flow statements (return, throw, break, continue) in the finally block
    // will "mask" any completion value of the try block or catch block)
    await reader.close().catch((err) => {
      logger.log('ERROR: closing import file reader', err)
    })
  }
}

/**
 * List the docIds of all existing (excluding deleted) docs in the given dataType
 *
 * @param {MapeoProject['field'] | MapeoProject['preset']} dataType
 * @returns {Promise<Set<string>>}
 */
async function existingDocIds(dataType) {
  const toDelete = new Set()
  for (const { docId } of await dataType.getMany()) {
    toDelete.add(docId)
  }
  return toDelete
}

const APPLIES_TO_TO_GEOMETRY = /** @type {const} */ ({
  observation: 'point',
  track: 'line',
})

/**
 * Map the new "appliesTo" field to the old "geometry" field
 *
 * @param {import('comapeocat/reader.js').CategoryOutput['appliesTo']} appliesTo)}
 * @returns {import('@comapeo/schema').Preset['geometry']}
 */
function appliesToToGeometry(appliesTo) {
  return appliesTo.map((a) => APPLIES_TO_TO_GEOMETRY[a]).filter(Boolean)
}

// In the import function, the validation of the import file should ensure that
// all references exist, so map.get() should always succeed, however TS is
// unable to validate this statically. There should be no way that this will
// throw, but this helper will catch the case we haven't though of yet.
/**
 * Get a value from a Map, or throw an error if the key is not present
 *
 * @template {string} K, V
 * @param {Map<K, V>} map
 * @param {K} key
 * @returns {V}
 * @throws {TypeError} if `map` is not a Map
 * @throws {Error} if `key` is not in `map` (with `msgOrError` as message or the default message)
 */
function getOrThrow(map, key) {
  if (!(map instanceof Map)) throw new TypeError('map must be a Map')
  if (!map.has(key)) {
    throw new KeyNotFoundError(key)
  }
  return /** @type {V} */ (map.get(key))
}
