import test from 'node:test'
import assert from 'node:assert/strict'
import { isDefined } from '../src/utils.js'
import { createManagers, ManagerCustodian } from './utils.js'
import { defaultConfigPath } from '../test/helpers/default-config.js'
import {
  fieldsTranslationMap,
  fieldTranslations,
  presetsTranslationMap,
  presetTranslations,
} from './fixtures/translations.js'

test('translation api - put() and get() presets', async (t) => {
  const [manager] = await createManagers(1, t, 'mobile')
  const project = await manager.getProject(
    await manager.createProject({
      configPath: defaultConfigPath,
    })
  )

  const presets = await project.preset.getMany()
  const presetTranslationsDoc = presets
    .map((preset) => {
      const matchingTranslation = presetTranslations.find((translation) => {
        return translation.message === presetsTranslationMap[preset.name]
      })
      if (matchingTranslation) {
        return {
          docRef: { docId: preset.docId, versionId: preset.versionId },
          ...matchingTranslation,
        }
      }
    })
    .filter(isDefined)

  assert(
    presetTranslationsDoc.length > 0,
    'at least one preset translation doc exists'
  )

  for (const translationDoc of presetTranslationsDoc) {
    const { docId: translationDocId } = await project.$translation.put(
      translationDoc
    )
    const { name: presetName, docId: presetDocId } =
      await project.preset.getByDocId(translationDoc.docRef.docId)
    const expectedTranslations = await project.$translation.get({
      docRefType: 'preset',
      languageCode: 'es',
      regionCode: 'AR',
      docRef: translationDoc.docRef,
      propertyRef: translationDoc.propertyRef,
    })

    assert.equal(
      presetDocId,
      expectedTranslations[0].docRef.docId,
      `the preset docId matches the translation docIdRef`
    )

    assert.equal(
      presetsTranslationMap[presetName],
      expectedTranslations[0].message,
      `the translated message matches what is expected ${presetName} -> ${expectedTranslations[0].message}`
    )

    assert.equal(
      expectedTranslations.length,
      1,
      `we should only have one translated document`
    )
    assert.equal(
      expectedTranslations[0].docId,
      translationDocId,
      `the docId of added translation for ${expectedTranslations[0].message} matches`
    )

    assert.notEqual(
      (
        await project.$translation.get({
          docRef: translationDoc.docRef,
          docRefType: 'preset',
          languageCode: 'es',
        })
      ).length,
      0,
      `not passing region code returns matching translations`
    )
  }
})

test('translation api - put() and get() fields', async (t) => {
  const [manager] = await createManagers(1, t, 'mobile')
  const project = await manager.getProject(
    await manager.createProject({
      configPath: defaultConfigPath,
    })
  )

  const fields = await project.field.getMany()
  const fieldTranslationsDoc = fields
    .map((field) => {
      const matchingTranslation = fieldTranslations.find((translation) => {
        return translation.message === fieldsTranslationMap[field.label]
      })
      if (matchingTranslation) {
        return {
          docRef: { docId: field.docId, versionId: field.versionId },
          ...matchingTranslation,
        }
      }
    })
    .filter(isDefined)

  assert(
    fieldTranslationsDoc.length > 0,
    'at least one field translation doc exists'
  )

  for (const translationDoc of fieldTranslationsDoc) {
    const { docId: translationDocId } = await project.$translation.put(
      translationDoc
    )
    const { label: fieldLabel, docId: fieldDocId } =
      await project.field.getByDocId(translationDoc.docRef.docId)
    const expectedTranslations = await project.$translation.get({
      docRefType: 'field',
      languageCode: 'es',
      propertyRef: translationDoc.propertyRef,
      regionCode: 'AR',
      docRef: translationDoc.docRef,
    })

    assert.equal(
      fieldDocId,
      expectedTranslations[0].docRef.docId,
      `the field docId matches the translation docIdRef`
    )

    assert.equal(
      fieldsTranslationMap[fieldLabel],
      expectedTranslations[0].message,
      `the translated message matches what is expected ${fieldLabel} -> ${expectedTranslations[0].message}`
    )

    assert.equal(
      expectedTranslations.length,
      1,
      `we should only have one translated document`
    )

    assert.equal(
      expectedTranslations[0].docId,
      translationDocId,
      `the docId of added translation for ${expectedTranslations[0].message} matches`
    )
  }
})

