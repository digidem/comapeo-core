import test from 'node:test'
import { KeyManager } from '@mapeo/crypto'
import { MapeoManager as MapeoManagerPreMigration } from '@comapeo/core2.0.1'
import RAM from 'random-access-memory'
import { MapeoManager } from '../src/mapeo-manager.js'
import Fastify from 'fastify'
import assert from 'node:assert/strict'
import { fileURLToPath } from 'node:url'
import fsPromises from 'node:fs/promises'
import { temporaryDirectory } from 'tempy'

const projectMigrationsFolder = new URL('../drizzle/project', import.meta.url)
  .pathname
const clientMigrationsFolder = new URL('../drizzle/client', import.meta.url)
  .pathname

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
  t.after(() => fsPromises.rm(dbFolder, { recursive: true }))

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
