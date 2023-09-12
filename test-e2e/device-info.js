import { test } from 'brittle'
import { KeyManager } from '@mapeo/crypto'
import { MapeoManager } from '../src/mapeo-manager.js'
import RAM from 'random-access-memory'

test('write and read deviceInfo', async (t) => {
  const rootKey = KeyManager.generateRootKey()
  const manager = new MapeoManager({
    rootKey,
    dbFolder: ':memory:',
    coreStorage: () => new RAM(),
  })
  const info1 = { name: 'my device' }
  await manager.setDeviceInfo(info1)
  const readInfo1 = await manager.getDeviceInfo()
  t.alike(readInfo1, info1)
  const info2 = { name: 'new name' }
  await manager.setDeviceInfo(info2)
  const readInfo2 = await manager.getDeviceInfo()
  t.alike(readInfo2, info2)
})
