import yauzl from 'yauzl-promise'
import { validate, valueSchemas } from '@mapeo/schema'
import { text, buffer } from 'node:stream/consumers'

// Throw error if a zipfile contains more than 10,000 entries
const MAX_ENTRIES = 10_000

/**
 * @typedef {Omit<yauzl.Entry, 'fileName'> & { filename: string }} Entry
 */
/**
 * @typedef {{
 *   presets: { [id: string]: unknown }
 *   fields:  { [id: string]: unknown }
 * }} PresetsFile
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
    throw new Error(`Zip file contains too many entries. Max is ${MAX_ENTRIES}`)
  }
  /** @type {Entry[]} */
  const entries = /** @type {any} */ (await zip.readEntries(MAX_ENTRIES))

  const presetsEntry = entries.find((e) => e.filename === 'presets.json')
  if (!presetsEntry) {
    throw new Error('Zip file does not contain presets.json')
  }
  const presetsFile = JSON.parse(
    await text(await presetsEntry.openReadStream())
  )
  validatePresetsFile(presetsFile)

  return {
    get errors() {
      if (warnings.length === 0) return null
      return warnings
    },

    async close() {
      zip.close()
    },

    /**
     * @returns {AsyncIterable<IconData>}
     */
    async *icons() {
      const iconEntries = entries
        .filter(
          (e) =>
            // omit the icons directory itself
            e.filename.startsWith('icons/') && !e.filename.endsWith('icons/')
        )
        .sort()
      /** @type {IconData | undefined} */
      let icon
      for (const entry of iconEntries) {
        const buf = await buffer(await entry.openReadStream())
        const iconFilename = entry.filename.replace(/^icons\//, '')
        try {
          const { name, variant } = parseIcon(iconFilename, buf)
          if (!icon) {
            icon = {
              name,
              variants: [variant],
            }
          } else if (icon.name === name) {
            icon.variants.push(variant)
          } else {
            yield icon
            icon = {
              name,
              variants: [variant],
            }
          }
        } catch (err) {
          warnings.push(err)
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
        if (typeof field !== 'object' || field === null || !('key' in field)) {
          warnings.push(new Error(`Invalid field ${name}`))
          continue
        }
        /** @type {any} */
        const fieldValue = {
          schemaName: 'field',
          tagKey: field.key,
        }
        for (const key of Object.keys(valueSchemas.field.properties)) {
          if (key in field) {
            // @ts-ignore - we validate below
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
     * @returns {Iterable<{ fieldNames: string[], iconName: string | undefined, value: import('@mapeo/schema').PresetValue }>}
     */
    *presets() {
      const { presets } = presetsFile
      // sort presets using the sort field, turn them into an array
      const sortedPresets = Object.keys(presets)
        .map((presetName) => {
          /** @type {any} */
          const preset = presets[presetName]
          if (!preset.sort) {
            // if there's no sort field, put a big value - puts the field at the end -
            preset.sort = 100
          }
          return preset
        })
        .sort((preset, nextPreset) => nextPreset.sort - preset.sort)

      // 5. for each preset get the corresponding fieldId and iconId, add them to the db
      for (let preset of sortedPresets) {
        if (typeof preset !== 'object' || preset === null) {
          warnings.push(new Error(`Invalid preset ${preset.name}`))
          continue
        }
        /** @type {any} */
        const presetValue = {
          schemaName: 'preset',
          fieldIds: [],
          addTags: {},
          removeTags: {},
          terms: [],
        }
        for (const key of Object.keys(valueSchemas.preset.properties)) {
          if (key in preset) {
            // @ts-ignore - we validate below
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
        }
      }
    },
  }
}

/**
 * @param {string} filename
 * @param {Buffer} buf
 * @returns {{ name: string, variant: IconData['variants'][Number] }}}
 */
function parseIcon(filename, buf) {
  const matches = filename.match(
    /^([a-zA-Z0-9-]+)-([a-zA-Z0-9]+)@(\d+x)\.(png|jpg|jpeg)$/
  )
  if (!matches) {
    throw new Error(`Unexpected icon filename ${filename}`)
  }
  /* eslint-disable no-unused-vars */
  const [_, name, size, pixelDensity, extension] = matches
  const density = Number(pixelDensity.replace('x', ''))
  if (!(density === 1 || density === 2 || density === 3)) {
    throw new Error(`Error loading icon. invalid pixel density ${density}`)
  }
  if (!(size === 'small' || size === 'medium' || size === 'large')) {
    throw new Error(`Error loading icon. invalid size ${size}`)
  }
  if (!name) {
    throw new Error('Error loading icon. missing name')
  }
  return {
    name,
    variant: {
      size,
      mimeType: extension === 'png' ? 'image/png' : 'image/svg+xml',
      pixelDensity: density,
      blob: buf,
    },
  }
}

/**
 * @param {unknown} presetsFile
 * @returns {asserts presetsFile is PresetsFile}
 */
function validatePresetsFile(presetsFile) {
  if (
    typeof presetsFile !== 'object' ||
    presetsFile === null ||
    !('presets' in presetsFile) ||
    typeof presetsFile.presets !== 'object' ||
    !('fields' in presetsFile) ||
    typeof presetsFile.fields !== 'object'
  ) {
    throw new Error('Invalid presets.json file')
  }
}
