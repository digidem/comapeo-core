import test from 'node:test'
import assert from 'node:assert/strict'
import { kIsArchiveDevice } from '../src/mapeo-project.js'
import { createManager, ManagerCustodian } from './utils.js'

test('Set & Get isArchiveDevice', async (t) => {
  const manager = createManager('seed', t)
  assert.strictEqual(
    manager.getIsArchiveDevice(),
    true,
    'isArchiveDevice is true initially'
  )

  // Ensure at least one project exists (tests internal setting on project)
  const projectId = await manager.createProject()
  const project = await manager.getProject(projectId)
  assert.strictEqual(
    project[kIsArchiveDevice],
    true,
    'Project isArchiveDevice is true initially'
  )

  manager.setIsArchiveDevice(false)
  assert.strictEqual(
    manager.getIsArchiveDevice(),
    false,
    'isArchiveDevice is false after setting'
  )
  assert.equal(
    project[kIsArchiveDevice],
    false,
    'Project isArchiveDevice is false'
  )

  const project2Id = await manager.createProject()
  const project2 = await manager.getProject(project2Id)
  assert.strictEqual(
    project2[kIsArchiveDevice],
    false,
    'New project isArchiveDevice inherits existing setting'
  )
})

test('isArchiveDevice persists', async (t) => {
  const custodian = new ManagerCustodian(t)

  const isArchiveDevice1 = await custodian.withManagerInSeparateProcess(
    async (manager1) => {
      manager1.setIsArchiveDevice(false)
      return manager1.getIsArchiveDevice()
    }
  )

  const isArchiveDevice2 = await custodian.withManagerInSeparateProcess(
    async (manager2) => {
      return manager2.getIsArchiveDevice()
    }
  )

  assert.equal(isArchiveDevice1, false)
  assert.equal(isArchiveDevice2, isArchiveDevice1)
})
