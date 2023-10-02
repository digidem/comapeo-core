import { test } from 'brittle'
import { randomBytes } from 'crypto'
import { KeyManager } from '@mapeo/crypto'
import RAM from 'random-access-memory'

import { MapeoManager } from '../src/mapeo-manager.js'

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

test('device info written to projects', async (t) => {
  const manager = new MapeoManager({
    rootKey: KeyManager.generateRootKey(),
    dbFolder: ':memory:',
    coreStorage: () => new RAM(),
  })

  await manager.setDeviceInfo({ name: 'mapeo' })

  t.test('creating project', async (st) => {
    const projectId = await manager.createProject()
    const project = await manager.getProject(projectId)

    await project.ready()

    const members = await project.$member.getMany()

    st.is(members.length, 1)

    const member = members[0]

    st.is(member.deviceId, project.deviceId)
    st.is(member.name, (await manager.getDeviceInfo())?.name)
  })

  t.test('adding project', async (st) => {
    const projectId = await manager.addProject({
      projectKey: randomBytes(32),
      encryptionKeys: { auth: randomBytes(32) },
    })

    const project = await manager.getProject(projectId)

    await project.ready()

    const members = await project.$member.getMany()

    st.is(members.length, 1)

    const member = members[0]

    st.is(member.deviceId, project.deviceId)
    st.is(member.name, (await manager.getDeviceInfo())?.name)
  })

  // TODO: Test changing device info and checking device info per project afterwards
  // TODO: Test closing project, changing name, and getting project to see if device info for project is updated
})
