import test from 'node:test'
import assert from 'node:assert/strict'
import { createManagers, ManagerCustodian } from './utils.js'
import { defaultConfigPath } from '../tests/helpers/default-config.js'
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
      if (matchingTranslation)
        return { docIdRef: preset.docId, ...matchingTranslation }
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
      await project.preset.getByDocId(translationDoc.docIdRef)
    const expectedTranslations = await project.$translation.get({
      schemaNameRef: 'preset',
      languageCode: 'es',
      docIdRef: translationDoc.docIdRef,
    })

    assert.equal(
      presetDocId,
      expectedTranslations[0].docIdRef,
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
    assert.equal(
      (
        await project.$translation.get({
          docIdRef: translationDoc.docIdRef,
          schemaNameRef: 'preset',
          languageCode: 'es',
        })
      ).length,
      1,
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
      if (matchingTranslation)
        return { docIdRef: field.docId, ...matchingTranslation }
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
      await project.field.getByDocId(translationDoc.docIdRef)
    const expectedTranslations = await project.$translation.get({
      schemaNameRef: 'field',
      languageCode: 'es',
      docIdRef: translationDoc.docIdRef,
    })

    assert.equal(
      fieldDocId,
      expectedTranslations[0].docIdRef,
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
      if (matchingTranslation)
        return { docIdRef: field.docId, ...matchingTranslation }
    })
    .filter(isDefined)
  for (const translationDoc of fieldTranslationsDoc) {
    const { docIdRef, message, fieldRef } = await project.$translation.put(
      translationDoc
    )

    /** @type {Record<string, unknown>} */
    const translatedField = await project.field.getByDocId(docIdRef, {
      lang: 'es',
    })
    assert.equal(
      translatedField[fieldRef],
      message,
      `passing 'lang' returns the correct translated field`
    )

    /** @type {Record<string, unknown>} */
    const untranslatedField = await project.field.getByDocId(docIdRef)
    assert.notEqual(
      untranslatedField[fieldRef],
      message,
      `not passing 'lang' won't give a translated field`
    )

    /** @type {Record<string, unknown>} */
    const fallbackRegionCodeTranslatedField = await project.field.getByDocId(
      docIdRef,
      { lang: 'es-CO' }
    )
    assert.equal(
      fallbackRegionCodeTranslatedField[fieldRef],
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
      if (matchingTranslation)
        return { docIdRef: preset.docId, ...matchingTranslation }
    })
    .filter(isDefined)
  for (const translationDoc of presetTranslationsDoc) {
    const { docIdRef, message, fieldRef } = await project.$translation.put(
      translationDoc
    )

    /** @type {Record<string, unknown>} */
    const translatedPreset = await project.preset.getByDocId(docIdRef, {
      lang: 'es',
    })
    assert.equal(
      translatedPreset[fieldRef],
      message,
      `passing 'lang' returns the correct translated preset`
    )

    /** @type {Record<string, unknown>} */
    const untranslatedPreset = await project.preset.getByDocId(docIdRef)
    assert.notEqual(
      untranslatedPreset[fieldRef],
      message,
      `not passing 'lang' won't give a translated preset`
    )

    /** @type {Record<string, unknown>} */
    const fallbackRegionCodeTranslatedPreset = await project.preset.getByDocId(
      docIdRef,
      { lang: 'es-CO' }
    )
    assert.equal(
      fallbackRegionCodeTranslatedPreset[fieldRef],
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
            if (matchingTranslation)
              return { docIdRef: preset.docId, ...matchingTranslation }
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
            if (matchingTranslation)
              return { docIdRef: field.docId, ...matchingTranslation }
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

        for (const { docIdRef } of presetTranslationsDoc) {
          const translations = await project.$translation.get({
            docIdRef,
            schemaNameRef: 'preset',
            languageCode: 'es',
          })
          if (translations.length === 0) return false
        }

        for (const { docIdRef } of fieldTranslationsDoc) {
          const translations = await project.$translation.get({
            docIdRef,
            schemaNameRef: 'field',
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

/**
 * @template T
 * @param {undefined | T} value
 * @returns {value is T}
 */
function isDefined(value) {
  return value !== undefined
}
