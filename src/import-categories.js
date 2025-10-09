import { Reader } from 'comapeocat/reader.js'
import { NotFoundError } from './errors.js'
import { typedEntries } from './utils.js'
import { parseBcp47 } from './intl/parse-bcp-47.js'

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
  const presetsToDelete = await grabDocsToDelete(project.preset)
  const fieldsToDelete = await grabDocsToDelete(project.field)
  // delete only translations that refer to deleted fields and presets
  const translationsToDelete = await grabTranslationsToDelete({
    logger,
    translation: project.$translation.dataType,
    preset: project.preset,
    field: project.field,
  })
  const reader = new Reader(filePath)

  /** @type {Map<string, Ref>} */
  const iconNameToRef = new Map()
  /** @type {Map<string, Ref>} */
  const fieldNameToRef = new Map()
  /** @type {Map<string, Ref>} */
  const presetNameToRef = new Map()

  const categories = await reader.categories()
  // Do this in serial not parallel to avoid memory issues (avoid keeping all icon buffers in memory)
  // Only import icons that are referenced by categories
  for (const category of categories.values()) {
    if (!('icon' in category && category.icon)) continue
    const iconName = category.icon
    if (iconNameToRef.has(iconName)) continue // already have this icon
    const iconXml = await reader.getIcon(iconName)
    if (!iconXml) {
      throw new Error(
        `Icon ${iconName}, referenced by category "${category.name}" not found in import file`
      )
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
    const { docId, versionId } = await project.$icons.create(icon)
    iconNameToRef.set(iconName, { docId, versionId })
  }

  // Ok to create fields and presets in parallel
  const fieldPromises = []
  const fields = await reader.fields()
  // Only import fields that are referenced by categories
  for (const category of categories.values()) {
    for (const fieldName of category.fields) {
      if (fieldNameToRef.has(fieldName)) continue // already have this field
      const field = fields.get(fieldName)
      if (!field) {
        throw new Error(
          `Field ${fieldName}, referenced by category "${category.name}" not found in import file`
        )
      }
      /** @type {import('@comapeo/schema').FieldValue} */
      const fieldValue = { ...field, schemaName: 'field' }
      fieldPromises.push(
        project.field.create(fieldValue).then(({ docId, versionId }) => {
          fieldNameToRef.set(fieldName, { docId, versionId })
        })
      )
    }
  }
  await Promise.all(fieldPromises)

  const presetPromises = []
  for (const [categoryName, category] of categories) {
    const { fields: fieldNames, icon: iconName, appliesTo, ...rest } = category
    const fieldRefs = fieldNames.map((fieldName) => {
      const fieldRef = fieldNameToRef.get(fieldName)
      if (!fieldRef) {
        throw new NotFoundError(
          `field ${fieldName} not found (referenced by category "${category.name}")})`
        )
      }
      return fieldRef
    })

    /** @type {import('./icon-api.js').IconRef} */
    let iconRef
    if (iconName) {
      iconRef = iconNameToRef.get(iconName)
      if (!iconRef) {
        throw new NotFoundError(
          `icon ${iconName} not found (referenced by category "${category.name}")`
        )
      }
    }

    /** @type {import('@comapeo/schema').PresetValue} */
    const presetValue = {
      ...rest,
      geometry: appliesToToGeometry(appliesTo),
      fieldRefs,
      iconRef,
      schemaName: 'preset',
    }

    presetPromises.push(
      project.preset.create(presetValue).then(({ docId, versionId }) => {
        presetNameToRef.set(categoryName, { docId, versionId })
      })
    )
  }

  await Promise.all(presetPromises)

  const translationPromises = []
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
          translationPromises.push(
            project.$translation.put({
              schemaName: 'translation',
              languageCode: languageCode,
              regionCode: regionCode ?? undefined,
              docRefType: docType === 'category' ? 'preset' : 'field',
              docRef,
              propertyRef,
              message,
            })
          )
        }
      }
    }
  }
  await Promise.all(translationPromises)

  const defaultPresets = categorySelectionToDefaultPresets(
    await reader.categorySelection()
  )
  const { buildDateValue, ...readerMetadata } = await reader.metadata()
  await project.$setProjectSettings({
    defaultPresets,
    configMetadata: {
      ...readerMetadata,
      fileVersion: '', // TODO: use reader.fileVersion()
      importDate: new Date().toISOString(),
      buildDate: new Date(buildDateValue).toISOString(),
    },
  })

  const deletePresetsPromise = Promise.all(
    presetsToDelete.map(async (docId) => {
      const { deleted } = await project.preset.getByDocId(docId)
      if (!deleted) await project.preset.delete(docId)
    })
  )
  const deleteFieldsPromise = Promise.all(
    fieldsToDelete.map(async (docId) => {
      const { deleted } = await project.field.getByDocId(docId)
      if (!deleted) await project.field.delete(docId)
    })
  )
  const deleteTranslationsPromise = Promise.all(
    [...translationsToDelete].map(async (docId) => {
      const { deleted } = await project.$translation.dataType.getByDocId(docId)
      if (!deleted) await project.$translation.dataType.delete(docId)
    })
  )
  await Promise.all([
    deletePresetsPromise,
    deleteFieldsPromise,
    deleteTranslationsPromise,
  ])

  // TODO: Close zipfile even on error
}

/**
 @param {MapeoProject['field'] | MapeoProject['preset']} dataType
 @returns {Promise<String[]>}
 */
async function grabDocsToDelete(dataType) {
  const toDelete = []
  for (const { docId } of await dataType.getMany()) {
    toDelete.push(docId)
  }
  return toDelete
}

/**
 * @param {Object} opts
 * @param {import('./logger.js').Logger} opts.logger
 * @param {MapeoProject['$translation']['dataType']} opts.translation
 * @param {MapeoProject['preset']} opts.preset
 * @param {MapeoProject['field']} opts.field
 * @returns {Promise<Set<String>>}
 */
async function grabTranslationsToDelete(opts) {
  /** @type {Set<String>} */
  const toDelete = new Set()
  const translations = await opts.translation.getMany()
  await Promise.all(
    translations.map(async ({ docRefType, docRef, docId }) => {
      if (docRefType === 'field' || docRefType === 'preset') {
        let doc
        try {
          doc = await opts[docRefType].getByVersionId(docRef.versionId)
        } catch (e) {
          opts.logger.log(`referred ${docRef.versionId} is not found`)
        }
        if (doc) {
          toDelete.add(docId)
        }
      }
    })
  )
  return toDelete
}

const APPLIES_TO_TO_GEOMETRY = /** @type {const} */ ({
  observation: 'point',
  track: 'line',
})

/**
 * @param {import('comapeocat/reader.js').CategoryOutput['appliesTo']} appliesTo)}
 * @returns {import('@comapeo/schema').Preset['geometry']}
 */
function appliesToToGeometry(appliesTo) {
  return appliesTo.map((a) => APPLIES_TO_TO_GEOMETRY[a]).filter(Boolean)
}

/**
 * @param {import('comapeocat/reader.js').CategorySelectionOutput} categorySelection
 * @returns {import('@comapeo/schema').ProjectSettings['defaultPresets']}
 */
function categorySelectionToDefaultPresets(categorySelection) {
  return {
    point: categorySelection.observation,
    line: categorySelection.track,
    area: [],
    vertex: [],
    relation: [],
  }
}