test('translation api - passing `lang` to dataType', async (t) => {
  const [manager] = await createManagers(1, t, 'mobile')
  const project = await manager.getProject(
    await manager.createProject({
      configPath: defaultConfigPath,
    })
  )

  // fields
  const fields = await project.field.getMany()
  const fieldTranslationsDoc = fields
    .map((field) => {
      const matchingTranslation = fieldTranslations.find((translation) => {
        return translation.message === fieldsTranslationMap[field.label]
      })
      if (matchingTranslation) {
        return {
          docRef: { docId: field.docId, versionId: field.versionId },
          ...matchingTranslation,
        }
      }
    })
    .filter(isDefined)
  for (const translationDoc of fieldTranslationsDoc) {
    const { docRef, message, propertyRef } = await project.$translation.put(
      translationDoc
    )

    /** @type {Record<string, unknown>} */
    const translatedField = await project.field.getByDocId(docRef.docId, {
      lang: 'es',
    })
    assert.equal(
      translatedField[propertyRef],
      message,
      `passing 'lang' returns the correct translated field`
    )

    /** @type {Record<string, unknown>} */
    const untranslatedField = await project.field.getByDocId(docRef.docId)
    assert.notEqual(
      untranslatedField[propertyRef],
      message,
      `not passing 'lang' won't give a translated field`
    )

    /** @type {Record<string, unknown>} */
    const fallbackRegionCodeTranslatedField = await project.field.getByDocId(
      docRef.docId,
      { lang: 'es-CO' }
    )
    assert.equal(
      fallbackRegionCodeTranslatedField[propertyRef],
      message,
      `passing 'lang' with untranslated 'regionCode' returns a fallback translated field matching 'languageCode'`
    )
  }

  // presets
  const presets = await project.preset.getMany()
  const presetTranslationsDoc = presets
    .map((preset) => {
      const matchingTranslation = presetTranslations.find((translation) => {
        return translation.message === presetsTranslationMap[preset.name]
      })
      if (matchingTranslation) {
        return {
          docRef: { docId: preset.docId, versionId: preset.versionId },
          ...matchingTranslation,
        }
      }
    })
    .filter(isDefined)
  for (const translationDoc of presetTranslationsDoc) {
    const { docRef, message, propertyRef } = await project.$translation.put(
      translationDoc
    )

    /** @type {Record<string, unknown>} */
    const translatedPreset = await project.preset.getByDocId(docRef.docId, {
      lang: 'es',
    })
    assert.equal(
      translatedPreset[propertyRef],
      message,
      `passing 'lang' returns the correct translated preset`
    )

    /** @type {Record<string, unknown>} */
    const untranslatedPreset = await project.preset.getByDocId(docRef.docId)
    assert.notEqual(
      untranslatedPreset[propertyRef],
      message,
      `not passing 'lang' won't give a translated preset`
    )

    /** @type {Record<string, unknown>} */
    const fallbackRegionCodeTranslatedPreset = await project.preset.getByDocId(
      docRef.docId,
      { lang: 'es-CO' }
    )
    assert.equal(
      fallbackRegionCodeTranslatedPreset[propertyRef],
      message,
      `passing 'lang' with untranslated 'regionCode' returns a fallback translated preset matching 'languageCode'`
    )
  }
})

