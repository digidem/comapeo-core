import test from 'node:test'
import { KeyManager } from '@mapeo/crypto'
import { MapeoManager as MapeoManagerPreMigration } from '@comapeo/core2.0.1'
import RAM from 'random-access-memory'
import { MapeoManager } from '../src/mapeo-manager.js'
import Fastify from 'fastify'
import assert from 'node:assert/strict'
import { kIsArchiveDevice } from '../src/mapeo-project.js'
import { ManagerCustodian } from './utils.js'
import { fileURLToPath } from 'node:url'
import fs from 'node:fs'
import { temporaryDirectory } from 'tempy'

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

test('migration of localDeviceInfo table', async (t) => {
  const comapeoCorePreMigrationUrl = await import.meta.resolve?.(
    '@comapeo/core2.0.1'
  )
  assert(comapeoCorePreMigrationUrl, 'Could not resolve @comapeo/core2.0.1')
  const clientMigrationsFolderPreMigration = fileURLToPath(
    new URL('../drizzle/client', comapeoCorePreMigrationUrl)
  )
  const projectMigrationsFolderPreMigration = fileURLToPath(
    new URL('../drizzle/project', comapeoCorePreMigrationUrl)
  )

  const dbFolder = temporaryDirectory()
  const rootKey = KeyManager.generateRootKey()
  t.after(() => fs.rm(dbFolder, { recursive: true }))

  const managerPreMigration = new MapeoManagerPreMigration({
    rootKey,
    projectMigrationsFolder: projectMigrationsFolderPreMigration,
    clientMigrationsFolder: clientMigrationsFolderPreMigration,
    dbFolder,
    coreStorage: () => new RAM(),
    fastify: Fastify(),
  })
  const deviceInfo = /** @type {const} */ ({
    name: 'Test Device',
    deviceType: 'desktop',
  })
  const expectedDeviceInfo = {
    ...deviceInfo,
    deviceId: managerPreMigration.deviceId,
  }
  await managerPreMigration.setDeviceInfo(deviceInfo)
  assert.deepEqual(
    await managerPreMigration.getDeviceInfo(),
    expectedDeviceInfo
  )

  // No manager.close() function yet, but should be ok

  const manager = new MapeoManager({
    rootKey,
    projectMigrationsFolder,
    clientMigrationsFolder,
    dbFolder,
    coreStorage: () => new RAM(),
    fastify: Fastify(),
  })

  assert.deepEqual(
    await manager.getDeviceInfo(),
    expectedDeviceInfo,
    'deviceInfo is migrated'
  )
})
