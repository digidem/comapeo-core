// @ts-check
import { test } from 'brittle'
import { randomBytes } from 'crypto'
import { KeyManager } from '@mapeo/crypto'
import RAM from 'random-access-memory'
import Fastify from 'fastify'
import { pEvent } from 'p-event'
import { connectPeers, createManagers, waitForPeers } from './utils.js'

import { MapeoManager } from '../src/mapeo-manager.js'

const projectMigrationsFolder = new URL('../drizzle/project', import.meta.url)
  .pathname
const clientMigrationsFolder = new URL('../drizzle/client', import.meta.url)
  .pathname

test('write and read deviceInfo', async (t) => {
  const fastify = Fastify()
  const rootKey = KeyManager.generateRootKey()
  const manager = new MapeoManager({
    rootKey,
    projectMigrationsFolder,
    clientMigrationsFolder,
    dbFolder: ':memory:',
    coreStorage: () => new RAM(),
    fastify,
  })

  await manager.setDeviceInfo({ name: 'my device', deviceType: 'tablet' })
  t.alike(manager.getDeviceInfo(), {
    name: 'my device',
    deviceType: 'tablet',
    deviceId: manager.deviceId,
  })

  await manager.setDeviceInfo({ name: 'new name' })
  t.alike(manager.getDeviceInfo(), {
    name: 'new name',
    deviceId: manager.deviceId,
  })
})

test('device info written to projects', (t) => {
  t.test('when creating project', async (st) => {
    const fastify = Fastify()
    const manager = new MapeoManager({
      rootKey: KeyManager.generateRootKey(),
      projectMigrationsFolder,
      clientMigrationsFolder,
      dbFolder: ':memory:',
      coreStorage: () => new RAM(),
      fastify,
    })

    await manager.setDeviceInfo({ name: 'mapeo', deviceType: 'tablet' })

    const projectId = await manager.createProject()
    const project = await manager.getProject(projectId)

    const me = await project.$member.getById(project.deviceId)

    st.is(me.deviceId, project.deviceId)
    st.is(me.name, 'mapeo')
    st.is(me.deviceType, 'tablet')
  })

  t.test('when adding project', async (st) => {
    const fastify = Fastify()
    const manager = new MapeoManager({
      rootKey: KeyManager.generateRootKey(),
      projectMigrationsFolder,
      clientMigrationsFolder,
      dbFolder: ':memory:',
      coreStorage: () => new RAM(),
      fastify,
    })

    await manager.setDeviceInfo({ name: 'mapeo', deviceType: 'tablet' })

    const projectId = await manager.addProject(
      {
        projectKey: randomBytes(32),
        encryptionKeys: { auth: randomBytes(32) },
        projectName: 'Mapeo Project',
      },
      { waitForSync: false }
    )

    const project = await manager.getProject(projectId)

    const me = await project.$member.getById(project.deviceId)

    st.is(me.name, 'mapeo')
    st.is(me.deviceType, 'tablet')
  })

  t.test('after updating global device info', async (st) => {
    const fastify = Fastify()
    const manager = new MapeoManager({
      rootKey: KeyManager.generateRootKey(),
      projectMigrationsFolder,
      clientMigrationsFolder,
      dbFolder: ':memory:',
      coreStorage: () => new RAM(),
      fastify,
    })

    await manager.setDeviceInfo({ name: 'before', deviceType: 'tablet' })

    const projectIds = await Promise.all([
      manager.createProject(),
      manager.createProject(),
      manager.createProject(),
    ])

    const projects = await Promise.all(
      projectIds.map(async (projectId) => {
        const project = await manager.getProject(projectId)
        return project
      })
    )

    {
      const ownMemberInfos = await Promise.all(
        projects.map((p) => p.$member.getById(p.deviceId))
      )

      for (const info of ownMemberInfos) {
        st.is(info.name, 'before')
        st.is(info.deviceType, 'tablet')
      }
    }

    await manager.setDeviceInfo({ name: 'after', deviceType: 'desktop' })

    {
      const ownMemberInfos = await Promise.all(
        projects.map((p) => p.$member.getById(p.deviceId))
      )

      for (const info of ownMemberInfos) {
        st.is(info.name, 'after')
        st.is(info.deviceType, 'desktop')
      }
    }
  })

  // TODO: Test closing project, changing name, and getting project to see if device info for project is updated
})

test('device info sent to peers', async (t) => {
  const managers = await createManagers(3, t)
  const disconnectPeers = connectPeers(managers, { discovery: true })
  t.teardown(disconnectPeers)
  await waitForPeers(managers, { waitForDeviceInfo: true })

  const managerThatChangesName = managers[0]
  const otherManagers = managers.slice(1)

  /** @param {{ deviceId: string }} peer */
  const isChangedPeer = (peer) =>
    peer.deviceId === managerThatChangesName.deviceId

  const otherManagersReceivedNameChangePromise = Promise.all(
    otherManagers.map(async (manager) => {
      await pEvent(
        manager,
        'local-peers',
        (peers) => peers.find(isChangedPeer)?.name === 'new name'
      )

      const updatedLocalPeers = await manager.listLocalPeers()
      t.is(updatedLocalPeers.find(isChangedPeer)?.name, 'new name')
    })
  )

  await managerThatChangesName.setDeviceInfo({ name: 'new name' })

  await otherManagersReceivedNameChangePromise
})
