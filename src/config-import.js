import yauzl from 'yauzl-promise'
import { validate, valueSchemas } from '@mapeo/schema'
import { json, buffer } from 'node:stream/consumers'
import { assert } from './utils.js'
import path from 'node:path'
import { parse as parseBCP47 } from 'bcp-47'

// Throw error if a zipfile contains more than 10,000 entries
const MAX_ENTRIES = 10_000
const MAX_ICON_SIZE = 10_000_000

/**
 * @typedef {yauzl.Entry} Entry
 */
/**
 * @typedef {{
 *   presets: { [id: string]: unknown }
 *   fields:  { [id: string]: unknown }
 * }} PresetsFile
 */

/** @typedef {('presets' | 'fields')} ValidDocTypes */
/**
 * @typedef {{
 *  [lang: string]: unknown
 * }} TranslationsFile
 */

/**
 * @typedef {Parameters<import('./icon-api.js').IconApi['create']>[0]} IconData
 */

/** @type {Error[]} */
let warnings = []

/**
 * @param {string} configPath
 */
export async function readConfig(configPath) {
  warnings = []
  const zip = await yauzl.open(configPath)
  if (zip.entryCount > MAX_ENTRIES) {
    // MAX_ENTRIES in MAC can be inacurrate
    throw new Error(`Zip file contains too many entries. Max is ${MAX_ENTRIES}`)
  }
  const entries = await zip.readEntries(MAX_ENTRIES)
  const presetsFile = await findPresetsFile(entries)
  const translationsFile = await findTranslationsFile(entries)

  return {
    get warnings() {
      return warnings
    },

    async close() {
      zip.close()
    },

    /**
     * @returns {AsyncIterable<IconData>}
     */
    async *icons() {
      /** @type {IconData | undefined} */
      let icon

      // we sort the icons by filename so we can group variants together
      const iconEntries = entries
        .filter((entry) => entry.filename.match(/^icons\/([^/]+)$/))
        .sort((icon, nextIcon) =>
          icon.filename.localeCompare(nextIcon.filename)
        )

      for (const entry of iconEntries) {
        if (entry.uncompressedSize > MAX_ICON_SIZE) {
          warnings.push(
            new Error(
              `icon ${entry.filename} is bigger than maximum allowed size (10MB) `
            )
          )
          continue
        }
        const buf = await buffer(await entry.openReadStream())
        const iconFilename = entry.filename.replace(/^icons\//, '')
        try {
          const { name, variant } = parseIcon(iconFilename, buf)
          // new icon (first pass)
          if (!icon) {
            icon = {
              name,
              variants: [variant],
            }
            // icon already exists, push new variant
          } else if (icon.name === name) {
            icon.variants.push(variant)
          } else {
            // icon has change
            yield icon
            icon = {
              name,
              variants: [variant],
            }
          }
        } catch (err) {
          warnings.push(
            err instanceof Error
              ? err
              : new Error('Unknown error importing icon')
          )
        }
      }
      if (icon) {
        yield icon
      }
    },

    /**
     * @returns {Iterable<{ name: string, value: import('@mapeo/schema').FieldValue }>}
     */
    *fields() {
      const { fields } = presetsFile
      for (const [name, field] of Object.entries(fields)) {
        if (!isRecord(field)) {
          warnings.push(new Error(`Invalid field ${name}`))
          continue
        }
        /** @type {Record<string, unknown>} */
        const fieldValue = {
          schemaName: 'field',
        }
        for (const key of Object.keys(valueSchemas.field.properties)) {
          if (hasOwn(field, key)) {
            fieldValue[key] = field[key]
          }
        }
        if (!validate('field', fieldValue)) {
          warnings.push(new Error(`Invalid field ${name}`))
          continue
        }
        yield {
          name,
          value: fieldValue,
        }
      }
    },

    /**
     * @returns {Iterable<{ fieldNames: string[], iconName: string | undefined, value: import('@mapeo/schema').PresetValue, name: String}>}
     */
    *presets() {
      const { presets } = presetsFile
      // sort presets using the sort field, turn them into an array
      /** @type {Array<{preset:Record<string, unknown>, name: String}>} */
      const sortedPresets = []
      for (const [presetName, preset] of Object.entries(presets)) {
        if (isRecord(preset)) {
          sortedPresets.push({ name: presetName, preset })
        } else {
          warnings.push(new Error(`invalid preset ${presetName}`))
        }
      }
      sortedPresets.sort(({ preset }, { preset: nextPreset }) => {
        const sort = typeof preset.sort === 'number' ? preset.sort : Infinity
        const nextSort =
          typeof nextPreset.sort === 'number' ? nextPreset.sort : Infinity
        return sort - nextSort
      })

      // 5. for each preset get the corresponding fieldId and iconId, add them to the db
      for (const { preset, name } of sortedPresets) {
        /** @type {Record<string, unknown>} */
        const presetValue = {
          schemaName: 'preset',
          fieldIds: [],
          addTags: {},
          removeTags: {},
          terms: [],
        }
        for (const key of Object.keys(valueSchemas.preset.properties)) {
          if (hasOwn(preset, key)) {
            presetValue[key] = preset[key]
          }
        }
        if (!validate('preset', presetValue)) {
          warnings.push(new Error(`Invalid preset ${preset.name}`))
          continue
        }
        yield {
          fieldNames:
            'fields' in preset && Array.isArray(preset.fields)
              ? preset.fields
              : [],
          iconName:
            'icon' in preset && typeof preset.icon === 'string'
              ? preset.icon
              : undefined,
          value: presetValue,
          name,
        }
      }
    },
    /**
     * @returns {Iterable<{
     * name: string,
     * value:Omit<import('@mapeo/schema').TranslationValue, 'docIdRef'>}>}
     */
    *translations() {
      if (!translationsFile) return
      for (const [lang, languageTranslations] of Object.entries(
        translationsFile
      )) {
        if (!isRecord(languageTranslations))
          throw new Error('invalid language translations object')
        for (const { name, value } of translationsForLanguage(
          lang,
          languageTranslations
        )) {
          yield { name, value }
        }
      }
    },
  }
}

/**
 * @param {ReadonlyArray<Entry>} entries
 * @rejects if the presets file cannot be found or is invalid
 * @returns {Promise<PresetsFile>}
 */
async function findPresetsFile(entries) {
  const presetsEntry = entries.find(
    (entry) => entry.filename === 'presets.json'
  )
  assert(presetsEntry, 'Zip file does not contain presets.json')

  /** @type {unknown} */
  let result
  try {
    result = await json(await presetsEntry.openReadStream())
  } catch (err) {
    throw new Error('Could not parse presets.json')
  }

  assert(isRecord(result), 'Invalid presets.json file')
  const { presets, fields } = result
  assert(isRecord(presets) && isRecord(fields), 'Invalid presets.json file')

  return { presets, fields }
}

/**
 * @param {ReadonlyArray<Entry>} entries
 * @returns {Promise<TranslationsFile | undefined>}
 */
async function findTranslationsFile(entries) {
  const translationEntry = entries.find(
    (entry) => entry.filename === 'translations.json'
  )
  if (!translationEntry) return

  /** @type {unknown} */
  let result
  try {
    result = await json(await translationEntry.openReadStream())
  } catch (err) {
    throw new Error('Could not parse translations.json')
  }
  assert(isRecord(result), 'Invalid translations.json file')
  return result
}

/**
 * @param {string} lang
 * @param {Record<string, unknown>} languageTranslations
 *
 */
function* translationsForLanguage(lang, languageTranslations) {
  const { language: languageCode, region: regionCode } = parseBCP47(lang)
  if (!languageCode) {
    warnings.push(new Error(`invalid translation language ${lang}`))
    return
  }
  for (const [schemaNameRef, languageTranslationsForDocType] of Object.entries(
    languageTranslations
  )) {
    // TODO: push to warnings when removing categories from default config
    if (!(schemaNameRef === 'fields' || schemaNameRef === 'presets')) {
      // warnings.push(new Error(`invalid schemaNameRef ${schemaNameRef}`))
      continue
    }
    if (!isRecord(languageTranslationsForDocType)) {
      warnings.push(new Error('invalid translation for docType object'))
      continue
    }
    yield* translationsForDocType({
      languageCode,
      regionCode,
      schemaNameRef,
      languageTranslationsForDocType,
    })
  }
}

/** @param {Object} opts
 * @param {string} opts.languageCode
 * @param {string | null | undefined} opts.regionCode
 * @param {ValidDocTypes} opts.schemaNameRef
 * @param {Record<ValidDocTypes, unknown>} opts.languageTranslationsForDocType
 */
function* translationsForDocType({
  languageCode,
  regionCode,
  schemaNameRef,
  languageTranslationsForDocType,
}) {
  for (const [docName, fieldsToTranslate] of Object.entries(
    languageTranslationsForDocType
  )) {
    if (!isRecord(fieldsToTranslate)) {
      warnings.push(new Error(`invalid translation field`))
      return
    }
    yield* translationForValue({
      languageCode,
      regionCode,
      schemaNameRef,
      docName,
      fieldsToTranslate,
    })
  }
}

/**
 * @param {Object} opts
 * @param {string} opts.languageCode
 * @param {string | null | undefined} opts.regionCode
 * @param {ValidDocTypes} opts.schemaNameRef
 * @param {string} opts.docName
 * @param {Record<string,unknown>} opts.fieldsToTranslate
 */
function* translationForValue({
  languageCode,
  regionCode,
  schemaNameRef,
  docName,
  fieldsToTranslate,
}) {
  for (const [fieldRef, message] of Object.entries(fieldsToTranslate)) {
    let value = {
      /** @type {'translation'} */
      schemaName: 'translation',
      languageCode,
      regionCode: regionCode || '',
      schemaNameRef,
      fieldRef: '',
      message: '',
    }

    if (isRecord(message)) {
      yield* translateMessageObject({ value, message, docName })
    } else if (typeof message === 'string') {
      value = { ...value, fieldRef, message }
      if (!validate(value.schemaName, { ...value, docIdRef: '' })) {
        warnings.push(new Error(`Invalid translation ${value.message}`))
        continue
      }

      yield { name: docName, value }
    } else {
      warnings.push(
        new Error(`Invalid translation message type ${typeof message}`)
      )
      continue
    }
  }
}
/**
 * @param {Object} opts
 * @param {any} opts.value
 * @param {string} opts.docName
 * @param {Record<string,unknown>} opts.message
 */
function* translateMessageObject({ value, message, docName }) {
  let idx = 0
  for (const translation of Object.values(message)) {
    if (isRecord(translation)) {
      for (const [key, msg] of Object.entries(translation)) {
        if (typeof msg === 'string') {
          value = {
            ...value,
            fieldRef: `${value.fieldRef}[${idx}].${key}`,
            message: msg,
          }
          if (!validate(value.schemaName, { ...value, docIdRef: '' })) {
            warnings.push(new Error(`Invalid translation ${value.message}`))
            continue
          }
          yield {
            value,
            name: docName,
          }
        }
      }
      idx++
    }
  }
}

/**
 * @param {string} filename
 * @param {Buffer} buf
 * @returns {{ name: string, variant: IconData['variants'][Number] }}}
 */
function parseIcon(filename, buf) {
  const parsedFilename = path.parse(filename)
  const matches = parsedFilename.base.match(
    /([a-zA-Z0-9-]+)-([a-zA-Z]+)@(\d+)x\.[a-zA-Z]+$/
  )
  if (!matches) {
    throw new Error(`Unexpected icon filename ${filename}`)
  }
  /* eslint-disable no-unused-vars */
  const [_, name, size, pixelDensityStr] = matches
  const pixelDensity = Number(pixelDensityStr)
  if (!(pixelDensity === 1 || pixelDensity === 2 || pixelDensity === 3)) {
    throw new Error(`Error loading icon. invalid pixel density ${pixelDensity}`)
  }
  if (!(size === 'small' || size === 'medium' || size === 'large')) {
    throw new Error(`Error loading icon. invalid size ${size}`)
  }
  if (!name) {
    throw new Error('Error loading icon. missing name')
  }
  /** @type {'image/png' | 'image/svg+xml'} */
  let mimeType
  switch (parsedFilename.ext.toLowerCase()) {
    case '.png':
      mimeType = 'image/png'
      break
    case '.svg':
      mimeType = 'image/svg+xml'
      break
    default:
      throw new Error(`Unexpected icon extension ${parsedFilename.ext}`)
  }
  return {
    name,
    variant: {
      size,
      mimeType,
      pixelDensity,
      blob: buf,
    },
  }
}

/**
 * @param {unknown} value
 * @returns {value is Record<string, unknown>}
 */
function isRecord(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
}

/**
 * @param {Record<string | symbol, unknown>} obj
 * @param {string | symbol} prop
 */
function hasOwn(obj, prop) {
  return Object.prototype.hasOwnProperty.call(obj, prop)
}
