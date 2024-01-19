import { test } from 'brittle'
import { randomBytes } from 'crypto'
import { KeyManager } from '@mapeo/crypto'
import RAM from 'random-access-memory'
import Fastify from 'fastify'

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

  const info1 = { name: 'my device' }
  await manager.setDeviceInfo(info1)
  const readInfo1 = await manager.getDeviceInfo()
  t.alike(readInfo1, info1)
  const info2 = { name: 'new name' }
  await manager.setDeviceInfo(info2)
  const readInfo2 = await manager.getDeviceInfo()
  t.alike(readInfo2, info2)
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

    await manager.setDeviceInfo({ name: 'mapeo' })

    const projectId = await manager.createProject()
    const project = await manager.getProject(projectId)

    const me = await project.$member.getById(project.deviceId)

    st.is(me.deviceId, project.deviceId)
    st.alike({ name: me.name }, { name: 'mapeo' })
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

    await manager.setDeviceInfo({ name: 'mapeo' })

    const projectId = await manager.addProject(
      {
        projectKey: randomBytes(32),
        encryptionKeys: { auth: randomBytes(32) },
      },
      { waitForSync: false }
    )

    const project = await manager.getProject(projectId)

    const me = await project.$member.getById(project.deviceId)

    st.alike({ name: me.name }, { name: 'mapeo' })
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

    await manager.setDeviceInfo({ name: 'before' })

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
        st.alike({ name: info.name }, { name: 'before' })
      }
    }

    await manager.setDeviceInfo({ name: 'after' })

    {
      const ownMemberInfos = await Promise.all(
        projects.map((p) => p.$member.getById(p.deviceId))
      )

      for (const info of ownMemberInfos) {
        st.alike({ name: info.name }, { name: 'after' })
      }
    }
  })

  // TODO: Test closing project, changing name, and getting project to see if device info for project is updated
})
