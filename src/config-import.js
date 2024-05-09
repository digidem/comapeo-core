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

/**
 * @typedef {{
 *  [lang: string] : unknown
 * }} TranslationsFile
 */

/** @typedef {('presets' | 'fields')} ValidDocTypes */
/** @typedef
 *{{
 *  [lang: string]: Record<ValidDocTypes,unknown>
 * }} Translations
 */

/**
 * @typedef {Parameters<import('./icon-api.js').IconApi['create']>[0]} IconData
 */

/**
 * @param {string} configPath
 */
export async function readConfig(configPath) {
  /** @type {Error[]} */
  const warnings = []

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
      for (let { preset, name } of sortedPresets) {
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
     * @returns {Iterable<{name: string,value:import('@mapeo/schema').TranslationValue}>}
     */
    *translations() {
      if (!translationsFile) return
      for (let [lang, languageTranslations] of Object.entries(
        translationsFile
      )) {
        const { language: languageCode, region: regionCode } = parseBCP47(lang)
        if (!languageCode) throw new Error(`invalid translation language`)
        for (let [
          schemaNameRef,
          languageTranslationsForDocType,
        ] of Object.entries(languageTranslations)) {
          if (!isRecord(languageTranslationsForDocType))
            throw new Error(`invalid translation docType`)
          for (let [docName, fieldsToTranslate] of Object.entries(
            languageTranslationsForDocType
          )) {
            console.log('docName', docName)
            if (!isRecord(fieldsToTranslate))
              throw new Error(`invalid translation field`)
            for (let [fieldRef, message] of Object.entries(fieldsToTranslate)) {
              // we skip messages that aren't strings, for now
              if (isRecord(message)) continue
              if (typeof message !== 'string')
                throw new Error(`invalid translation message`)
              let translationValue = {
                /** @type {'translation'} */
                schemaName: 'translation',
                languageCode,
                regionCode: regionCode || '',
                schemaNameRef,
                fieldRef,
                message,
                docIdRef: '',
              }

              if (!validate('translation', { ...translationValue })) {
                warnings.push(
                  new Error(`Invalid translation ${translationValue.message}`)
                )
                continue
              }

              yield {
                name: docName,
                value: translationValue,
              }
            }
          }
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
    throw new Error('Could not parse translation.json')
  }
  assert(isRecord(result), 'Invalid translations.json file')
  return parseTranslations(result)
}

/**
 * @param {TranslationsFile} translations
 * @returns {Translations}
 */
function parseTranslations(translations) {
  /** @type {Translations} */
  const translatedLangs = {}
  for (let [lang, translationByLang] of Object.entries(translations)) {
    const langTranslation = { presets: {}, fields: {} }
    if (!isRecord(translationByLang))
      throw new Error('invalid translation lang object')
    for (let [docType, translationByDocType] of Object.entries(
      translationByLang
    )) {
      if (!isRecord(translationByDocType))
        throw new Error('invalid translation docType object')
      if (!(docType === 'presets' || docType === 'fields')) continue

      langTranslation[docType] = translationByDocType
    }
    if (Object.keys(langTranslation).length === 0) continue
    translatedLangs[lang] = langTranslation
  }
  return translatedLangs
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
