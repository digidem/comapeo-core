import { test } from 'brittle'
import { createManagers } from './utils.js'
import { defaultConfigPath } from '../tests/helpers/default-config.js'
import {
  fieldsTranslationMap,
  fieldTranslations,
  presetsTranslationMap,
  presetTranslations,
} from './fixtures/translations.js'
import { randomBytes } from 'node:crypto'

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
    const translationDocId = await project.$translation.put(translationDoc)
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
    const translationDocId = await project.$translation.put(translationDoc)
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
test('PERF TEST', { solo: true, timeout: 100_000 }, async (t) => {
  const [manager] = await createManagers(1, t, 'mobile')
  const randStr = (/** @type {string} */ prefix, /** @type {Number} */ n) =>
    `${prefix}_${randomBytes(n).toString('hex')}`
  const project = await manager.getProject(
    await manager.createProject({
      configPath: defaultConfigPath,
    })
  )
  const docIds = []
  for (let i = 0; i < 10; i++) {
    const code = randStr('', 2)
    var tagKey = randStr('tagKey', 5)
    const label = randStr('label', 5)
    const doc = await project.field.create({
      schemaName: 'field',
      tagKey,
      type: 'text',
      label,
    })
    docIds.push(doc.docId)

    await project.$translation.put({
      schemaName: 'translation',
      schemaNameRef: 'field',
      docIdRef: doc.docId,
      fieldRef: 'label',
      languageCode: code,
      regionCode: 'AR',
      message: 'a',
    })
  }
  for (let i = 0; i < 150_000; i++) {
    const docId = docIds[i % 10]
    await project.$translation.get({
      schemaNameRef: 'field',
      docIdRef: docId,
      languageCode: randStr('', 2),
    })
  }
})

/**
 * @template T
 * @param {undefined | T} value
 * @returns {value is T}
 */
function isDefined(value) {
  return value !== undefined
}
