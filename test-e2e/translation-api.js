import { test } from 'brittle'
import { createManagers } from './utils.js'

test('', async (t) => {
  const [manager] = await createManagers(1, t, 'mobile')
  const project = await manager.getProject(await manager.createProject())
  await project.importConfig({
    configPath: 'tests/fixtures/config/completeConfig.zip',
  })
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
  let translationDocId
  try {
    translationDocId = await project.$translation.put(translationDoc)
    console.log(translationDocId)
  } catch (e) {
    console.log('e', e)
  }
  const d = await project.$translation.get({
    schemaNameRef: 'preset',
    docIdRef: projectPreset.docId,
    languageCode: 'en',
  })
  console.log('D', d)
})
