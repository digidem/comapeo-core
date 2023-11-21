import { test } from 'brittle'
import { KeyManager } from '@mapeo/crypto'
import pDefer from 'p-defer'
import RAM from 'random-access-memory'
import { MEMBER_ROLE_ID } from '../src/capabilities.js'
import { InviteResponse_Decision } from '../src/generated/rpc.js'
import { MapeoManager, kRPC } from '../src/mapeo-manager.js'
import { replicate } from '../tests/helpers/local-peers.js'

const projectMigrationsFolder = new URL('../drizzle/project', import.meta.url)
  .pathname
const clientMigrationsFolder = new URL('../drizzle/client', import.meta.url)
  .pathname

test('member invite accepted', async (t) => {
  t.plan(10)

  const deferred = pDefer()

  const creator = new MapeoManager({
    rootKey: KeyManager.generateRootKey(),
    projectMigrationsFolder,
    clientMigrationsFolder,
    dbFolder: ':memory:',
    coreStorage: () => new RAM(),
  })

  await creator.setDeviceInfo({ name: 'Creator' })

  const createdProjectId = await creator.createProject({ name: 'Mapeo' })
  const creatorProject = await creator.getProject(createdProjectId)
  creator[kRPC].on('peers', async (peers) => {
    t.is(peers.length, 1)

    const response = await creatorProject.$member.invite(peers[0].deviceId, {
      roleId: MEMBER_ROLE_ID,
    })

    t.is(response, InviteResponse_Decision.ACCEPT)

    deferred.resolve()
  })

  /** @type {string | undefined} */
  let expectedInvitorPeerId

  const joiner = new MapeoManager({
    rootKey: KeyManager.generateRootKey(),
    projectMigrationsFolder,
    clientMigrationsFolder,
    dbFolder: ':memory:',
    coreStorage: () => new RAM(),
  })

  await joiner.setDeviceInfo({ name: 'Joiner' })

  t.exception(
    async () => joiner.getProject(createdProjectId),
    'joiner cannot get project instance before being invited and added to project'
  )

  joiner[kRPC].on('peers', (peers) => {
    t.is(peers.length, 1)
    expectedInvitorPeerId = peers[0].deviceId
  })

  joiner.invite.on('invite-received', async (invite) => {
    t.is(invite.projectId, createdProjectId)
    t.is(invite.peerId, expectedInvitorPeerId)
    t.is(invite.projectName, 'Mapeo')
    // TODO: Check role being invited for (needs https://github.com/digidem/mapeo-core-next/issues/275)

    await joiner.invite.accept(invite.projectId)
  })

  replicate(creator[kRPC], joiner[kRPC])

  await deferred.promise

  /// After invite flow has completed...

  const joinerListedProjects = await joiner.listProjects()

  t.is(joinerListedProjects.length, 1, 'project added to joiner')
  t.alike(
    joinerListedProjects[0],
    {
      name: 'Mapeo',
      projectId: createdProjectId,
      createdAt: undefined,
      updatedAt: undefined,
    },
    'project info recorded in joiner successfully'
  )

  const joinerProject = await joiner.getProject(
    joinerListedProjects[0].projectId
  )

  t.ok(joinerProject, 'can create joiner project instance')

  // TODO: Get project settings of joiner and ensure they're similar to creator's project's settings
  // const joinerProjectSettings = await joinerProject.$getProjectSettings()
  // t.alike(joinerProjectSettings, { defaultPresets: undefined, name: 'Mapeo' })

  // TODO: Get members of creator project and assert info matches joiner
  // const creatorProjectMembers = await creatorProject.$member.getMany()
  // t.is(creatorProjectMembers.length, 1)
  // t.alike(creatorProjectMembers[0], await joiner.getDeviceInfo())
})

test('member invite rejected', async (t) => {
  t.plan(9)

  const deferred = pDefer()

  const creator = new MapeoManager({
    rootKey: KeyManager.generateRootKey(),
    projectMigrationsFolder,
    clientMigrationsFolder,
    dbFolder: ':memory:',
    coreStorage: () => new RAM(),
  })

  await creator.setDeviceInfo({ name: 'Creator' })

  const createdProjectId = await creator.createProject({ name: 'Mapeo' })
  const creatorProject = await creator.getProject(createdProjectId)

  creator[kRPC].on('peers', async (peers) => {
    t.is(peers.length, 1)

    const response = await creatorProject.$member.invite(peers[0].deviceId, {
      roleId: MEMBER_ROLE_ID,
    })

    t.is(response, InviteResponse_Decision.REJECT)

    deferred.resolve()
  })

  /** @type {string | undefined} */
  let expectedInvitorPeerId

  const joiner = new MapeoManager({
    rootKey: KeyManager.generateRootKey(),
    projectMigrationsFolder,
    clientMigrationsFolder,
    dbFolder: ':memory:',
    coreStorage: () => new RAM(),
  })

  await joiner.setDeviceInfo({ name: 'Joiner' })

  t.exception(
    async () => joiner.getProject(createdProjectId),
    'joiner cannot get project instance before being invited and added to project'
  )

  joiner[kRPC].on('peers', (peers) => {
    t.is(peers.length, 1)
    expectedInvitorPeerId = peers[0].deviceId
  })

  joiner.invite.on('invite-received', async (invite) => {
    t.is(invite.projectId, createdProjectId)
    t.is(invite.peerId, expectedInvitorPeerId)
    t.is(invite.projectName, 'Mapeo')
    // TODO: Check role being invited for (needs https://github.com/digidem/mapeo-core-next/issues/275)

    await joiner.invite.reject(invite.projectId)
  })

  replicate(creator[kRPC], joiner[kRPC])

  await deferred.promise

  /// After invite flow has completed...

  const joinerListedProjects = await joiner.listProjects()

  t.is(joinerListedProjects.length, 0, 'project not added to joiner')

  await t.exception(
    async () => joiner.getProject(createdProjectId),
    'joiner cannot get project instance'
  )

  // TODO: Get members of creator project and assert joiner not added
  // const creatorProjectMembers = await creatorProject.$member.getMany()
  // t.is(creatorProjectMembers.length, 0)
})
