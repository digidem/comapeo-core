import { test } from 'brittle'
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

  t.ok(
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

    t.is(
      presetDocId,
      expectedTranslations[0].docIdRef,
      `the preset docId matches the translation docIdRef`
    )

    t.is(
      presetsTranslationMap[presetName],
      expectedTranslations[0].message,
      `the translated message matches what is expected ${presetName} -> ${expectedTranslations[0].message}`
    )

    t.is(
      expectedTranslations.length,
      1,
      `we should only have one translated document`
    )
    t.is(
      expectedTranslations[0].docId,
      translationDocId,
      `the docId of added translation for ${expectedTranslations[0].message} matches`
    )
    t.is(
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

  t.ok(
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

    t.is(
      fieldDocId,
      expectedTranslations[0].docIdRef,
      `the field docId matches the translation docIdRef`
    )

    t.is(
      fieldsTranslationMap[fieldLabel],
      expectedTranslations[0].message,
      `the translated message matches what is expected ${fieldLabel} -> ${expectedTranslations[0].message}`
    )

    t.is(
      expectedTranslations.length,
      1,
      `we should only have one translated document`
    )

    t.is(
      expectedTranslations[0].docId,
      translationDocId,
      `the docId of added translation for ${expectedTranslations[0].message} matches`
    )
  }
})

test('translation api - Cache', async (t) => {
  const custodian = new ManagerCustodian(t)
  const deps = {
    defaultConfigPath,
    presetsTranslationMap,
    presetTranslations,
    fieldsTranslationMap,
    fieldTranslations,
  }
  const projectId = await custodian.withManagerInSeparateProcess(
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
          const matchingTranslation = presetTranslations.find((translation) => {
            return translation.message === presetsTranslationMap[preset.name]
          })
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
          const matchingTranslation = fieldTranslations.find((translation) => {
            return translation.message === fieldsTranslationMap[field.label]
          })
          if (matchingTranslation)
            return { docIdRef: field.docId, ...matchingTranslation }
        })
        .filter(isDefined)
      for (const translationDoc of fieldTranslationsDoc) {
        await project.$translation.put(translationDoc)
      }
      return projectId
    },
    deps
  )

  const cache = await custodian.withManagerInSeparateProcess(
    async (manager2, projectId) => {
      const project = await manager2.getProject(projectId)
      await new Promise((r) => setTimeout(r, 500))
      return project.$translation.cache
    },
    projectId
  )
  t.is(
    cache.size,
    1,
    'the cache is populated after restarting, and its size is correct'
  )
  t.is([...cache.keys()][0], 'es', `the only language code translated is 'es'`)
  t.is(cache.get('es')?.size, 2, 'only two record types translated')
})

/**
 * @template T
 * @param {undefined | T} value
 * @returns {value is T}
 */
function isDefined(value) {
  return value !== undefined
}
