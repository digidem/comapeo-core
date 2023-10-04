import { test } from 'brittle'
import { KeyManager } from '@mapeo/crypto'
import { MapeoManager, kRPC } from '../src/mapeo-manager.js'
import RAM from 'random-access-memory'
import { replicate } from '../tests/helpers/rpc.js'

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

test('sending and receiving device info on initial connection', async (t) => {
  t.plan(4)

  const us = new MapeoManager({
    rootKey: KeyManager.generateRootKey(),
    dbFolder: ':memory:',
    coreStorage: () => new RAM(),
  })

  await us.setDeviceInfo({ name: 'us' })

  const them = new MapeoManager({
    rootKey: KeyManager.generateRootKey(),
    dbFolder: ':memory:',
    coreStorage: () => new RAM(),
  })

  await them.setDeviceInfo({ name: 'them' })

  us[kRPC].on('device-info', (deviceInfo) => {
    t.is(deviceInfo.deviceId, them.deviceId)
    t.is(deviceInfo.name, 'them')
  })

  them[kRPC].on('device-info', (deviceInfo) => {
    t.is(deviceInfo.deviceId, us.deviceId)
    t.is(deviceInfo.name, 'us')
  })

  replicate(us[kRPC], them[kRPC])
})
