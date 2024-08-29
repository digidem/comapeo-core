import test from 'node:test'
import assert from 'node:assert/strict'
import { createManager } from './utils.js'
import { defaultConfigPath } from '../tests/helpers/default-config.js'

test(' config import - load default config when passed a path to `createProject`', async (t) => {
  const manager = createManager('device0', t)
  const project = await manager.getProject(
    await manager.createProject({ configPath: defaultConfigPath })
  )
  const presets = await project.preset.getMany()
  const fields = await project.field.getMany()
  const translations = await project.$translation.dataType.getMany()
  assert.equal(presets.length, 28, 'correct number of loaded presets')
  assert.equal(fields.length, 11, 'correct number of loaded fields')
  assert.equal(
    translations.length,
    870,
    'correct number of loaded translations'
  )
})

test('config import - load and re-load config manually', async (t) => {
  const manager = createManager('device0', t)
  const project = await manager.getProject(await manager.createProject())

  const warnings = await project.importConfig({ configPath: defaultConfigPath })
  let presets = await project.preset.getMany()
  let fields = await project.field.getMany()
  let translations = await project.$translation.dataType.getMany()

  assert.equal(
    warnings.length,
    0,
    'no warnings when manually loading default config'
  )
  assert.equal(presets.length, 28, 'correct number of manually loaded presets')
  assert.equal(fields.length, 11, 'correct number of manually loaded fields')
  assert.equal(
    translations.length,
    870,
    'correct number of manually loaded translations'
  )

  // re load the config
  await project.importConfig({ configPath: defaultConfigPath })
  presets = await project.preset.getMany()
  fields = await project.field.getMany()
  translations = await project.$translation.dataType.getMany()
  assert.equal(
    presets.length,
    28,
    're-loading the same config leads to the same number of presets (since they are deleted)'
  )
  assert.equal(
    fields.length,
    11,
    're-loading the same config leads to the same number of fields (since they are deleted)'
  )
  assert.equal(
    translations.length,
    870,
    're-loading the same config leads to the same number of translations (since they are deleted)'
  )
})

test('deletion of data before loading a new config', async (t) => {
  const manager = createManager('device0', t)
  const project = await manager.getProject(await manager.createProject())

  // load default config
  await project.importConfig({
    configPath: defaultConfigPath,
  })
  const nPresets = (await project.preset.getMany()).length
  const nFields = (await project.field.getMany()).length
  const nTranslations = (await project.$translation.dataType.getMany()).length

  // load another config
  await project.importConfig({
    configPath: './tests/fixtures/config/validConfig.zip',
  })

  // load default config again
  await project.importConfig({
    configPath: defaultConfigPath,
  })

  assert.equal(
    (await project.preset.getMany()).length,
    nPresets,
    'after loading config 1, then 2, then 1 again, number of presets should be equal'
  )
  assert.equal(
    (await project.field.getMany()).length,
    nFields,
    'after loading config 1, then 2, then 1 again, number of fields should be equal'
  )
  assert.equal(
    (await project.$translation.dataType.getMany()).length,
    nTranslations,
    'after loading config 1, then 2, then 1 again, number of translations should be equal'
  )
})

test('failing on loading a second config should not delete any data', async (t) => {
  const manager = createManager('device0', t)
  const projectId = await manager.createProject()
  const project = await manager.getProject(projectId)
  // load default config
  await project.importConfig({ configPath: defaultConfigPath })

  const nPresets = (await project.preset.getMany()).length
  const nFields = (await project.field.getMany()).length
  const nTranslations = (await project.$translation.dataType.getMany()).length

  // load a non-existent config
  await project.importConfig({ configPath: 'hi' })

  const nPresetsAfter = (await project.preset.getMany()).length
  const nFieldsAfter = (await project.field.getMany()).length
  const nTranslationsAfter = (await project.$translation.dataType.getMany())
    .length

  assert.equal(
    nPresetsAfter,
    nPresets,
    'after failing to load a config, we should not delete any older presets'
  )

  assert.equal(
    nFieldsAfter,
    nFields,
    'after failing to load a config, we should not delete any older fields'
  )

  assert.equal(
    nTranslationsAfter,
    nTranslations,
    'after failing to load a config, we should not delete any older translations'
  )
})

test('failing on loading multiple configs in parallel', async (t) => {
  const manager = createManager('device0', t)
  const project = await manager.getProject(await manager.createProject())
  const results = await Promise.allSettled([
    project.importConfig({ configPath: defaultConfigPath }),
    project.importConfig({ configPath: defaultConfigPath }),
  ])
  assert.equal(results[0]?.status, 'fulfilled', 'first import should work')
  assert.equal(results[1]?.status, 'rejected', 'second import should fail')
})
