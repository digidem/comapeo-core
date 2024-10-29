import test from 'node:test'
import { KeyManager } from '@mapeo/crypto'
import RAM from 'random-access-memory'
import { MapeoManager } from '../src/mapeo-manager.js'
import Fastify from 'fastify'
import assert from 'node:assert/strict'
import fsPromises from 'node:fs/promises'
import { temporaryDirectory } from 'tempy'
import { createOldManagerOnVersion2_0_1 } from './utils.js'

const projectMigrationsFolder = new URL('../drizzle/project', import.meta.url)
  .pathname
const clientMigrationsFolder = new URL('../drizzle/client', import.meta.url)
  .pathname

test('migration of localDeviceInfo table', async (t) => {
  const dbFolder = temporaryDirectory()
  const rootKey = KeyManager.generateRootKey()
  t.after(() => fsPromises.rm(dbFolder, { recursive: true }))

  const managerPreMigration = await createOldManagerOnVersion2_0_1('seed', {
    rootKey,
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
