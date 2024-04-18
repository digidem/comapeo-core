import { test } from 'brittle'
import { createManagers } from './utils.js'

test('translation api - put() and get()', async (t) => {
  const [manager] = await createManagers(1, t, 'mobile')
  const project = await manager.getProject(
    await manager.createProject({
      configPath: 'tests/fixtures/config/completeConfig.zip',
    })
  )
  const [projectPreset] = await project.preset.getMany()

  /**
   *
   * @type {import('@mapeo/schema').TranslationValue} value
   */
  const translationDoc = {
    schemaName: 'translation',
    schemaNameRef: 'preset',
    docIdRef: projectPreset.docId,
    fieldRef: 'name',
    languageCode: 'en',
    regionCode: 'US',
    message: 'Point of Entry',
  }
  const translationDocId = await project.$translation.put(translationDoc)
  const translations = await project.$translation.get({
    schemaNameRef: 'preset',
    docIdRef: projectPreset.docId,
    languageCode: 'en',
    regionCode: 'UK',
  })

  t.is(translations.length, 1, `we should only have one translated document`)
  t.is(
    translations[0].docId,
    translationDocId,
    `the docId of added translation matches`
  )
  t.is(
    translations[0].docIdRef,
    projectPreset.docId,
    `the docId of the preset we're translating matches`
  )
})
