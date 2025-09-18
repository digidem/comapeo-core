import test from 'node:test'
import assert from 'node:assert/strict'
import { performance } from 'node:perf_hooks'
import { createManager } from './utils.js'
import { defaultConfigPath } from '../test/helpers/default-config.js'

test('indexer-worker - create project', async (t) => {
  const manager = createManager('device0', t, { useIndexWorkers: true })
  await manager.getProject(
    await manager.createProject({ configPath: defaultConfigPath })
  )
})

test.skip('indexer-worker - perf comparison for config imports', async (t) => {
  performance.mark('pre-nonworker')
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
  performance.mark('post-nonworker')
  performance.measure('nonworker', 'pre-nonworker', 'post-nonworker')

  performance.mark('pre-worker')
  const workerManager = createManager('device1', t)
  const workerProject = await manager.getProject(
    await workerManager.createProject({ configPath: defaultConfigPath })
  )
  const workerPresets = await workerProject.preset.getMany()
  const workerFields = await workerProject.field.getMany()
  const workerTranslations = await workerProject.$translation.dataType.getMany()
  assert.equal(workerPresets.length, 28, 'correct number of loaded presets')
  assert.equal(workerFields.length, 11, 'correct number of loaded fields')
  assert.equal(
    workerTranslations.length,
    870,
    'correct number of loaded translations'
  )
  performance.mark('post-worker')

  performance.measure('worker', 'pre-worker', 'post-worker')

  console.log(performance.getEntries())
})
