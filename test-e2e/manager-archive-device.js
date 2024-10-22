import test from 'node:test'
import { KeyManager } from '@mapeo/crypto'
import RAM from 'random-access-memory'
import { MapeoManager } from '../src/mapeo-manager.js'
import Fastify from 'fastify'
import assert from 'node:assert/strict'
import { kIsArchiveDevice } from '../src/mapeo-project.js'
import { ManagerCustodian } from './utils.js'

const projectMigrationsFolder = new URL('../drizzle/project', import.meta.url)
  .pathname
const clientMigrationsFolder = new URL('../drizzle/client', import.meta.url)
  .pathname

test('Set & Get isArchiveDevice', async () => {
  const manager = new MapeoManager({
    rootKey: KeyManager.generateRootKey(),
    projectMigrationsFolder,
    clientMigrationsFolder,
    dbFolder: ':memory:',
    coreStorage: () => new RAM(),
    fastify: Fastify(),
  })

  // Ensure at least one project exists (tests internal setting on project)
  const projectId = await manager.createProject()
  const project = await manager.getProject(projectId)
  assert.strictEqual(
    project[kIsArchiveDevice],
    true,
    'Project isArchiveDevice is true initially'
  )

  assert.strictEqual(
    manager.getIsArchiveDevice(),
    true,
    'isArchiveDevice is true initially'
  )
  assert.throws(
    () => manager.setIsArchiveDevice(false),
    {
      message: /Must set device info/,
    },
    'Throws error if setting archive device without setting device info'
  )
  manager.setDeviceInfo({ name: 'Test Device', deviceType: 'desktop' })
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
      manager1.setDeviceInfo({ name: 'Test Device', deviceType: 'desktop' })
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