test('translation api - re-loading from disk', async (t) => {
  const custodian = new ManagerCustodian(t)
  const deps = {
    defaultConfigPath,
    presetsTranslationMap,
    presetTranslations,
    fieldsTranslationMap,
    fieldTranslations,
  }
  const { projectId, presetTranslationsDoc, fieldTranslationsDoc } =
    await custodian.withManagerInSeparateProcess(
      async (
        manager1,
        {
          defaultConfigPath,
          presetsTranslationMap,
          presetTranslations,
          fieldsTranslationMap,
          fieldTranslations,
        }
      ) => {
        const projectId = await manager1.createProject({
          configPath: defaultConfigPath,
        })

        /**
         * @template T
         * @param {undefined | T} value
         * @returns {value is T}
         */
        function isDefined(value) {
          return value !== undefined
        }

        const project = await manager1.getProject(projectId)

        // translate presets
        const presets = await project.preset.getMany()
        const presetTranslationsDoc = presets
          .map((preset) => {
            const matchingTranslation = presetTranslations.find(
              (translation) => {
                return (
                  translation.message === presetsTranslationMap[preset.name]
                )
              }
            )
            if (matchingTranslation) {
              return {
                docRef: { docId: preset.docId, versionId: preset.versionId },
                ...matchingTranslation,
              }
            }
          })
          .filter(isDefined)
        for (const translationDoc of presetTranslationsDoc) {
          await project.$translation.put(translationDoc)
        }

        // translate fields
        const fields = await project.field.getMany()
        const fieldTranslationsDoc = fields
          .map((field) => {
            const matchingTranslation = fieldTranslations.find(
              (translation) => {
                return translation.message === fieldsTranslationMap[field.label]
              }
            )
            if (matchingTranslation) {
              return {
                docRef: { docId: field.docId, versionId: field.versionId },
                ...matchingTranslation,
              }
            }
          })
          .filter(isDefined)
        for (const translationDoc of fieldTranslationsDoc) {
          await project.$translation.put(translationDoc)
        }

        return { projectId, presetTranslationsDoc, fieldTranslationsDoc }
      },
      deps
    )

  const hasExpectedNumberOfTranslations =
    await custodian.withManagerInSeparateProcess(
      async (
        manager2,
        { projectId, presetTranslationsDoc, fieldTranslationsDoc }
      ) => {
        const project = await manager2.getProject(projectId)

        for (const { docRef } of presetTranslationsDoc) {
          const translations = await project.$translation.get({
            docRef,
            docRefType: 'preset',
            languageCode: 'es',
          })
          if (translations.length === 0) return false
        }

        for (const { docRef } of fieldTranslationsDoc) {
          const translations = await project.$translation.get({
            docRef,
            docRefType: 'field',
            languageCode: 'es',
          })
          if (translations.length === 0) return false
        }

        return true
      },
      {
        projectId,
        presetTranslationsDoc,
        fieldTranslationsDoc,
      }
    )

  assert(hasExpectedNumberOfTranslations)
})

test('translation api - backwards compat with ISO 639-1 translations', async (t) => {
  const [manager] = await createManagers(1, t, 'mobile')
  const project = await manager.getProject(await manager.createProject())

  // Create a preset fixture to translate
  const preset = await project.preset.create({
    schemaName: 'preset',
    name: 'Test Preset',
    geometry: ['point'],
    tags: {},
    addTags: {},
    removeTags: {},
    terms: [],
    fieldRefs: [],
  })

  // Put a translation with a two-letter language code (ISO 639-1)
  const translationDoc = {
    schemaName: /** @type {const} */ ('translation'),
    docRefType: /** @type {const} */ ('preset'),
    languageCode: 'fr', // Two-letter ISO 639-1 code
    propertyRef: 'name',
    message: 'Nom traduit en français',
    docRef: { docId: preset.docId, versionId: preset.versionId },
  }

  await project.$translation.put(translationDoc)

  // Get with three-letter language code (ISO 639-3)
  const translations = await project.$translation.get({
    docRefType: 'preset',
    languageCode: 'fra', // Three-letter ISO 639-3 code
    propertyRef: 'name',
    docRef: { docId: preset.docId },
  })

  assert.equal(
    translations.length,
    1,
    'should retrieve translation when querying with ISO 639-3 code'
  )
  assert.equal(
    translations[0].message,
    'Nom traduit en français',
    'translation message should match'
  )
  const untranslatedPreset = await project.preset.getByDocId(preset.docId)
  assert.equal(
    untranslatedPreset.name,
    'Test Preset',
    'preset name without lang should be original'
  )
  const translatedPreset = await project.preset.getByDocId(preset.docId, {
    lang: 'fra',
  })
  assert.equal(
    translatedPreset.name,
    'Nom traduit en français',
    'preset name with lang should be translated'
  )
})

