import { test } from 'brittle'
import {
  connectPeers,
  createManagers,
  disconnectPeers,
  waitForPeers,
} from './utils.js'

test('Local peers discovery each other and share device info', async (t) => {
  const mobileManagers = await createManagers(5, t, 'mobile')
  const desktopManagers = await createManagers(5, t, 'desktop')
  const managers = [...mobileManagers, ...desktopManagers]
  connectPeers(managers, { discovery: true })
  await waitForPeers(managers, { waitForDeviceInfo: true })
  const deviceInfos = [
    ...(await Promise.all(mobileManagers.map((m) => m.getDeviceInfo()))).map(
      (deviceInfo) => ({ ...deviceInfo, deviceType: 'mobile' })
    ),
    ...(await Promise.all(desktopManagers.map((m) => m.getDeviceInfo()))).map(
      (deviceInfo) => ({ ...deviceInfo, deviceType: 'desktop' })
    ),
  ]
  const mPeers = await Promise.all(managers.map((m) => m.listLocalPeers()))
  for (const [i, peers] of mPeers.entries()) {
    const expectedDeviceInfos = removeElementAt(deviceInfos, i)
    const actualDeviceInfos = peers.map((p) => ({
      name: p.name,
      deviceId: p.deviceId,
      deviceType: p.deviceType,
    }))
    t.alike(
      actualDeviceInfos.sort(sortByDeviceId),
      expectedDeviceInfos.sort(sortByDeviceId),
      `manager ${i} has correct peers`
    )
  }
  await disconnectPeers(managers)
})

/**
 * @param {any[]} array
 * @param {number} i
 */
function removeElementAt(array, i) {
  return array.slice(0, i).concat(array.slice(i + 1))
}

/**
 * @param {any} a
 * @param {any} b
 */
function sortByDeviceId(a, b) {
  if (a.deviceId < b.deviceId) return -1
  if (a.deviceId > b.deviceId) return 1
  return 0
}
