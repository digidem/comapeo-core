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

test('indexer-worker - perf comparison for config imports', async (t) => {
  performance.mark('pre-nonworker', { detail: performance.nodeTiming })
  const manager = createManager('device1', t)
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
  performance.mark('post-nonworker', { detail: performance.nodeTiming })

  performance.mark('pre-worker', { detail: performance.nodeTiming })
  const workerManager = createManager('device2', t, { useIndexWorkers: true })
  const workerProject = await workerManager.getProject(
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
  performance.mark('post-worker', { detail: performance.nodeTiming })

  const nonworkerDiff = calcDiff(
    /** @type Mark */ (performance.getEntriesByName('pre-nonworker')[0]),
    /** @type Mark */ (performance.getEntriesByName('post-nonworker')[0])
  )

  const workerDiff = calcDiff(
    /** @type Mark */ (performance.getEntriesByName('pre-worker')[0]),
    /** @type Mark */ (performance.getEntriesByName('post-worker')[0])
  )

  assert(
    nonworkerDiff.idleTime < workerDiff.idleTime,
    'Worker idles main thread more'
  )
  // TODO: Should add this back when we upgrade from node 18
  // assert(nonworkerDiff.duration > workerDiff.duration, 'Worker is faster')
})

/**
 * @typedef {Object} MarkDetail
 * @property {number} idleTime
 */

/**
 * @typedef {Object} Mark
 * @property {number} startTime
 * @property {MarkDetail} detail
 */

/**
 * @typedef {Object} Diff
 * @property {number} duration
 * @property {number} idleTime
 */

/**
 * @param {Mark} mark1
 * @param {Mark} mark2
 * @returns {Diff}
 */
function calcDiff(mark1, mark2) {
  const idleTime = mark2.detail.idleTime - mark1.detail.idleTime
  const duration = mark2.startTime - mark1.startTime

  return { idleTime, duration }
}
