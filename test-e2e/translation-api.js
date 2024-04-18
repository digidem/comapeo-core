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
        translationMap[presetName],
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
  }
})
