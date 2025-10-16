import test from 'node:test'
import assert from 'node:assert/strict'
import { assertProjectHasImportedCategories, createManager } from './utils.js'
import { defaultConfigPath } from '../test/helpers/default-config.js'
import { Reader } from 'comapeocat'

test.skip('config import - load default config when passed a path to `createProject`', async () => {
  // This is tested in manager-basic.js
})

test('config import - load and re-load config manually', async (t) => {
  const manager = createManager('device0', t)
  const project = await manager.getProject(await manager.createProject())

  const reader = new Reader(defaultConfigPath)
  t.after(() => reader.close())

  await project.$importCategories({ filePath: defaultConfigPath })
  await assertProjectHasImportedCategories(project, reader)

  // re-load the config
  await project.$importCategories({ filePath: defaultConfigPath })
  await assertProjectHasImportedCategories(project, reader)
})

test.skip('deletion of data before loading a new config', async () => {
  // This is tested in manager-basic tests
})

test('failing on loading a second config should not delete any data', async (t) => {
  const manager = createManager('device0', t)
  const projectId = await manager.createProject()
  const project = await manager.getProject(projectId)

  const reader = new Reader(defaultConfigPath)
  t.after(() => reader.close())
  // load default config
  await project.$importCategories({ filePath: defaultConfigPath })
  await assertProjectHasImportedCategories(project, reader)

  await assert.rejects(() => project.$importCategories({ filePath: 'hi' }), {
    code: 'ENOENT',
  })

  // check we still have the original data
  await assertProjectHasImportedCategories(project, reader)
})

test('failing on loading multiple configs in parallel', async (t) => {
  const manager = createManager('device0', t)
  const project = await manager.getProject(await manager.createProject())
  const results = await Promise.allSettled([
    project.$importCategories({ filePath: defaultConfigPath }),
    project.$importCategories({ filePath: defaultConfigPath }),
  ])
  assert.equal(results[0]?.status, 'fulfilled', 'first import should work')
  assert.equal(results[1]?.status, 'rejected', 'second import should fail')
})

test('deprecated project.importConfig', async (t) => {
  const manager = createManager('device0', t)
  const project = await manager.getProject(await manager.createProject())

  const reader = new Reader(defaultConfigPath)
  t.after(() => reader.close())

  await project.importConfig({ configPath: defaultConfigPath })
  await assertProjectHasImportedCategories(project, reader)
})