test('translation api - backwards compat lower-case region code', async (t) => {
  const [manager] = await createManagers(1, t, 'mobile')
  const project = await manager.getProject(await manager.createProject())

  // Create a preset fixture to translate
  const preset = await project.preset.create({
    schemaName: 'preset',
    name: 'Test Preset',
    geometry: ['point'],
    tags: {},
    addTags: {},
    removeTags: {},
    terms: [],
    fieldRefs: [],
  })

  // Add a non-region-specific French translation to ensure we don't get the fallback
  await project.$translation.put({
    schemaName: /** @type {const} */ ('translation'),
    docRefType: /** @type {const} */ ('preset'),
    languageCode: 'fra',
    propertyRef: 'name',
    message: 'Nom traduit en français',
    docRef: { docId: preset.docId, versionId: preset.versionId },
  })

  // Put a region-specific translation with a lower-case region code
  await project.$translation.put({
    schemaName: /** @type {const} */ ('translation'),
    docRefType: /** @type {const} */ ('preset'),
    languageCode: 'fra',
    regionCode: 'gf', // Lower-case ISO 3166-1 alpha-2 code
    propertyRef: 'name',
    message: 'Nom traduit en français de Guyane',
    docRef: { docId: preset.docId, versionId: preset.versionId },
  })

  // Get translated preset with a language tag (fr-GF - French Guiana)
  /** @type {Record<string, unknown>} */
  const translatedPreset = await project.preset.getByDocId(preset.docId, {
    lang: 'fr-GF',
  })

  assert.equal(
    translatedPreset.name,
    'Nom traduit en français de Guyane',
    'preset should be translated when requesting with language tag'
  )
})

test('translation api - region-specific vs language-only translation priority', async (t) => {
  const [manager] = await createManagers(1, t, 'mobile')
  const project = await manager.getProject(await manager.createProject())

  // Create a preset fixture to translate
  const preset = await project.preset.create({
    schemaName: 'preset',
    name: 'Test Preset',
    geometry: ['point'],
    tags: {},
    addTags: {},
    removeTags: {},
    terms: [],
    fieldRefs: [],
  })

  // Put a translation with language code only (no region)
  const translationDocWithoutRegion = {
    schemaName: /** @type {const} */ ('translation'),
    docRefType: /** @type {const} */ ('preset'),
    languageCode: 'por', // Three-letter ISO 639-3 code for Portuguese
    propertyRef: 'name',
    message: 'Nome em português geral',
    docRef: { docId: preset.docId, versionId: preset.versionId },
  }

  await project.$translation.put(translationDocWithoutRegion)

  // Put a translation with language code and region code
  const translationDocWithRegion = {
    schemaName: /** @type {const} */ ('translation'),
    docRefType: /** @type {const} */ ('preset'),
    languageCode: 'por', // Three-letter ISO 639-3 code for Portuguese
    regionCode: 'PT', // ISO 3166-1 alpha-2 code for Portugal
    propertyRef: 'name',
    message: 'Nome em português de Portugal',
    docRef: { docId: preset.docId, versionId: preset.versionId },
  }

  await project.$translation.put(translationDocWithRegion)

  // Get translated preset with matching region code (pt-PT)
  /** @type {Record<string, unknown>} */
  const translatedPresetPT = await project.preset.getByDocId(preset.docId, {
    lang: 'pt-PT',
  })

  assert.equal(
    translatedPresetPT.name,
    'Nome em português de Portugal',
    'preset should return region-specific translation when region matches'
  )

  // Get translated preset with language only (pt)
  /** @type {Record<string, unknown>} */
  const translatedPresetLanguageOnly = await project.preset.getByDocId(
    preset.docId,
    { lang: 'pt' }
  )

  assert.equal(
    translatedPresetLanguageOnly.name,
    'Nome em português geral',
    'preset should return language-only translation when no region is specified'
  )

  // Get translated preset with non-matching region code (pt-BR)
  /** @type {Record<string, unknown>} */
  const translatedPresetBR = await project.preset.getByDocId(preset.docId, {
    lang: 'pt-BR',
  })

  assert.equal(
    translatedPresetBR.name,
    'Nome em português geral',
    'preset should fall back to language-only translation when region does not match'
  )
})
