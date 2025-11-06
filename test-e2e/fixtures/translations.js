import { generate } from '@mapeo/mock-data'
import { valueOf } from '@comapeo/schema'

// Preset fixtures for testing
export const presetFixtures = [
  {
    ...valueOf(generate('preset')[0]),
    name: 'Building',
  },
  {
    ...valueOf(generate('preset')[0]),
    name: 'River',
  },
]

// Field fixtures for testing
export const fieldFixtures = [
  {
    ...valueOf(generate('field')[0]),
    label: 'Note',
  },
  {
    ...valueOf(generate('field')[0]),
    label: 'Owner',
  },
]

// Translation messages for presets (Spanish - Argentina)
/** @type {Object.<string,string>} */
export const presetTranslationMessages = {
  Building: 'Edificio',
  River: 'Río',
}

// Translation messages for fields (Spanish - Argentina)
/** @type {Object.<string,string>} */
export const fieldTranslationMessages = {
  Note: 'Nota',
  Owner: 'Dueño',
}

/**
 * Create translation documents for presets
 * @param {Array<{docId: string, versionId: string, name: string}>} presets
 */
export function createPresetTranslations(presets) {
  return presets
    .map((preset) => {
      const translation = presetTranslationMessages[preset.name]
      if (!translation) return undefined
      return {
        schemaName: /** @type {const} */ ('translation'),
        docRefType: /** @type {const} */ ('preset'),
        languageCode: 'spa',
        regionCode: 'AR',
        propertyRef: 'name',
        message: translation,
        docRef: { docId: preset.docId, versionId: preset.versionId },
      }
    })
    .filter((t) => t !== undefined)
}

/**
 * Create translation documents for fields
 * @param {Array<{docId: string, versionId: string, label: string}>} fields
 */
export function createFieldTranslations(fields) {
  return fields
    .map((field) => {
      const translation = fieldTranslationMessages[field.label]
      if (!translation) return undefined
      return {
        schemaName: /** @type {const} */ ('translation'),
        docRefType: /** @type {const} */ ('field'),
        languageCode: 'spa',
        regionCode: 'AR',
        propertyRef: 'label',
        message: translation,
        docRef: { docId: field.docId, versionId: field.versionId },
      }
    })
    .filter((t) => t !== undefined)
}
