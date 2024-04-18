import { test } from 'brittle'
import { createManagers } from './utils.js'
import { defaultConfigPath } from '../tests/helpers/default-config.js'
import { translationMap, presetTranslations } from './fixtures/translations.js'
test('translation api - put() and get()', async (t) => {
  const [manager] = await createManagers(1, t, 'mobile')
  const project = await manager.getProject(
    await manager.createProject({
      configPath: defaultConfigPath,
    })
  )
  const presets = await project.preset.getMany()
  const translationsDoc = presets.map((preset) => {
    const matchingTranslation = presetTranslations.find((translation) => {
      return translation.message === translationMap[preset.name]
    })
    if (matchingTranslation)
      return { docIdRef: preset.docId, ...matchingTranslation }
  })

  for (const translationDoc of translationsDoc) {
    if (translationDoc !== undefined) {
      const translationDocId = await project.$translation.put(translationDoc)
      const presetName = (
        await project.preset.getByDocId(translationDoc.docIdRef)
      ).name
      const translations = await project.$translation.get({
        schemaNameRef: 'preset',
        languageCode: 'es',
        docIdRef: translationDoc.docIdRef,
      })

      t.is(
        translationMap[presetName],
        translations[0].message,
        `the translated message matches what is expected`
      )

      t.is(
        translations.length,
        1,
        `we should only have one translated document`
      )
      t.is(
        translations[0].docId,
        translationDocId,
        `the docId of added translation for ${translations[0].message} matches`
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
  }
})
